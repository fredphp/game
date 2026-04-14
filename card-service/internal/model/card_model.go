package model

import "time"

// ============================================================
// 卡牌定义
// ============================================================

// Card 卡牌定义（配置表）
type Card struct {
	ID          int64    `json:"id" db:"id"`
	Name        string   `json:"name" db:"name"`               // 武将名
	Title       string   `json:"title" db:"title"`             // 称号（如"蜀汉昭烈帝"）
	Rarity      int      `json:"rarity" db:"rarity"`           // 稀有度: 3=R, 4=SR, 5=SSR
	Element     string   `json:"element" db:"element"`         // 元素: fire/ice/wind/thunder/light/dark
	Faction     string   `json:"faction" db:"faction"`         // 阵营: wei/shu/wu/qun
	Role        string   `json:"role" db:"role"`               // 定位: tank/warrior/mage/assassin/support
	BaseHP      int      `json:"base_hp" db:"base_hp"`         // 基础生命值
	BaseATK     int      `json:"base_atk" db:"base_atk"`       // 基础攻击力
	BaseDEF     int      `json:"base_def" db:"base_def"`       // 基础防御力
	SkillID     int      `json:"skill_id" db:"skill_id"`       // 技能ID
	LeadSkillID int      `json:"lead_skill_id" db:"lead_skill_id"` // 主帅技能ID
	Description string   `json:"description" db:"description"` // 卡牌描述
	ObtainFrom  string   `json:"obtain_from" db:"obtain_from"` // 获取途径
	IsLimited   bool     `json:"is_limited" db:"is_limited"`   // 是否限定卡
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

func (Card) TableName() string { return "card_definitions" }

// ============================================================
// 卡池配置
// ============================================================

// CardPool 卡池配置（可热更新）
type CardPool struct {
	ID          int64           `json:"id" db:"id"`
	Name        string          `json:"name" db:"name"`               // 卡池名称
	DisplayName string          `json:"display_name" db:"display_name"` // 展示名称
	Type        string          `json:"type" db:"type"`               // normal/limited/rateup
	StartTime   time.Time       `json:"start_time" db:"start_time"`   // 开放时间
	EndTime     time.Time       `json:"end_time" db:"end_time"`       // 结束时间
	Status      int8            `json:"status" db:"status"`           // 1=开放 0=关闭
	Config      string          `json:"config" db:"config"`           // JSON: 概率+保底配置
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
}

func (CardPool) TableName() string { return "card_pools" }

// PoolConfig 卡池概率配置
type PoolConfig struct {
	SSRRate   float64 `json:"ssr_rate"`    // SSR 基础概率 (如 0.02 = 2%)
	SRRate    float64 `json:"sr_rate"`     // SR 基础概率 (如 0.10 = 10%)
	RRate     float64 `json:"r_rate"`      // R 基础概率 (如 0.88 = 88%)
	SSRUpRate float64 `json:"ssr_up_rate"` // 限定UP概率 (如 0.005 = 0.5%)
	PitySSR   int     `json:"pity_ssr"`    // SSR保底抽数 (如 80)
	PitySR    int     `json:"pity_sr"`     // SR保底抽数 (如 10)
	SSRPool   []int64 `json:"ssr_pool"`    // SSR卡池卡牌ID列表
	SRPool    []int64 `json:"sr_pool"`     // SR卡池卡牌ID列表
	RPool     []int64 `json:"r_pool"`      // R卡池卡牌ID列表
	UpCards   []int64 `json:"up_cards"`    // UP卡牌ID列表（限定池独有）
}

// ============================================================
// 玩家卡牌
// ============================================================

// UserCard 玩家持有卡牌
type UserCard struct {
	ID          int64     `json:"id" db:"id"`
	UserID      int64     `json:"user_id" db:"user_id"`
	CardID      int64     `json:"card_id" db:"card_id"`
	Star        int       `json:"star" db:"star"`             // 星级: 1~6
	Level       int       `json:"level" db:"level"`           // 等级: 1~100
	Exp         int64     `json:"exp" db:"exp"`               // 经验值
	IsLocked    bool      `json:"is_locked" db:"is_locked"`   // 是否锁定
	ObtainTime  time.Time `json:"obtain_time" db:"obtain_time"` // 获取时间
	ObtainFrom  string    `json:"obtain_from" db:"obtain_from"` // 获取来源
	CreateTime  time.Time `json:"create_time" db:"create_time"`
	UpdateTime  time.Time `json:"update_time" db:"update_time"`
}

func (UserCard) TableName() string { return "user_cards" }

// ============================================================
// 抽卡记录
// ============================================================

// GachaRecord 抽卡记录
type GachaRecord struct {
	ID        int64     `json:"id" db:"id"`
	UserID    int64     `json:"user_id" db:"user_id"`
	PoolID    int64     `json:"pool_id" db:"pool_id"`
	CardID    int64     `json:"card_id" db:"card_id"`
	Rarity    int       `json:"rarity" db:"rarity"`
	IsNew     bool      `json:"is_new" db:"is_new"`       // 是否首次获得
	IsPity    bool      `json:"is_pity" db:"is_pity"`     // 是否保底
	PullIndex int       `json:"pull_index" db:"pull_index"` // 第几抽
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

func (GachaRecord) TableName() string { return "gacha_records" }

// UserGachaInfo 玩家抽卡统计（Redis + MySQL）
type UserGachaInfo struct {
	UserID         int64 `json:"user_id"`
	PoolID         int64 `json:"pool_id"`
	TotalPulls     int   `json:"total_pulls"`      // 总抽数
	SSRPityCounter int   `json:"ssr_pity_counter"`  // 距上次SSR已抽数
	SRPityCounter  int   `json:"sr_pity_counter"`   // 距上次SR已抽数
}

// ============================================================
// 请求/响应
// ============================================================

// GachaRequest 抽卡请求
type GachaRequest struct {
	PoolID int64 `json:"pool_id" binding:"required,min=1"` // 卡池ID
	Count  int   `json:"count" binding:"required,min=1,max=10"` // 抽数: 1或10
}

// GachaResponse 抽卡响应
type GachaResponse struct {
	PullIndex    int          `json:"pull_index"`     // 本次第N抽（累计）
	Cards        []GachaCard  `json:"cards"`          // 获得的卡牌
	NewCards     int          `json:"new_cards"`      // 新卡数量
	SSRCount     int          `json:"ssr_count"`      // SSR数量
	SRCount      int          `json:"sr_count"`       // SR数量
	RCount       int          `json:"r_count"`        // R数量
	SSRPityLeft  int          `json:"ssr_pity_left"`  // SSR保底还剩几抽
	SRPityLeft   int          `json:"sr_pity_left"`   // SR保底还剩几抽
}

// GachaCard 单张抽卡结果
type GachaCard struct {
	CardID      int64  `json:"card_id"`
	Name        string `json:"name"`
	Rarity      int    `json:"rarity"`
	IsNew       bool   `json:"is_new"`
	IsPity      bool   `json:"is_pity"`
	IsUp        bool   `json:"is_up"`        // 是否UP卡
	UserCardID  int64  `json:"user_card_id"` // 用户卡牌实例ID
}

// UserCardListRequest 查询卡牌列表请求
type UserCardListRequest struct {
	Page     int `json:"page" form:"page" binding:"omitempty,min=1"`
	PageSize int `json:"page_size" form:"page_size" binding:"omitempty,min=1,max=100"`
	Rarity   int `json:"rarity" form:"rarity" binding:"omitempty,min=3,max=5"`
}

// CardDetailResponse 卡牌详情响应
type CardDetailResponse struct {
	*Card
	UserCards []UserCardDetail `json:"user_cards,omitempty"`
}

// UserCardDetail 用户持有卡牌详情
type UserCardDetail struct {
	ID         int64  `json:"id"`
	Star       int    `json:"star"`
	Level      int    `json:"level"`
	Exp        int64  `json:"exp"`
	IsLocked   bool   `json:"is_locked"`
	ObtainTime string `json:"obtain_time"`
}
