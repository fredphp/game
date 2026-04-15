package dao

import (
        "context"
        "database/sql"
        "encoding/json"
        "errors"
        "fmt"
        "strings"

        "guild-service/internal/model"
)

var (
        ErrGuildNotFound     = errors.New("guild not found")
        ErrGuildNameExists   = errors.New("guild name already exists")
        ErrGuildTagExists    = errors.New("guild tag already exists")
        ErrMemberNotFound    = errors.New("member not found")
        ErrAlreadyInGuild    = errors.New("already in guild")
        ErrNotInGuild        = errors.New("not in guild")
        ErrWarNotFound       = errors.New("war not found")
        ErrBattleNotFound    = errors.New("battle not found")
        ErrApplyNotFound     = errors.New("application not found")
        ErrTechNotFound      = errors.New("tech not found")
)

// GuildDAO 联盟数据访问层
type GuildDAO struct {
        db *sql.DB
}

func NewGuildDAO(db *sql.DB) *GuildDAO {
        return &GuildDAO{db: db}
}

// ================================================================
// 联盟 CRUD
// ================================================================

// CreateGuild 创建联盟
func (d *GuildDAO) CreateGuild(ctx context.Context, g *model.Guild) (int64, error) {
        result, err := d.db.ExecContext(ctx,
                `INSERT INTO guilds
                    (name, tag, declaration, leader_id, level, exp,
                     member_count, max_members, total_power, city_count,
                     notice, language, auto_join, min_join_level, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 1, ?, 0, 0, ?, 'zh', 0, ?, 1, NOW())`,
                g.Name, g.Tag, g.Declaration, g.LeaderID, g.Level, g.Exp,
                g.MaxMembers, g.Notice, g.MinJoinLevel)
        if err != nil {
                if strings.Contains(err.Error(), "Duplicate entry") && strings.Contains(err.Error(), "uk_name") {
                        return 0, ErrGuildNameExists
                }
                if strings.Contains(err.Error(), "Duplicate entry") && strings.Contains(err.Error(), "uk_tag") {
                        return 0, ErrGuildTagExists
                }
                return 0, fmt.Errorf("create guild: %w", err)
        }
        return result.LastInsertId()
}

// GetGuildByID 获取联盟
func (d *GuildDAO) GetGuildByID(ctx context.Context, id int64) (*model.Guild, error) {
        g := &model.Guild{}
        err := d.db.QueryRowContext(ctx,
                `SELECT id, name, tag, declaration, leader_id, level, exp,
                        member_count, max_members, total_power, city_count,
                        notice, language, auto_join, min_join_level, status,
                        created_at, disbanded_at
                 FROM guilds WHERE id = ? AND status = 1`, id,
        ).Scan(&g.ID, &g.Name, &g.Tag, &g.Declaration, &g.LeaderID,
                &g.Level, &g.Exp, &g.MemberCount, &g.MaxMembers,
                &g.TotalPower, &g.CityCount, &g.Notice, &g.Language,
                &g.AutoJoin, &g.MinJoinLevel, &g.Status,
                &g.CreatedAt, &g.DisbandedAt)
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, ErrGuildNotFound
                }
                return nil, fmt.Errorf("get guild: %w", err)
        }
        return g, nil
}

// GetGuildByName 按名称获取联盟
func (d *GuildDAO) GetGuildByName(ctx context.Context, name string) (*model.Guild, error) {
        g := &model.Guild{}
        err := d.db.QueryRowContext(ctx,
                `SELECT id, name, tag, declaration, leader_id, level, exp,
                        member_count, max_members, total_power, city_count,
                        notice, language, auto_join, min_join_level, status,
                        created_at, disbanded_at
                 FROM guilds WHERE name = ? AND status = 1`, name,
        ).Scan(&g.ID, &g.Name, &g.Tag, &g.Declaration, &g.LeaderID,
                &g.Level, &g.Exp, &g.MemberCount, &g.MaxMembers,
                &g.TotalPower, &g.CityCount, &g.Notice, &g.Language,
                &g.AutoJoin, &g.MinJoinLevel, &g.Status,
                &g.CreatedAt, &g.DisbandedAt)
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, ErrGuildNotFound
                }
                return nil, fmt.Errorf("get guild by name: %w", err)
        }
        return g, nil
}

// ListGuilds 获取联盟列表（分页）
func (d *GuildDAO) ListGuilds(ctx context.Context, page, pageSize int, keyword string) ([]*model.Guild, int64, error) {
        where := "WHERE status = 1"
        args := []interface{}{}
        if keyword != "" {
                where += " AND (name LIKE ? OR tag LIKE ?)"
                args = append(args, "%"+keyword+"%", "%"+keyword+"%")
        }

        var total int64
        countQuery := fmt.Sprintf(`SELECT COUNT(1) FROM guilds %s`, where)
        if err := d.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
                return nil, 0, fmt.Errorf("count guilds: %w", err)
        }

        offset := (page - 1) * pageSize
        listQuery := fmt.Sprintf(
                `SELECT id, name, tag, declaration, leader_id, level, exp,
                        member_count, max_members, total_power, city_count,
                        notice, language, auto_join, min_join_level, status,
                        created_at, disbanded_at
                 FROM guilds %s ORDER BY total_power DESC LIMIT ? OFFSET ?`, where)
        listArgs := append(args, pageSize, offset)

        rows, err := d.db.QueryContext(ctx, listQuery, listArgs...)
        if err != nil {
                return nil, 0, fmt.Errorf("list guilds: %w", err)
        }
        defer rows.Close()

        guilds := make([]*model.Guild, 0)
        for rows.Next() {
                g := &model.Guild{}
                err := rows.Scan(&g.ID, &g.Name, &g.Tag, &g.Declaration, &g.LeaderID,
                        &g.Level, &g.Exp, &g.MemberCount, &g.MaxMembers,
                        &g.TotalPower, &g.CityCount, &g.Notice, &g.Language,
                        &g.AutoJoin, &g.MinJoinLevel, &g.Status,
                        &g.CreatedAt, &g.DisbandedAt)
                if err != nil {
                        return nil, 0, fmt.Errorf("scan guild: %w", err)
                }
                guilds = append(guilds, g)
        }
        return guilds, total, nil
}

// UpdateGuild 更新联盟基本信息
func (d *GuildDAO) UpdateGuild(ctx context.Context, g *model.Guild) error {
        _, err := d.db.ExecContext(ctx,
                `UPDATE guilds SET declaration = ?, notice = ?, auto_join = ?,
                 min_join_level = ?, level = ?, exp = ?, max_members = ?,
                 total_power = ?, city_count = ?, member_count = ?
                 WHERE id = ? AND status = 1`,
                g.Declaration, g.Notice, g.AutoJoin, g.MinJoinLevel,
                g.Level, g.Exp, g.MaxMembers, g.TotalPower, g.CityCount,
                g.MemberCount, g.ID)
        if err != nil {
                return fmt.Errorf("update guild: %w", err)
        }
        return nil
}

// DisbandGuild 解散联盟
func (d *GuildDAO) DisbandGuild(ctx context.Context, guildID int64) error {
        _, err := d.db.ExecContext(ctx,
                `UPDATE guilds SET status = 3, disbanded_at = NOW() WHERE id = ? AND status = 1`,
                guildID)
        if err != nil {
                return fmt.Errorf("disband guild: %w", err)
        }
        return nil
}

// TransferLeadership 转让盟主
func (d *GuildDAO) TransferLeadership(ctx context.Context, guildID, newLeaderID int64) error {
        _, err := d.db.ExecContext(ctx,
                `UPDATE guilds SET leader_id = ? WHERE id = ? AND status = 1`,
                newLeaderID, guildID)
        if err != nil {
                return fmt.Errorf("transfer leadership: %w", err)
        }
        return nil
}

// ================================================================
// 联盟成员
// ================================================================

// AddMember 添加成员
func (d *GuildDAO) AddMember(ctx context.Context, m *model.GuildMember) error {
        _, err := d.db.ExecContext(ctx,
                `INSERT INTO guild_members
                    (guild_id, user_id, role, nickname, power, contribution,
                     total_donate, week_donate, join_time, last_active, status)
                 VALUES (?, ?, ?, ?, ?, 0, 0, 0, NOW(), NOW(), 1)`,
                m.GuildID, m.UserID, m.Role, m.Nickname, m.Power)
        if err != nil {
                if strings.Contains(err.Error(), "Duplicate entry") {
                        return ErrAlreadyInGuild
                }
                return fmt.Errorf("add member: %w", err)
        }

        // 增加成员计数
        _, _ = d.db.ExecContext(ctx,
                `UPDATE guilds SET member_count = member_count + 1 WHERE id = ?`, m.GuildID)
        // 增加联盟总战力
        _, _ = d.db.ExecContext(ctx,
                `UPDATE guilds SET total_power = total_power + ? WHERE id = ?`, m.Power, m.GuildID)
        return nil
}

// GetMember 获取成员
func (d *GuildDAO) GetMember(ctx context.Context, guildID, userID int64) (*model.GuildMember, error) {
        m := &model.GuildMember{}
        err := d.db.QueryRowContext(ctx,
                `SELECT id, guild_id, user_id, role, nickname, power,
                        contribution, total_donate, week_donate,
                        join_time, last_active, kick_cooldown, status
                 FROM guild_members WHERE guild_id = ? AND user_id = ? AND status = 1`,
                guildID, userID,
        ).Scan(&m.ID, &m.GuildID, &m.UserID, &m.Role, &m.Nickname,
                &m.Power, &m.Contribution, &m.TotalDonate, &m.WeekDonate,
                &m.JoinTime, &m.LastActive, &m.KickCooldown, &m.Status)
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, ErrMemberNotFound
                }
                return nil, fmt.Errorf("get member: %w", err)
        }
        return m, nil
}

// GetActiveGuildByUser 获取用户当前所在联盟
func (d *GuildDAO) GetActiveGuildByUser(ctx context.Context, userID int64) (*model.GuildMember, error) {
        m := &model.GuildMember{}
        err := d.db.QueryRowContext(ctx,
                `SELECT id, guild_id, user_id, role, nickname, power,
                        contribution, total_donate, week_donate,
                        join_time, last_active, kick_cooldown, status
                 FROM guild_members WHERE user_id = ? AND status = 1 LIMIT 1`, userID,
        ).Scan(&m.ID, &m.GuildID, &m.UserID, &m.Role, &m.Nickname,
                &m.Power, &m.Contribution, &m.TotalDonate, &m.WeekDonate,
                &m.JoinTime, &m.LastActive, &m.KickCooldown, &m.Status)
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, ErrNotInGuild
                }
                return nil, fmt.Errorf("get user guild: %w", err)
        }
        return m, nil
}

// ListGuildMembers 获取联盟成员列表
func (d *GuildDAO) ListGuildMembers(ctx context.Context, guildID int64) ([]*model.GuildMember, error) {
        rows, err := d.db.QueryContext(ctx,
                `SELECT id, guild_id, user_id, role, nickname, power,
                        contribution, total_donate, week_donate,
                        join_time, last_active, kick_cooldown, status
                 FROM guild_members WHERE guild_id = ? AND status = 1
                 ORDER BY role ASC, contribution DESC`, guildID)
        if err != nil {
                return nil, fmt.Errorf("list members: %w", err)
        }
        defer rows.Close()

        members := make([]*model.GuildMember, 0)
        for rows.Next() {
                m := &model.GuildMember{}
                err := rows.Scan(&m.ID, &m.GuildID, &m.UserID, &m.Role, &m.Nickname,
                        &m.Power, &m.Contribution, &m.TotalDonate, &m.WeekDonate,
                        &m.JoinTime, &m.LastActive, &m.KickCooldown, &m.Status)
                if err != nil {
                        return nil, fmt.Errorf("scan member: %w", err)
                }
                members = append(members, m)
        }
        return members, nil
}

// UpdateMemberRole 更新成员角色
func (d *GuildDAO) UpdateMemberRole(ctx context.Context, guildID, userID int64, role int8) error {
        _, err := d.db.ExecContext(ctx,
                `UPDATE guild_members SET role = ? WHERE guild_id = ? AND user_id = ? AND status = 1`,
                role, guildID, userID)
        if err != nil {
                return fmt.Errorf("update member role: %w", err)
        }
        return nil
}

// RemoveMember 移除成员（退出/踢出）
func (d *GuildDAO) RemoveMember(ctx context.Context, guildID, userID int64, setStatus int8, kickCooldown bool) error {
        if kickCooldown {
                _, err := d.db.ExecContext(ctx,
                        `UPDATE guild_members SET status = ?, kick_cooldown = DATE_ADD(NOW(), INTERVAL 2 HOUR)
                         WHERE guild_id = ? AND user_id = ? AND status = 1`, setStatus, guildID, userID)
                if err != nil {
                        return fmt.Errorf("remove member: %w", err)
                }
        } else {
                _, err := d.db.ExecContext(ctx,
                        `UPDATE guild_members SET status = ? WHERE guild_id = ? AND user_id = ? AND status = 1`,
                        setStatus, guildID, userID)
                if err != nil {
                        return fmt.Errorf("remove member: %w", err)
                }
        }
        // 减少成员计数
        _, _ = d.db.ExecContext(ctx,
                `UPDATE guilds SET member_count = GREATEST(member_count - 1, 0) WHERE id = ?`, guildID)
        return nil
}

// UpdateContribution 更新贡献值
func (d *GuildDAO) UpdateContribution(ctx context.Context, guildID, userID int64, amount int64) error {
        _, err := d.db.ExecContext(ctx,
                `UPDATE guild_members SET contribution = contribution + ?,
                 total_donate = total_donate + ?,
                 week_donate = week_donate + ?,
                 last_active = NOW()
                 WHERE guild_id = ? AND user_id = ? AND status = 1`,
                amount, amount, int(amount), guildID, userID)
        if err != nil {
                return fmt.Errorf("update contribution: %w", err)
        }

        // 增加联盟经验
        _, _ = d.db.ExecContext(ctx,
                `UPDATE guilds SET exp = exp + ? WHERE id = ?`, amount/10, guildID)
        return nil
}

// UpdateMemberPower 更新成员战力
func (d *GuildDAO) UpdateMemberPower(ctx context.Context, guildID, userID int64, power int) error {
        oldMember, err := d.GetMember(ctx, guildID, userID)
        if err != nil {
                return err
        }
        diff := power - oldMember.Power
        _, err = d.db.ExecContext(ctx,
                `UPDATE guild_members SET power = ?, last_active = NOW()
                 WHERE guild_id = ? AND user_id = ? AND status = 1`,
                power, guildID, userID)
        if err != nil {
                return fmt.Errorf("update member power: %w", err)
        }
        // 更新联盟总战力
        _, _ = d.db.ExecContext(ctx,
                `UPDATE guilds SET total_power = total_power + ? WHERE id = ?`, diff, guildID)
        return nil
}

// ================================================================
// 入盟申请
// ================================================================

// CreateApplication 创建入盟申请
func (d *GuildDAO) CreateApplication(ctx context.Context, a *model.GuildApplication) error {
        _, err := d.db.ExecContext(ctx,
                `INSERT INTO guild_applications (guild_id, user_id, message, status, created_at)
                 VALUES (?, ?, ?, 0, NOW())`, a.GuildID, a.UserID, a.Message)
        if err != nil {
                return fmt.Errorf("create application: %w", err)
        }
        return nil
}

// ListPendingApplications 获取待审批申请
func (d *GuildDAO) ListPendingApplications(ctx context.Context, guildID int64) ([]*model.GuildApplication, error) {
        rows, err := d.db.QueryContext(ctx,
                `SELECT id, guild_id, user_id, message, status, reviewer_id,
                        review_time, review_note, created_at
                 FROM guild_applications WHERE guild_id = ? AND status = 0
                 ORDER BY created_at ASC`, guildID)
        if err != nil {
                return nil, fmt.Errorf("list applications: %w", err)
        }
        defer rows.Close()

        apps := make([]*model.GuildApplication, 0)
        for rows.Next() {
                a := &model.GuildApplication{}
                err := rows.Scan(&a.ID, &a.GuildID, &a.UserID, &a.Message, &a.Status,
                        &a.ReviewerID, &a.ReviewTime, &a.ReviewNote, &a.CreatedAt)
                if err != nil {
                        return nil, fmt.Errorf("scan application: %w", err)
                }
                apps = append(apps, a)
        }
        return apps, nil
}

// GetApplicationByID 获取申请详情
func (d *GuildDAO) GetApplicationByID(ctx context.Context, appID int64) (*model.GuildApplication, error) {
        a := &model.GuildApplication{}
        err := d.db.QueryRowContext(ctx,
                `SELECT id, guild_id, user_id, message, status, reviewer_id,
                        review_time, review_note, created_at
                 FROM guild_applications WHERE id = ?`, appID,
        ).Scan(&a.ID, &a.GuildID, &a.UserID, &a.Message, &a.Status,
                &a.ReviewerID, &a.ReviewTime, &a.ReviewNote, &a.CreatedAt)
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, ErrApplyNotFound
                }
                return nil, fmt.Errorf("get application by id: %w", err)
        }
        return a, nil
}

// ReviewApplication 审批申请
func (d *GuildDAO) ReviewApplication(ctx context.Context, appID int64, status int8, reviewerID int64, note string) error {
        _, err := d.db.ExecContext(ctx,
                `UPDATE guild_applications SET status = ?, reviewer_id = ?,
                 review_time = NOW(), review_note = ?
                 WHERE id = ? AND status = 0`, status, reviewerID, note, appID)
        if err != nil {
                return fmt.Errorf("review application: %w", err)
        }
        return nil
}

// ================================================================
// 联盟战争
// ================================================================

// CreateWar 创建战争
func (d *GuildDAO) CreateWar(ctx context.Context, w *model.GuildWar) error {
        _, err := d.db.ExecContext(ctx,
                `INSERT INTO guild_wars
                    (war_id, attacker_guild, defender_guild, target_city_id,
                     status, phase, declare_time, start_time, end_time, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, NOW())`,
                w.WarID, w.AttackerGuild, w.DefenderGuild, w.TargetCityID,
                w.Status, w.Phase, w.StartTime, w.EndTime)
        if err != nil {
                return fmt.Errorf("create war: %w", err)
        }
        return nil
}

// GetWarByWarID 获取战争
func (d *GuildDAO) GetWarByWarID(ctx context.Context, warID string) (*model.GuildWar, error) {
        w := &model.GuildWar{}
        err := d.db.QueryRowContext(ctx,
                `SELECT id, war_id, attacker_guild, defender_guild, target_city_id,
                        status, phase, declare_time, start_time, end_time,
                        attacker_score, defender_score, attacker_deaths, defender_deaths,
                        cities_changed, winner, surrender_guild, war_config, result_detail, created_at
                 FROM guild_wars WHERE war_id = ?`, warID,
        ).Scan(&w.ID, &w.WarID, &w.AttackerGuild, &w.DefenderGuild, &w.TargetCityID,
                &w.Status, &w.Phase, &w.DeclareTime, &w.StartTime, &w.EndTime,
                &w.AttackerScore, &w.DefenderScore, &w.AttackerDeaths, &w.DefenderDeaths,
                &w.CitiesChanged, &w.Winner, &w.SurrenderGuild,
                &w.WarConfig, &w.ResultDetail, &w.CreatedAt)
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, ErrWarNotFound
                }
                return nil, fmt.Errorf("get war: %w", err)
        }
        return w, nil
}

// ListGuildWars 获取联盟相关战争
func (d *GuildDAO) ListGuildWars(ctx context.Context, guildID int64, status int8, limit int) ([]*model.GuildWar, error) {
        query := `SELECT id, war_id, attacker_guild, defender_guild, target_city_id,
                        status, phase, declare_time, start_time, end_time,
                        attacker_score, defender_score, attacker_deaths, defender_deaths,
                        cities_changed, winner, surrender_guild, war_config, result_detail, created_at
                 FROM guild_wars WHERE (attacker_guild = ? OR defender_guild = ?)`
        args := []interface{}{guildID, guildID}

        if status >= 0 {
                query += " AND status = ?"
                args = append(args, status)
        }
        query += " ORDER BY created_at DESC LIMIT ?"
        args = append(args, limit)

        rows, err := d.db.QueryContext(ctx, query, args...)
        if err != nil {
                return nil, fmt.Errorf("list wars: %w", err)
        }
        defer rows.Close()

        return d.scanWars(rows)
}

// ListActiveWars 获取所有活跃战争
func (d *GuildDAO) ListActiveWars(ctx context.Context) ([]*model.GuildWar, error) {
        rows, err := d.db.QueryContext(ctx,
                `SELECT id, war_id, attacker_guild, defender_guild, target_city_id,
                        status, phase, declare_time, start_time, end_time,
                        attacker_score, defender_score, attacker_deaths, defender_deaths,
                        cities_changed, winner, surrender_guild, war_config, result_detail, created_at
                 FROM guild_wars WHERE status IN (0, 1) ORDER BY end_time ASC`)
        if err != nil {
                return nil, fmt.Errorf("list active wars: %w", err)
        }
        defer rows.Close()

        return d.scanWars(rows)
}

// CountActiveWars 统计联盟活跃战争数
func (d *GuildDAO) CountActiveWars(ctx context.Context, guildID int64) (int, error) {
        var count int
        err := d.db.QueryRowContext(ctx,
                `SELECT COUNT(1) FROM guild_wars
                 WHERE (attacker_guild = ? OR defender_guild = ?) AND status IN (0, 1)`,
                guildID, guildID).Scan(&count)
        return count, err
}

// UpdateWarStatus 更新战争状态
func (d *GuildDAO) UpdateWarStatus(ctx context.Context, warID string, status, phase int8, resultDetail json.RawMessage) error {
        if resultDetail != nil {
                _, err := d.db.ExecContext(ctx,
                        `UPDATE guild_wars SET status = ?, phase = ?, result_detail = ?
                         WHERE war_id = ?`, status, phase, resultDetail, warID)
                return err
        }
        _, err := d.db.ExecContext(ctx,
                `UPDATE guild_wars SET status = ?, phase = ? WHERE war_id = ?`,
                status, phase, warID)
        return err
}

// UpdateWarScore 更新战争得分
func (d *GuildDAO) UpdateWarScore(ctx context.Context, warID string, isAttacker bool, score int) error {
        if isAttacker {
                _, err := d.db.ExecContext(ctx,
                        `UPDATE guild_wars SET attacker_score = attacker_score + ? WHERE war_id = ?`, score, warID)
                return err
        }
        _, err := d.db.ExecContext(ctx,
                `UPDATE guild_wars SET defender_score = defender_score + ? WHERE war_id = ?`, score, warID)
        return err
}

func (d *GuildDAO) scanWars(rows *sql.Rows) ([]*model.GuildWar, error) {
        wars := make([]*model.GuildWar, 0)
        for rows.Next() {
                w := &model.GuildWar{}
                err := rows.Scan(&w.ID, &w.WarID, &w.AttackerGuild, &w.DefenderGuild, &w.TargetCityID,
                        &w.Status, &w.Phase, &w.DeclareTime, &w.StartTime, &w.EndTime,
                        &w.AttackerScore, &w.DefenderScore, &w.AttackerDeaths, &w.DefenderDeaths,
                        &w.CitiesChanged, &w.Winner, &w.SurrenderGuild,
                        &w.WarConfig, &w.ResultDetail, &w.CreatedAt)
                if err != nil {
                        return nil, fmt.Errorf("scan war: %w", err)
                }
                wars = append(wars, w)
        }
        return wars, nil
}

// ================================================================
// 协作战斗
// ================================================================

// CreateBattle 创建协作战斗
func (d *GuildDAO) CreateBattle(ctx context.Context, b *model.WarBattle) error {
        _, err := d.db.ExecContext(ctx,
                `INSERT INTO guild_war_battles
                    (battle_id, war_id, city_id, attacker_guild, defender_guild,
                     leader_id, contributors, total_army, coop_bonus,
                     defender_power, city_defense, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
                b.BattleID, b.WarID, b.CityID, b.AttackerGuild, b.DefenderGuild,
                b.LeaderID, b.Contributors, b.TotalArmy, b.CoopBonus,
                b.DefenderPower, b.CityDefense)
        if err != nil {
                return fmt.Errorf("create battle: %w", err)
        }
        return nil
}

// GetBattleByBattleID 获取协作战斗
func (d *GuildDAO) GetBattleByBattleID(ctx context.Context, battleID string) (*model.WarBattle, error) {
        b := &model.WarBattle{}
        err := d.db.QueryRowContext(ctx,
                `SELECT id, battle_id, war_id, city_id, attacker_guild, defender_guild,
                        leader_id, contributors, total_army, coop_bonus,
                        defender_power, city_defense, attacker_win,
                        damage_dealt, damage_taken, loot, result_detail,
                        status, start_time, end_time, created_at
                 FROM guild_war_battles WHERE battle_id = ?`, battleID,
        ).Scan(&b.ID, &b.BattleID, &b.WarID, &b.CityID,
                &b.AttackerGuild, &b.DefenderGuild, &b.LeaderID,
                &b.Contributors, &b.TotalArmy, &b.CoopBonus,
                &b.DefenderPower, &b.CityDefense, &b.AttackerWin,
                &b.DamageDealt, &b.DamageTaken, &b.Loot, &b.ResultDetail,
                &b.Status, &b.StartTime, &b.EndTime, &b.CreatedAt)
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, ErrBattleNotFound
                }
                return nil, fmt.Errorf("get battle: %w", err)
        }
        return b, nil
}

// ListGatheringBattles 获取组队中的战斗
func (d *GuildDAO) ListGatheringBattles(ctx context.Context, warID string) ([]*model.WarBattle, error) {
        rows, err := d.db.QueryContext(ctx,
                `SELECT id, battle_id, war_id, city_id, attacker_guild, defender_guild,
                        leader_id, contributors, total_army, coop_bonus,
                        defender_power, city_defense, attacker_win,
                        damage_dealt, damage_taken, loot, result_detail,
                        status, start_time, end_time, created_at
                 FROM guild_war_battles WHERE war_id = ? AND status = 0
                 ORDER BY created_at ASC`, warID)
        if err != nil {
                return nil, fmt.Errorf("list gathering battles: %w", err)
        }
        defer rows.Close()

        battles := make([]*model.WarBattle, 0)
        for rows.Next() {
                b := &model.WarBattle{}
                err := rows.Scan(&b.ID, &b.BattleID, &b.WarID, &b.CityID,
                        &b.AttackerGuild, &b.DefenderGuild, &b.LeaderID,
                        &b.Contributors, &b.TotalArmy, &b.CoopBonus,
                        &b.DefenderPower, &b.CityDefense, &b.AttackerWin,
                        &b.DamageDealt, &b.DamageTaken, &b.Loot, &b.ResultDetail,
                        &b.Status, &b.StartTime, &b.EndTime, &b.CreatedAt)
                if err != nil {
                        return nil, fmt.Errorf("scan battle: %w", err)
                }
                battles = append(battles, b)
        }
        return battles, nil
}

// UpdateBattleResult 更新战斗结果
func (d *GuildDAO) UpdateBattleResult(ctx context.Context, battleID string, status int8, win bool, damageDealt, damageTaken int, resultDetail json.RawMessage) error {
        _, err := d.db.ExecContext(ctx,
                `UPDATE guild_war_battles
                 SET status = ?, attacker_win = ?, damage_dealt = ?, damage_taken = ?,
                     result_detail = ?, start_time = NOW(), end_time = NOW()
                 WHERE battle_id = ? AND status IN (0, 1)`,
                status, win, damageDealt, damageTaken, resultDetail, battleID)
        if err != nil {
                return fmt.Errorf("update battle result: %w", err)
        }
        return nil
}

// ================================================================
// 联盟日志
// ================================================================

// CreateLog 创建日志
func (d *GuildDAO) CreateLog(ctx context.Context, log *model.GuildLog) error {
        _, err := d.db.ExecContext(ctx,
                `INSERT INTO guild_log (guild_id, user_id, target_id, action, detail, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                log.GuildID, log.UserID, log.TargetID, log.Action, log.Detail)
        if err != nil {
                return fmt.Errorf("create log: %w", err)
        }
        return nil
}

// ListGuildLogs 获取联盟日志
func (d *GuildDAO) ListGuildLogs(ctx context.Context, guildID int64, limit int) ([]*model.GuildLog, error) {
        rows, err := d.db.QueryContext(ctx,
                `SELECT id, guild_id, user_id, target_id, action, detail, created_at
                 FROM guild_log WHERE guild_id = ? ORDER BY created_at DESC LIMIT ?`,
                guildID, limit)
        if err != nil {
                return nil, fmt.Errorf("list logs: %w", err)
        }
        defer rows.Close()

        logs := make([]*model.GuildLog, 0)
        for rows.Next() {
                l := &model.GuildLog{}
                err := rows.Scan(&l.ID, &l.GuildID, &l.UserID, &l.TargetID,
                        &l.Action, &l.Detail, &l.CreatedAt)
                if err != nil {
                        return nil, fmt.Errorf("scan log: %w", err)
                }
                logs = append(logs, l)
        }
        return logs, nil
}

// UpdateBattleContributorsRaw 原始更新协作战斗参与者
func (d *GuildDAO) UpdateBattleContributorsRaw(ctx context.Context, battleID string,
        contributors json.RawMessage, totalArmy int, coopBonus float64) error {
        _, err := d.db.ExecContext(ctx,
                `UPDATE guild_war_battles
                 SET contributors = ?, total_army = ?, coop_bonus = ?
                 WHERE battle_id = ? AND status = 0`,
                contributors, totalArmy, coopBonus, battleID)
        return err
}

// ensure imports
var _ = json.Marshal
