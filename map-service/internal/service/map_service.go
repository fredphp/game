package service

import (
        "context"
        "encoding/json"
        "errors"
        "fmt"
        "time"

        "map-service/internal/dao"
        "map-service/internal/engine"
        "map-service/internal/model"
        myredis "map-service/pkg/redis"

        "github.com/redis/go-redis/v9"
)

var (
        ErrCityNotFound     = errors.New("city not found")
        ErrMarchLimitExceed = errors.New("march limit exceeded")
        ErrMarchNotFound    = errors.New("march not found")
        ErrCannotRecall     = errors.New("cannot recall march")
        ErrPathNotFound     = errors.New("no path found")
)

const (
        cacheCityPrefix       = "map:city:info:"          // Hash: 城池信息缓存
        cacheCityTTL          = 30 * time.Minute
        cacheOccupationPrefix = "map:city:occupy:"         // Hash: 占领状态缓存
        cacheOccupationTTL    = 5 * time.Minute
        cacheAlliancePrefix   = "map:alliance:territory:"  // Hash: 联盟领土缓存
        cacheAllianceTTL      = 10 * time.Minute
        cacheMapOverview      = "map:overview"             // String: 地图总览缓存
        cacheMapOverviewTTL   = 2 * time.Minute
)

// MapService 地图业务逻辑
type MapService struct {
        dao   *dao.MapDAO
        march *engine.MarchEngine
}

func NewMapService(dao *dao.MapDAO, march *engine.MarchEngine) *MapService {
        return &MapService{dao: dao, march: march}
}

// ================================================================
// 地图总览
// ================================================================

// GetMapOverview 获取地图总览
func (s *MapService) GetMapOverview(ctx context.Context) (*model.MapOverviewResponse, error) {
        // 先查缓存
        cached, err := s.getCachedOverview(ctx)
        if err == nil && cached != nil {
                return cached, nil
        }

        // 获取区域列表
        regions, err := s.dao.ListRegions(ctx)
        if err != nil {
                return nil, fmt.Errorf("list regions: %w", err)
        }

        // 获取所有城池
        cities, err := s.dao.ListAllCities(ctx)
        if err != nil {
                return nil, fmt.Errorf("list cities: %w", err)
        }

        // 获取所有占领状态
        neutral, player, alliance, err := s.dao.CountOccupations(ctx)
        if err != nil {
                return nil, fmt.Errorf("count occupations: %w", err)
        }

        // 构建城池+占领状态列表
        cityWithOcc := make([]model.CityWithOccupation, 0, len(cities))
        for _, city := range cities {
                occ, _ := s.dao.GetOccupation(ctx, city.ID)
                cityWithOcc = append(cityWithOcc, model.CityWithOccupation{
                        MapCity:     *city,
                        Occupation:  occ,
                })
        }

        resp := &model.MapOverviewResponse{
                Regions:       regions,
                Cities:        cityWithOcc,
                TotalCities:   len(cities),
                Occupied:      player + alliance,
                Neutral:       neutral,
                PlayerOwned:   player,
                AllianceOwned: alliance,
        }

        // 写入缓存
        go s.cacheOverview(context.Background(), resp)

        return resp, nil
}

// ================================================================
// 城池查询
// ================================================================

// ListRegions 获取区域列表
func (s *MapService) ListRegions(ctx context.Context) ([]*model.MapRegion, error) {
        return s.dao.ListRegions(ctx)
}

// GetCityDetail 获取城池详情
func (s *MapService) GetCityDetail(ctx context.Context, cityID int64) (*model.CityWithOccupation, error) {
        // 先查缓存
        city, err := s.getCachedCity(ctx, cityID)
        if err != nil {
                city, err = s.dao.GetCityByID(ctx, cityID)
                if err != nil {
                        return nil, ErrCityNotFound
                }
                s.cacheCity(ctx, city)
        }

        // 获取占领状态
        occ, _ := s.dao.GetOccupation(ctx, cityID)

        return &model.CityWithOccupation{
                MapCity:    *city,
                Occupation: occ,
        }, nil
}

// ListCitiesByRegion 按区域获取城池
func (s *MapService) ListCitiesByRegion(ctx context.Context, regionID int) ([]*model.MapCity, error) {
        return s.dao.ListCitiesByRegion(ctx, regionID)
}

// ================================================================
// 行军系统
// ================================================================

// InitiateMarch 发起行军
func (s *MapService) InitiateMarch(ctx context.Context, userID, allianceID int64, req *model.MarchRequest) (*model.MarchOrder, error) {
        return s.march.InitiateMarch(ctx, userID, allianceID, req.SourceCityID, req.TargetCityID, req.MarchType, req.ArmyPower)
}

// RecallMarch 撤回行军
func (s *MapService) RecallMarch(ctx context.Context, userID int64, marchID string) error {
        return s.march.RecallMarch(ctx, userID, marchID)
}

// GetMarchProgress 获取行军进度
func (s *MapService) GetMarchProgress(ctx context.Context, marchID string) (*model.MarchProgressResponse, error) {
        // 先查 Redis 缓存
        key := fmt.Sprintf("%s%s", engine.MarchProgressPrefix, marchID)
        data, err := myredis.RDB.Get(ctx, key).Result()
        if err == nil && data != "" {
                var progress model.MarchProgressResponse
                if json.Unmarshal([]byte(data), &progress) == nil {
                        return &progress, nil
                }
        }

        // 查数据库
        march, err := s.dao.GetMarchByMarchID(ctx, marchID)
        if err != nil {
                return nil, ErrMarchNotFound
        }

        remainSecs := int64(0)
        progress := 100
        if march.Status == model.MarchStatusMarching {
                now := time.Now()
                totalDuration := march.ArriveTime.Sub(march.StartTime).Seconds()
                elapsed := now.Sub(march.StartTime).Seconds()
                if totalDuration > 0 {
                        progress = int(elapsed / totalDuration * 100)
                        if progress > 100 {
                                progress = 100
                        }
                }
                remainSecs = int64(march.ArriveTime.Sub(now).Seconds())
                if remainSecs < 0 {
                        remainSecs = 0
                }
        }

        return &model.MarchProgressResponse{
                MarchID:      march.MarchID,
                Status:       march.Status,
                StatusText:   model.MarchStatusText(march.Status),
                Progress:     float64(progress),
                RemainSecs:   remainSecs,
                SourceCityID: march.SourceCityID,
                TargetCityID: march.TargetCityID,
                ArmyPower:    march.ArmyPower,
        }, nil
}

// ListUserMarches 获取用户行军列表
func (s *MapService) ListUserMarches(ctx context.Context, userID int64, status int8, limit int) ([]*model.MarchOrder, error) {
        if limit <= 0 || limit > 50 {
                limit = 20
        }
        return s.dao.ListUserMarches(ctx, userID, status, limit)
}

// ================================================================
// 联盟领土
// ================================================================

// GetAllianceTerritory 获取联盟领土信息
func (s *MapService) GetAllianceTerritory(ctx context.Context, allianceID int64) (*model.AllianceTerritory, error) {
        // 先查缓存
        cached, err := s.getCachedAllianceTerritory(ctx, allianceID)
        if err == nil && cached != nil {
                return cached, nil
        }

        // 查数据库
        territory, err := s.dao.GetAllianceTerritory(ctx, allianceID)
        if err != nil {
                return nil, err
        }

        // 写入缓存
        go s.cacheAllianceTerritory(context.Background(), territory)

        return territory, nil
}

// ================================================================
// 城池战斗日志
// ================================================================

// ListCityBattleLogs 获取城池战斗日志
func (s *MapService) ListCityBattleLogs(ctx context.Context, cityID int64, limit int) ([]*model.CityBattleLog, error) {
        if limit <= 0 || limit > 50 {
                limit = 20
        }
        return s.dao.ListCityBattleLogs(ctx, cityID, limit)
}

// ================================================================
// 缓存操作
// ================================================================

func (s *MapService) getCachedOverview(ctx context.Context) (*model.MapOverviewResponse, error) {
        data, err := myredis.RDB.Get(ctx, cacheMapOverview).Result()
        if err != nil {
                return nil, err
        }
        var resp model.MapOverviewResponse
        if err := json.Unmarshal([]byte(data), &resp); err != nil {
                return nil, err
        }
        return &resp, nil
}

func (s *MapService) cacheOverview(ctx context.Context, resp *model.MapOverviewResponse) {
        data, _ := json.Marshal(resp)
        myredis.RDB.Set(ctx, cacheMapOverview, string(data), cacheMapOverviewTTL)
}

func (s *MapService) getCachedCity(ctx context.Context, cityID int64) (*model.MapCity, error) {
        key := fmt.Sprintf("%s%d", cacheCityPrefix, cityID)
        data, err := myredis.RDB.HGet(ctx, key, "data").Result()
        if err != nil {
                return nil, err
        }
        var city model.MapCity
        if err := json.Unmarshal([]byte(data), &city); err != nil {
                return nil, err
        }
        return &city, nil
}

func (s *MapService) cacheCity(ctx context.Context, city *model.MapCity) {
        key := fmt.Sprintf("%s%d", cacheCityPrefix, city.ID)
        data, _ := json.Marshal(city)
        pipe := myredis.RDB.Pipeline()
        pipe.HSet(ctx, key, "data", string(data))
        pipe.Expire(ctx, key, cacheCityTTL)
        pipe.Exec(ctx)
}

func (s *MapService) getCachedAllianceTerritory(ctx context.Context, allianceID int64) (*model.AllianceTerritory, error) {
        key := fmt.Sprintf("%s%d", cacheAlliancePrefix, allianceID)
        data, err := myredis.RDB.Get(ctx, key).Result()
        if err != nil {
                return nil, err
        }
        var territory model.AllianceTerritory
        if err := json.Unmarshal([]byte(data), &territory); err != nil {
                return nil, err
        }
        return &territory, nil
}

func (s *MapService) cacheAllianceTerritory(ctx context.Context, territory *model.AllianceTerritory) {
        key := fmt.Sprintf("%s%d", cacheAlliancePrefix, territory.AllianceID)
        data, _ := json.Marshal(territory)
        myredis.RDB.Set(ctx, key, string(data), cacheAllianceTTL)
}

// ================================================================
// 行军恢复 & 引擎统计
// ================================================================

// RecoverMarches 恢复中断的行军
func (s *MapService) RecoverMarches(ctx context.Context) (int, error) {
        return s.march.RecoverAllMarches(ctx)
}

// GetEngineStats 获取引擎统计信息
func (s *MapService) GetEngineStats(ctx context.Context) (*model.EngineStats, error) {
        return s.march.GetEngineStats(ctx)
}

// GetUserMarchesWithProgress 获取用户行军列表并附带Redis进度
func (s *MapService) GetUserMarchesWithProgress(ctx context.Context, userID int64) ([]*model.MarchOrder, error) {
        marches, err := s.dao.ListUserMarches(ctx, userID, 0, 20)
        if err != nil {
                return nil, err
        }

        // 从 Redis 批量获取进度信息
        for _, march := range marches {
                if march.Status != model.MarchStatusMarching {
                        continue
                }
                key := fmt.Sprintf("%s%s", engine.MarchProgressPrefix, march.MarchID)
                data, err := myredis.RDB.Get(ctx, key).Result()
                if err == nil && data != "" {
                        var progressData struct {
                                Progress   int `json:"progress"`
                                RemainSecs int `json:"remain_secs"`
                        }
                        if json.Unmarshal([]byte(data), &progressData) == nil {
                                if progressData.Progress > march.Progress {
                                        march.Progress = progressData.Progress
                                }
                        }
                }
        }

        return marches, nil
}

// 确保 redis.Nil 使用
var _ = redis.Nil
