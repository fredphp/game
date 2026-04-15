package service

import (
        "bytes"
        "context"
        "encoding/json"
        "errors"
        "fmt"
        "log"
        "net/http"
        "time"

        "guild-service/internal/dao"
        "guild-service/internal/engine"
        "guild-service/internal/model"
        myredis "guild-service/pkg/redis"

        "github.com/redis/go-redis/v9"
)

var (
        ErrGuildNotFound   = errors.New("guild not found")
        ErrNameExists      = errors.New("guild name exists")
        ErrTagExists       = errors.New("guild tag exists")
        ErrNotLeader       = errors.New("not guild leader")
        ErrNotOfficer      = errors.New("not officer")
        ErrMemberFull      = errors.New("guild is full")
        ErrAlreadyInGuild  = errors.New("already in guild")
        ErrNotInGuild      = errors.New("not in guild")
        ErrKickLeader      = errors.New("cannot kick leader")
        ErrWarLimit        = errors.New("war limit reached")
        ErrWarCooldown     = errors.New("war cooldown")
        ErrInvalidRole     = errors.New("invalid role")
        ErrInsufficientGold = errors.New("insufficient gold")
)

const (
        cacheGuildPrefix   = "guild:info:"   // String: 联盟信息缓存
        cacheGuildTTL      = 10 * time.Minute
        cacheMemberPrefix  = "guild:member:"  // String: 成员信息缓存
        cacheMemberTTL     = 5 * time.Minute
        cacheWarPrefix     = "guild:war:"     // String: 战争信息缓存
        cacheWarTTL        = 30 * time.Second

        userServiceURL   = "http://user-service:9001"
        internalApiKey   = "internal-api-key-2024"
)

// GuildService 联盟业务逻辑
type GuildService struct {
        dao    *dao.GuildDAO
        engine *engine.WarEngine
}

func NewGuildService(dao *dao.GuildDAO, warEngine *engine.WarEngine) *GuildService {
        return &GuildService{dao: dao, engine: warEngine}
}

// ================================================================
// 联盟 CRUD
// ================================================================

// CreateGuild 创建联盟
func (s *GuildService) CreateGuild(ctx context.Context, userID int64, req *model.CreateGuildRequest) (*model.Guild, error) {
        // 扣除创建联盟所需的500金币
        if _, err := callUserInternal(ctx, "POST", "/internal/user/deduct-gold", map[string]interface{}{
                "user_id": userID,
                "amount":  500,
        }); err != nil {
                return nil, ErrInsufficientGold
        }

        guild := &model.Guild{
                Name:        req.Name,
                Tag:         req.Tag,
                Declaration: req.Declaration,
                LeaderID:    userID,
                MaxMembers:  30,
                MinJoinLevel: 10,
        }

        id, err := s.dao.CreateGuild(ctx, guild)
        if err != nil {
                if errors.Is(err, dao.ErrGuildNameExists) {
                        return nil, ErrNameExists
                }
                if errors.Is(err, dao.ErrGuildTagExists) {
                        return nil, ErrTagExists
                }
                return nil, err
        }
        guild.ID = id

        // 添加盟主为成员
        member := &model.GuildMember{
                GuildID:  id,
                UserID:   userID,
                Role:     model.RoleLeader,
                Nickname: req.Name,
                Power:    0,
        }
        if err := s.dao.AddMember(ctx, member); err != nil {
                return nil, err
        }

        // 记录日志
        s.createLog(ctx, id, userID, nil, "create", fmt.Sprintf("创建联盟 [%s](%s)", req.Name, req.Tag))

        return guild, nil
}

// GetGuild 获取联盟详情
func (s *GuildService) GetGuild(ctx context.Context, guildID int64) (*model.GuildDetail, error) {
        guild, err := s.dao.GetGuildByID(ctx, guildID)
        if err != nil {
                return nil, ErrGuildNotFound
        }

        members, _ := s.dao.ListGuildMembers(ctx, guildID)

        return &model.GuildDetail{
                Guild:   *guild,
                Members: members,
        }, nil
}

// ListGuilds 获取联盟列表
func (s *GuildService) ListGuilds(ctx context.Context, page, pageSize int, keyword string) ([]*model.Guild, int64, error) {
        if page <= 0 { page = 1 }
        if pageSize <= 0 || pageSize > 50 { pageSize = 20 }
        return s.dao.ListGuilds(ctx, page, pageSize, keyword)
}

// UpdateGuild 更新联盟
func (s *GuildService) UpdateGuild(ctx context.Context, guildID, userID int64, declaration, notice string, autoJoin bool, minJoinLevel int) error {
        member, err := s.dao.GetMember(ctx, guildID, userID)
        if err != nil {
                return ErrNotInGuild
        }
        if member.Role > model.RoleViceLeader {
                return ErrNotOfficer
        }

        guild, err := s.dao.GetGuildByID(ctx, guildID)
        if err != nil {
                return ErrGuildNotFound
        }

        guild.Declaration = declaration
        guild.Notice = notice
        guild.AutoJoin = autoJoin
        guild.MinJoinLevel = minJoinLevel

        return s.dao.UpdateGuild(ctx, guild)
}

// DisbandGuild 解散联盟
func (s *GuildService) DisbandGuild(ctx context.Context, guildID, userID int64) error {
        guild, err := s.dao.GetGuildByID(ctx, guildID)
        if err != nil {
                return ErrGuildNotFound
        }
        if guild.LeaderID != userID {
                return ErrNotLeader
        }

        // 移除所有成员
        members, _ := s.dao.ListGuildMembers(ctx, guildID)
        for _, m := range members {
                _ = s.dao.RemoveMember(ctx, guildID, m.UserID, 2, false)
        }

        return s.dao.DisbandGuild(ctx, guildID)
}

// ================================================================
// 成员管理
// ================================================================

// JoinGuild 加入联盟
func (s *GuildService) JoinGuild(ctx context.Context, userID int64, req *model.JoinGuildRequest) error {
        // 检查是否已在联盟中
        _, err := s.dao.GetActiveGuildByUser(ctx, userID)
        if err == nil {
                return ErrAlreadyInGuild
        }

        // 检查被踢冷却
        // TODO: 从缓存或数据库检查 kick_cooldown

        guild, err := s.dao.GetGuildByID(ctx, req.GuildID)
        if err != nil {
                return ErrGuildNotFound
        }

        if guild.AutoJoin {
                // 自动加入
                return s.doAddMember(ctx, guild, userID)
        }

        // 需要审批
        return s.dao.CreateApplication(ctx, &model.GuildApplication{
                GuildID: req.GuildID,
                UserID:  userID,
                Message: req.Message,
        })
}

// LeaveGuild 退出联盟
func (s *GuildService) LeaveGuild(ctx context.Context, userID int64) error {
        member, err := s.dao.GetActiveGuildByUser(ctx, userID)
        if err != nil {
                return ErrNotInGuild
        }

        guild, _ := s.dao.GetGuildByID(ctx, member.GuildID)
        if guild != nil && guild.LeaderID == userID {
                return fmt.Errorf("盟主不能直接退出，请先转让盟主或解散联盟")
        }

        if err := s.dao.RemoveMember(ctx, member.GuildID, userID, 2, false); err != nil {
                return err
        }

        s.createLog(ctx, member.GuildID, userID, nil, "leave", "退出联盟")
        return nil
}

// KickMember 踢出成员
func (s *GuildService) KickMember(ctx context.Context, guildID, operatorID, targetUserID int64) error {
        operator, err := s.dao.GetMember(ctx, guildID, operatorID)
        if err != nil {
                return ErrNotInGuild
        }
        if operator.Role > model.RoleViceLeader {
                return ErrNotOfficer
        }

        target, err := s.dao.GetMember(ctx, guildID, targetUserID)
        if err != nil {
                return dao.ErrMemberNotFound
        }
        if target.Role <= operator.Role {
                return fmt.Errorf("不能踢出同级或更高权限的成员")
        }

        if err := s.dao.RemoveMember(ctx, guildID, targetUserID, 3, true); err != nil {
                return err
        }

        s.createLog(ctx, guildID, operatorID, sqlNullInt64(targetUserID), "kick",
                fmt.Sprintf("踢出成员 %d", targetUserID))
        return nil
}

// PromoteMember 晋升成员
func (s *GuildService) PromoteMember(ctx context.Context, guildID, operatorID, targetUserID int64, newRole int8) error {
        if newRole < model.RoleLeader || newRole > model.RoleMember {
                return ErrInvalidRole
        }

        operator, err := s.dao.GetMember(ctx, guildID, operatorID)
        if err != nil {
                return ErrNotInGuild
        }

        // 只有盟主可以操作
        if operator.Role != model.RoleLeader {
                return ErrNotLeader
        }

        target, err := s.dao.GetMember(ctx, guildID, targetUserID)
        if err != nil {
                return dao.ErrMemberNotFound
        }

        action := "promote"
        if newRole < target.Role {
                action = "demote"
        }

        if err := s.dao.UpdateMemberRole(ctx, guildID, targetUserID, newRole); err != nil {
                return err
        }

        // 如果晋升为盟主，原盟主降为副盟主
        if newRole == model.RoleLeader {
                _ = s.dao.UpdateMemberRole(ctx, guildID, operatorID, model.RoleViceLeader)
                _ = s.dao.TransferLeadership(ctx, guildID, targetUserID)
        }

        s.createLog(ctx, guildID, operatorID, sqlNullInt64(targetUserID), action,
                fmt.Sprintf("成员 %d → %s", targetUserID, model.RoleName(newRole)))
        return nil
}

// ApproveApplication 审批申请
func (s *GuildService) ApproveApplication(ctx context.Context, appID, reviewerID int64, approve bool, note string) error {
        // 获取申请信息
        app, err := s.dao.GetApplicationByID(ctx, appID)
        if err != nil {
                return err
        }

        status := int8(model.ApplyRejected)
        if approve {
                status = model.ApplyApproved
        }

        err = s.dao.ReviewApplication(ctx, appID, status, reviewerID, note)
        if err != nil {
                return err
        }

        // 审批通过时，将用户加入联盟
        if approve {
                guild, err := s.dao.GetGuildByID(ctx, app.GuildID)
                if err != nil {
                        return err
                }
                if err := s.doAddMember(ctx, guild, app.UserID); err != nil {
                        log.Printf("❌ 审批通过但加成员失败: guild=%d user=%d err=%v", app.GuildID, app.UserID, err)
                        return err
                }
        }

        return nil
}

// ListPendingApplications 获取待审批申请
func (s *GuildService) ListPendingApplications(ctx context.Context, guildID int64) ([]*model.GuildApplication, error) {
        return s.dao.ListPendingApplications(ctx, guildID)
}

// ListMembers 获取成员列表
func (s *GuildService) ListMembers(ctx context.Context, guildID int64) ([]*model.GuildMember, error) {
        return s.dao.ListGuildMembers(ctx, guildID)
}

// GetMyGuild 获取我的联盟
func (s *GuildService) GetMyGuild(ctx context.Context, userID int64) (*model.GuildDetail, error) {
        member, err := s.dao.GetActiveGuildByUser(ctx, userID)
        if err != nil {
                return nil, ErrNotInGuild
        }

        return s.GetGuild(ctx, member.GuildID)
}

func (s *GuildService) doAddMember(ctx context.Context, guild *model.Guild, userID int64) error {
        if guild.MemberCount >= guild.MaxMembers {
                return ErrMemberFull
        }

        member := &model.GuildMember{
                GuildID: guild.ID,
                UserID:  userID,
                Role:    model.RoleMember,
                Power:   0,
        }
        if err := s.dao.AddMember(ctx, member); err != nil {
                return err
        }

        s.createLog(ctx, guild.ID, userID, nil, "join", "加入联盟")
        return nil
}

// ================================================================
// 联盟战争
// ================================================================

// DeclareWar 宣战
func (s *GuildService) DeclareWar(ctx context.Context, attackerGuildID, operatorID int64, req *model.DeclareWarRequest) (*model.GuildWar, error) {
        // 验证操作者权限
        member, err := s.dao.GetMember(ctx, attackerGuildID, operatorID)
        if err != nil {
                return nil, ErrNotInGuild
        }
        if member.Role > model.RoleViceLeader {
                return nil, ErrNotOfficer
        }

        // 验证战争上限
        activeCount, err := s.dao.CountActiveWars(ctx, attackerGuildID)
        if err != nil {
                return nil, err
        }
        if activeCount >= 3 {
                return nil, ErrWarLimit
        }

        // 验证目标联盟存在
        _, err = s.dao.GetGuildByID(ctx, req.TargetGuildID)
        if err != nil {
                return nil, ErrGuildNotFound
        }

        now := time.Now()
        startTime := now.Add(2 * time.Hour)  // 2小时准备
        endTime := startTime.Add(24 * time.Hour) // 24小时战斗

        war := &model.GuildWar{
                WarID:        generateWarID(),
                AttackerGuild: attackerGuildID,
                DefenderGuild: req.TargetGuildID,
                Status:       model.WarStatusPrepare,
                Phase:        model.WarPhaseDeclare,
                StartTime:    startTime,
                EndTime:      endTime,
        }
        if req.TargetCityID > 0 {
                war.TargetCityID.Valid = true
                war.TargetCityID.Int64 = req.TargetCityID
        }

        if err := s.dao.CreateWar(ctx, war); err != nil {
                return nil, err
        }

        s.createLog(ctx, attackerGuildID, operatorID, sqlNullInt64(req.TargetGuildID),
                "declare_war", fmt.Sprintf("对联盟 %d 宣战", req.TargetGuildID))

        return war, nil
}

// ListWars 获取战争列表
func (s *GuildService) ListWars(ctx context.Context, guildID int64, status int8, limit int) ([]*model.GuildWar, error) {
        return s.dao.ListGuildWars(ctx, guildID, status, limit)
}

// GetWar 获取战争详情
func (s *GuildService) GetWar(ctx context.Context, warID string) (*model.GuildWar, error) {
        return s.dao.GetWarByWarID(ctx, warID)
}

// SurrenderWar 投降
func (s *GuildService) SurrenderWar(ctx context.Context, warID string, guildID, userID int64) error {
        member, err := s.dao.GetMember(ctx, guildID, userID)
        if err != nil {
                return ErrNotInGuild
        }
        if member.Role > model.RoleViceLeader {
                return ErrNotOfficer
        }

        return s.engine.SurrenderWar(ctx, warID, guildID)
}

// ================================================================
// 协作战斗
// ================================================================

// InitiateCoopBattle 发起协作战斗
func (s *GuildService) InitiateCoopBattle(ctx context.Context, req *model.CoopBattleRequest,
        attackerGuild, userID int64) (*model.WarBattle, error) {

        // 获取战争信息
        war, err := s.dao.GetWarByWarID(ctx, req.WarID)
        if err != nil {
                return nil, fmt.Errorf("war not found: %w", err)
        }

        defenderGuild := int64(0)
        if war.AttackerGuild == attackerGuild {
                defenderGuild = war.DefenderGuild
        } else {
                defenderGuild = war.AttackerGuild
        }

        return s.engine.InitiateCoopBattle(ctx, req.WarID, req.CityID,
                attackerGuild, defenderGuild, userID, req.ArmyPower)
}

// JoinCoopBattle 加入协作战斗
func (s *GuildService) JoinCoopBattle(ctx context.Context, req *model.JoinCoopRequest, userID int64) (*model.WarBattle, error) {
        return s.engine.JoinCoopBattle(ctx, req.BattleID, userID, req.ArmyPower)
}

// ForceStartBattle 强制开始战斗
func (s *GuildService) ForceStartBattle(ctx context.Context, battleID string, userID int64) error {
        return s.engine.ExecuteCoopBattle(ctx, battleID)
}

// ================================================================
// 联盟日志
// ================================================================

// ListLogs 获取联盟日志
func (s *GuildService) ListLogs(ctx context.Context, guildID int64, limit int) ([]*model.GuildLog, error) {
        return s.dao.ListGuildLogs(ctx, guildID, limit)
}

func (s *GuildService) createLog(ctx context.Context, guildID, userID int64, targetID *int64, action, detail string) {
        log := &model.GuildLog{
                GuildID: guildID,
                UserID:  userID,
                Action:  action,
                Detail:  detail,
        }
        if targetID != nil {
                log.TargetID.Valid = true
                log.TargetID.Int64 = *targetID
        }
        go func() {
                bgCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
                defer cancel()
                _ = s.dao.CreateLog(bgCtx, log)
        }()
}

func sqlNullInt64(v int64) *int64 {
        return &v
}

func generateWarID() string {
        return fmt.Sprintf("WAR-%d", time.Now().UnixNano())
}

var _ = redis.Nil

// callUserInternal 调用 user-service 内部 API
func callUserInternal(ctx context.Context, method, path string, body interface{}) (map[string]interface{}, error) {
        data, _ := json.Marshal(body)
        req, err := http.NewRequestWithContext(ctx, method, userServiceURL+path, bytes.NewReader(data))
        if err != nil {
                return nil, err
        }
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("X-Internal-Api-Key", internalApiKey)
        client := &http.Client{Timeout: 5 * time.Second}
        resp, err := client.Do(req)
        if err != nil {
                return nil, err
        }
        defer resp.Body.Close()
        var result map[string]interface{}
        json.NewDecoder(resp.Body).Decode(&result)
        return result, nil
}
