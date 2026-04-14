package model

import (
        "database/sql"
        "encoding/json"
        "time"
)

// ================================================================
// 地图区域
// ================================================================

type MapRegion struct {
        ID          int             `json:"id"`
        Name        string          `json:"name"`
        DisplayName string          `json:"display_name"`
        Description string          `json:"description"`
        CenterX     int             `json:"center_x"`
        CenterY     int             `json:"center_y"`
        TerrainType string          `json:"terrain_type"`
        ResourceBonus json.RawMessage `json:"resource_bonus,omitempty"`
        SortOrder   int             `json:"sort_order"`
        CreatedAt   time.Time       `json:"created_at"`
}

// ================================================================
// 城池定义
// ================================================================

type MapCity struct {
        ID           int64          `json:"id"`
        Name         string         `json:"name"`
        RegionID     int            `json:"region_id"`
        PosX         int            `json:"pos_x"`
        PosY         int            `json:"pos_y"`
        Level        int8           `json:"level"`
        Terrain      string         `json:"terrain"`
        DefenseBase  int            `json:"defense_base"`
        FoodOutput   int            `json:"food_output"`
        WoodOutput   int            `json:"wood_output"`
        IronOutput   int            `json:"iron_output"`
        GoldOutput   int            `json:"gold_output"`
        IsCapital    bool           `json:"is_capital"`
        Description  string         `json:"description"`
        Connections  []int64        `json:"connections,omitempty"`
        CreatedAt    time.Time      `json:"created_at"`
}

// CityWithOccupation 城池 + 占领状态
type CityWithOccupation struct {
        MapCity
        Occupation *CityOccupation `json:"occupation,omitempty"`
}

// ================================================================
// 城池占领
// ================================================================

type CityOccupation struct {
        ID             int64           `json:"id"`
        CityID         int64           `json:"city_id"`
        OwnerType      int8            `json:"owner_type"`       // 0=中立 1=玩家 2=联盟
        OwnerID        int64           `json:"owner_id"`
        AllianceID     sql.NullInt64   `json:"alliance_id"`
        GarrisonPower  int             `json:"garrison_power"`
        OccupyTime     time.Time       `json:"occupy_time"`
        DefenseWalls   int             `json:"defense_walls"`
        ResourceStored json.RawMessage `json:"resource_stored,omitempty"`
        UpdatedAt      time.Time       `json:"updated_at"`
        CreatedAt      time.Time       `json:"created_at"`
}

// ================================================================
// 行军令
// ================================================================

// MarchType 行军类型
const (
        MarchTypeAttack  = 1 // 进攻
        MarchTypeReinforce = 2 // 增援
        MarchTypeScout   = 3 // 侦查
        MarchTypeRetreat = 4 // 撤退
        MarchTypeRelocate = 5 // 迁城
)

// MarchStatus 行军状态
const (
        MarchStatusMarching  = 1 // 行军中
        MarchStatusArrived   = 2 // 已到达
        MarchStatusBattle    = 3 // 战斗中
        MarchStatusReturned  = 4 // 已返回
        MarchStatusRecalled  = 5 // 已撤回
        MarchStatusFailed    = 6 // 已失败
)

type MarchOrder struct {
        ID             int64           `json:"id"`
        MarchID        string          `json:"march_id"`
        UserID         int64           `json:"user_id"`
        AllianceID     sql.NullInt64   `json:"alliance_id"`
        SourceCityID   int64           `json:"source_city_id"`
        TargetCityID   int64           `json:"target_city_id"`
        MarchType      int8            `json:"march_type"`
        ArmyPower      int             `json:"army_power"`
        ArmyInfo       json.RawMessage `json:"army_info,omitempty"`
        Path           []int64         `json:"path,omitempty"`
        TotalDistance  int             `json:"total_distance"`
        MarchSpeed     int             `json:"march_speed"`
        Status         int8            `json:"status"`
        StartTime      time.Time       `json:"start_time"`
        ArriveTime     time.Time       `json:"arrive_time"`
        ActualArrive   sql.NullTime    `json:"actual_arrive"`
        Progress       int             `json:"progress"`
        BattleResult   json.RawMessage `json:"battle_result,omitempty"`
        ConsumeFood    int             `json:"consume_food"`
        CreatedAt      time.Time       `json:"created_at"`
}

// ================================================================
// 联盟领土
// ================================================================

type AllianceTerritory struct {
        ID             int64           `json:"id"`
        AllianceID     int64           `json:"alliance_id"`
        CityCount      int             `json:"city_count"`
        CapitalCount   int             `json:"capital_count"`
        TotalFood      int64           `json:"total_food"`
        TotalWood      int64           `json:"total_wood"`
        TotalIron      int64           `json:"total_iron"`
        TotalGold      int64           `json:"total_gold"`
        TerritoryLevel int             `json:"territory_level"`
        BuffConfig     json.RawMessage `json:"buff_config,omitempty"`
        UpdatedAt      time.Time       `json:"updated_at"`
        CreatedAt      time.Time       `json:"created_at"`
}

// ================================================================
// 城池战斗日志
// ================================================================

type CityBattleLog struct {
        ID            int64           `json:"id"`
        CityID        int64           `json:"city_id"`
        MarchID       sql.NullString  `json:"march_id"`
        AttackerID    int64           `json:"attacker_id"`
        AttackerName  string          `json:"attacker_name"`
        DefenderID    int64           `json:"defender_id"`
        DefenderName  string          `json:"defender_name"`
        AttackerPower int             `json:"attacker_power"`
        DefenderPower int             `json:"defender_power"`
        AttackerWin   bool            `json:"attacker_win"`
        ResultDetail  json.RawMessage `json:"result_detail,omitempty"`
        CreatedAt     time.Time       `json:"created_at"`
}

// ================================================================
// 请求 / 响应 模型
// ================================================================

// MarchRequest 发起行军请求
type MarchRequest struct {
        SourceCityID int64 `json:"source_city_id" binding:"required"`
        TargetCityID int64 `json:"target_city_id" binding:"required"`
        MarchType    int8  `json:"march_type" binding:"required,min=1,max=5"`
        ArmyPower    int   `json:"army_power" binding:"required,min=1"`
}

// MarchProgressResponse 行军进度响应
type MarchProgressResponse struct {
        MarchID      string  `json:"march_id"`
        Status       int8    `json:"status"`
        StatusText   string  `json:"status_text"`
        Progress     float64 `json:"progress"`
        RemainSecs   int64   `json:"remain_secs"`
        SourceCityID int64   `json:"source_city_id"`
        TargetCityID int64   `json:"target_city_id"`
        ArmyPower    int     `json:"army_power"`
}

// MapOverviewResponse 地图总览响应
type MapOverviewResponse struct {
        Regions      []MapRegion          `json:"regions"`
        Cities       []CityWithOccupation `json:"cities"`
        TotalCities  int                  `json:"total_cities"`
        Occupied     int                  `json:"occupied"`
        Neutral      int                  `json:"neutral"`
        PlayerOwned  int                  `json:"player_owned"`
        AllianceOwned int                 `json:"alliance_owned"`
}

// MarchTypeText 行军类型文本
func MarchTypeText(t int8) string {
        switch t {
        case MarchTypeAttack:
                return "进攻"
        case MarchTypeReinforce:
                return "增援"
        case MarchTypeScout:
                return "侦查"
        case MarchTypeRetreat:
                return "撤退"
        case MarchTypeRelocate:
                return "迁城"
        default:
                return "未知"
        }
}

// MarchStatusText 行军状态文本
func MarchStatusText(s int8) string {
        switch s {
        case MarchStatusMarching:
                return "行军中"
        case MarchStatusArrived:
                return "已到达"
        case MarchStatusBattle:
                return "战斗中"
        case MarchStatusReturned:
                return "已返回"
        case MarchStatusRecalled:
                return "已撤回"
        case MarchStatusFailed:
                return "已失败"
        default:
                return "未知"
        }
}

// OwnerTypeText 占领类型文本
func OwnerTypeText(t int8) string {
        switch t {
        case 0:
                return "中立"
        case 1:
                return "玩家"
        case 2:
                return "联盟"
        default:
                return "未知"
        }
}
