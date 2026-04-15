package service

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"season-service/internal/dao"
	"season-service/internal/model"
)

var (
	ErrSeasonNotFound = fmt.Errorf("赛季不存在")
	ErrSeasonBusy     = fmt.Errorf("赛季正在结算中")
	ErrSeasonInvalid  = fmt.Errorf("赛季状态无效")
)

// SeasonService 赛季业务逻辑层
type SeasonService struct {
	seasonDAO *dao.SeasonDAO
}

// NewSeasonService 创建 SeasonService
func NewSeasonService(seasonDAO *dao.SeasonDAO) *SeasonService {
	return &SeasonService{seasonDAO: seasonDAO}
}

// ================================================================
// 赛季管理
// ================================================================

// CreateSeason 创建新赛季
func (s *SeasonService) CreateSeason(ctx context.Context, req *model.CreateSeasonRequest) (*model.Season, error) {
	seasonNum, err := s.seasonDAO.GetNextSeasonNum(ctx, req.ServerID)
	if err != nil {
		return nil, fmt.Errorf("get next season num: %w", err)
	}

	durationDays := req.DurationDays
	if durationDays <= 0 {
		durationDays = 60 // 默认60天
	}

	now := time.Now()
	season := &model.Season{
		SeasonNum:    seasonNum,
		ServerID:     req.ServerID,
		Name:         req.Name,
		Status:       model.SeasonStatusPreparing,
		StartTime:    now.Add(24 * time.Hour), // 默认明天开始
		EndTime:      now.Add(24*time.Hour + time.Duration(durationDays)*24*time.Hour),
		DurationDays: durationDays,
	}

	id, err := s.seasonDAO.CreateSeason(ctx, season)
	if err != nil {
		return nil, fmt.Errorf("create season: %w", err)
	}
	season.ID = id
	return season, nil
}

// StartSeason 启动赛季（准备中→进行中）
func (s *SeasonService) StartSeason(ctx context.Context, seasonID int64) (*model.Season, error) {
	season, err := s.seasonDAO.GetSeasonByID(ctx, seasonID)
	if err != nil {
		return nil, ErrSeasonNotFound
	}

	if season.Status != model.SeasonStatusPreparing {
		return nil, fmt.Errorf("赛季状态非准备中，当前: %s", model.SeasonStatusText(season.Status))
	}

	ok, err := s.seasonDAO.UpdateSeasonStatus(ctx, seasonID, model.SeasonStatusPreparing, model.SeasonStatusActive)
	if err != nil || !ok {
		return nil, fmt.Errorf("启动赛季失败: %w", err)
	}

	season.Status = model.SeasonStatusActive
	return season, nil
}

// GetSeasonDetail 获取赛季详情
func (s *SeasonService) GetSeasonDetail(ctx context.Context, seasonID int64) (*model.SeasonDetailResponse, error) {
	season, err := s.seasonDAO.GetSeasonByID(ctx, seasonID)
	if err != nil {
		return nil, ErrSeasonNotFound
	}

	resp := &model.SeasonDetailResponse{
		Season:     *season,
		StatusText: model.SeasonStatusText(season.Status),
	}

	// 计算剩余天数
	if season.Status == model.SeasonStatusActive || season.Status == model.SeasonStatusEnding {
		remain := time.Until(season.EndTime)
		if remain > 0 {
			resp.RemainDays = int(remain.Hours() / 24)
		} else {
			resp.RemainDays = 0
		}
	}

	// 获取联盟排名（已结算的赛季）
	if season.Status == model.SeasonStatusEnded {
		guildRankings, _ := s.seasonDAO.GetGuildSeasonStats(ctx)
		resp.GuildRankings = guildRankings
	}

	return resp, nil
}

// ListSeasons 获取赛季列表
func (s *SeasonService) ListSeasons(ctx context.Context, req *model.SeasonListRequest) (*model.PageData, error) {
	seasons, total, err := s.seasonDAO.ListSeasons(ctx, req.ServerID, req.Status, req.Page, req.PageSize)
	if err != nil {
		return nil, err
	}
	return &model.PageData{
		Total: total,
		Page:  req.Page,
		Size:  req.PageSize,
		List:  seasons,
	}, nil
}

// GetCurrentSeason 获取当前赛季
func (s *SeasonService) GetCurrentSeason(ctx context.Context, serverID int64) (*model.SeasonCountdownResponse, error) {
	season, err := s.seasonDAO.GetCurrentSeason(ctx, serverID)
	if err != nil {
		return nil, ErrSeasonNotFound
	}

	now := time.Now()
	remainDuration := time.Until(season.EndTime)
	if remainDuration < 0 {
		remainDuration = 0
	}
	totalDuration := season.EndTime.Sub(season.StartTime)
	progress := 0.0
	if totalDuration > 0 {
		progress = math.Min(1.0, float64(time.Since(season.StartTime))/float64(totalDuration))
	}

	return &model.SeasonCountdownResponse{
		SeasonID:    season.ID,
		SeasonNum:   season.SeasonNum,
		SeasonName:  season.Name,
		Status:      season.Status,
		StatusText:  model.SeasonStatusText(season.Status),
		RemainHours: int64(remainDuration.Hours()),
		RemainDays:  int64(remainDuration.Hours()) / 24,
		TotalDays:   season.DurationDays,
		Progress:    math.Round(progress*10000) / 10000,
		CurrentTime: now.Format("2006-01-02 15:04:05"),
	}, nil
}

// ================================================================
// 赛季结算
// ================================================================

// PrepareSettlement 准备结算（Active→Settling）
func (s *SeasonService) PrepareSettlement(ctx context.Context, seasonID int64) error {
	season, err := s.seasonDAO.GetSeasonByID(ctx, seasonID)
	if err != nil {
		return ErrSeasonNotFound
	}

	if season.Status == model.SeasonStatusSettling {
		return ErrSeasonBusy
	}

	if season.Status != model.SeasonStatusActive && season.Status != model.SeasonStatusEnding {
		return ErrSeasonInvalid
	}

	ok, err := s.seasonDAO.UpdateSeasonStatus(ctx, seasonID, season.Status, model.SeasonStatusSettling)
	if err != nil || !ok {
		return fmt.Errorf("更新赛季状态失败: %w", err)
	}
	return nil
}

// CompleteSettlement 完成结算（Settling→Ended）
func (s *SeasonService) CompleteSettlement(ctx context.Context, seasonID int64, settleResult map[string]interface{}) error {
	resultJSON, _ := json.Marshal(settleResult)
	err := s.seasonDAO.UpdateSeasonSettleResult(ctx, seasonID, string(resultJSON), settleResult["reward_count"].(int))
	if err != nil {
		return fmt.Errorf("更新结算结果失败: %w", err)
	}

	// 更新状态为已结束
	_, err = s.seasonDAO.UpdateSeasonStatus(ctx, seasonID, model.SeasonStatusSettling, model.SeasonStatusEnded)
	if err != nil {
		return fmt.Errorf("更新赛季状态失败: %w", err)
	}
	return nil
}

// TransitionToEnding 转换为即将结束状态（Active→Ending）
func (s *SeasonService) TransitionToEnding(ctx context.Context, seasonID int64) error {
	ok, err := s.seasonDAO.UpdateSeasonStatus(ctx, seasonID, model.SeasonStatusActive, model.SeasonStatusEnding)
	if err != nil || !ok {
		return fmt.Errorf("转换状态失败: %w", err)
	}
	return nil
}

// ================================================================
// 赛季奖励
// ================================================================

// CreateReward 创建奖励配置
func (s *SeasonService) CreateReward(ctx context.Context, req *model.CreateRewardRequest) (*model.SeasonReward, error) {
	reward := &model.SeasonReward{
		SeasonNum:  req.SeasonNum,
		RankMin:    req.RankMin,
		RankMax:    req.RankMax,
		RewardType: req.RewardType,
		RewardID:   req.RewardID,
		Amount:     req.Amount,
		Title:      req.Title,
	}
	id, err := s.seasonDAO.CreateReward(ctx, reward)
	if err != nil {
		return nil, fmt.Errorf("create reward: %w", err)
	}
	reward.ID = id
	return reward, nil
}

// ListRewards 获取奖励配置
func (s *SeasonService) ListRewards(ctx context.Context, seasonNum int) ([]*model.SeasonReward, error) {
	return s.seasonDAO.ListRewards(ctx, seasonNum)
}

// DeleteReward 删除奖励配置
func (s *SeasonService) DeleteReward(ctx context.Context, id int64) error {
	return s.seasonDAO.DeleteReward(ctx, id)
}

// ================================================================
// 赛季排名
// ================================================================

// ListRankings 获取赛季排名
func (s *SeasonService) ListRankings(ctx context.Context, seasonID int64, page, pageSize int) (*model.PageData, error) {
	rankings, total, err := s.seasonDAO.ListRankings(ctx, seasonID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &model.PageData{
		Total: total,
		Page:  page,
		Size:  pageSize,
		List:  rankings,
	}, nil
}

// GetMyRanking 获取我的赛季排名
func (s *SeasonService) GetMyRanking(ctx context.Context, seasonID, userID int64) (*model.SeasonRanking, error) {
	return s.seasonDAO.GetRankingByUser(ctx, seasonID, userID)
}

// ================================================================
// 奖励发放记录
// ================================================================

// ListRewardLogs 获取奖励发放记录
func (s *SeasonService) ListRewardLogs(ctx context.Context, seasonID int64, page, pageSize int) (*model.PageData, error) {
	logs, total, err := s.seasonDAO.ListRewardLogs(ctx, seasonID, page, pageSize)
	if err != nil {
		return nil, err
	}
	return &model.PageData{
		Total: total,
		Page:  page,
		Size:  pageSize,
		List:  logs,
	}, nil
}
