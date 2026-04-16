package model

import "time"

// ============================================================
// 技能定义（独立配置表，不再绑定英雄）
// ============================================================

// SkillDefinition 技能定义
type SkillDefinition struct {
	ID           int64     `json:"id" db:"id"`
	Name         string    `json:"name" db:"name"`
	Type         string    `json:"type" db:"type"`             // active/passive
	TargetType   string    `json:"target_type" db:"target_type"`
	DamageType   string    `json:"damage_type" db:"damage_type"`
	DamageRatio  float64   `json:"damage_ratio" db:"damage_ratio"`
	BaseDamage   int       `json:"base_damage" db:"base_damage"`
	CD           int       `json:"cd" db:"cd"`
	Special      string    `json:"special" db:"special"`
	HealRatio    float64   `json:"heal_ratio" db:"heal_ratio"`
	BuffsJSON    string    `json:"buffs_json" db:"buffs_json"`
	Rarity       int       `json:"rarity" db:"rarity"`           // 3=R 4=SR 5=SSR
	Category     string    `json:"category" db:"category"`       // attack/defense/support/control/utility
	Icon         string    `json:"icon" db:"icon"`
	Description  string    `json:"description" db:"description"`
	LevelConfig  string    `json:"level_config" db:"level_config"` // JSON
	IsObtainable bool      `json:"is_obtainable" db:"is_obtainable"`
	MaxLevel     int       `json:"max_level" db:"max_level"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}

func (SkillDefinition) TableName() string { return "skill_definitions" }

// SkillLevelConfig 技能等级配置
type SkillLevelConfig struct {
	Level       int            `json:"level"`
	DamageRatio float64        `json:"damage_ratio"`
	BaseDamage  int            `json:"base_damage"`
	HealRatio   float64        `json:"heal_ratio"`
	CD          int            `json:"cd"`
	Buffs       []BuffTemplate `json:"buffs,omitempty"`
}

// ============================================================
// 技能卡池配置
// ============================================================

// SkillPool 技能卡池配置
type SkillPool struct {
	ID          int64     `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	DisplayName string    `json:"display_name" db:"display_name"`
	Type        string    `json:"type" db:"type"`
	StartTime   time.Time `json:"start_time" db:"start_time"`
	EndTime     time.Time `json:"end_time" db:"end_time"`
	Status      int8      `json:"status" db:"status"`
	Config      string    `json:"config" db:"config"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

func (SkillPool) TableName() string { return "skill_pools" }

// SkillPoolConfig 技能池概率配置
type SkillPoolConfig struct {
	SSRRate     float64 `json:"ssr_rate"`
	SRRate      float64 `json:"sr_rate"`
	RRate       float64 `json:"r_rate"`
	SSRUpRate   float64 `json:"ssr_up_rate"`
	PitySSR     int     `json:"pity_ssr"`
	PitySR      int     `json:"pity_sr"`
	SSRPool     []int64 `json:"ssr_pool"`
	SRPool      []int64 `json:"sr_pool"`
	RPool       []int64 `json:"r_pool"`
	UpSkills    []int64 `json:"up_skills"`
}

// ============================================================
// 玩家技能背包
// ============================================================

// UserSkill 玩家持有的技能实例
type UserSkill struct {
	ID          int64     `json:"id" db:"id"`
	UserID      int64     `json:"user_id" db:"user_id"`
	SkillID     int64     `json:"skill_id" db:"skill_id"`
	Level       int       `json:"level" db:"level"`
	Count       int       `json:"count" db:"count"`
	IsLocked    bool      `json:"is_locked" db:"is_locked"`
	IsEquipped  bool      `json:"is_equipped" db:"is_equipped"`
	ObtainTime  time.Time `json:"obtain_time" db:"obtain_time"`
	ObtainFrom  string    `json:"obtain_from" db:"obtain_from"`
	CreateTime  time.Time `json:"create_time" db:"create_time"`
	UpdateTime  time.Time `json:"update_time" db:"update_time"`
}

func (UserSkill) TableName() string { return "user_skills" }

// ============================================================
// 英雄技能装备
// ============================================================

// HeroSkillEquipment 英雄装备的技能（最多3个槽位）
type HeroSkillEquipment struct {
	ID          int64     `json:"id" db:"id"`
	UserID      int64     `json:"user_id" db:"user_id"`
	UserCardID  int64     `json:"user_card_id" db:"user_card_id"`
	UserSkillID int64     `json:"user_skill_id" db:"user_skill_id"`
	Slot        int       `json:"slot" db:"slot"` // 1/2/3
	EquipTime   time.Time `json:"equip_time" db:"equip_time"`
	CreateTime  time.Time `json:"create_time" db:"create_time"`
	UpdateTime  time.Time `json:"update_time" db:"update_time"`
}

func (HeroSkillEquipment) TableName() string { return "hero_skill_equipments" }

// ============================================================
// 技能抽卡
// ============================================================

// SkillGachaRecord 技能抽卡记录
type SkillGachaRecord struct {
	ID        int64     `json:"id" db:"id"`
	UserID    int64     `json:"user_id" db:"user_id"`
	PoolID    int64     `json:"pool_id" db:"pool_id"`
	SkillID   int64     `json:"skill_id" db:"skill_id"`
	Rarity    int       `json:"rarity" db:"rarity"`
	IsNew     bool      `json:"is_new" db:"is_new"`
	IsPity    bool      `json:"is_pity" db:"is_pity"`
	PullIndex int       `json:"pull_index" db:"pull_index"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

func (SkillGachaRecord) TableName() string { return "skill_gacha_records" }

// UserSkillGachaStats 玩家技能抽卡统计
type UserSkillGachaStats struct {
	ID             int64 `json:"id"`
	UserID         int64 `json:"user_id"`
	PoolID         int64 `json:"pool_id"`
	TotalPulls     int   `json:"total_pulls"`
	SSRPityCounter int   `json:"ssr_pity_counter"`
	SRPityCounter  int   `json:"sr_pity_counter"`
}

// ============================================================
// 技能分解记录
// ============================================================

// SkillDecomposeRecord 技能分解记录
type SkillDecomposeRecord struct {
	ID             int64     `json:"id" db:"id"`
	UserID         int64     `json:"user_id" db:"user_id"`
	UserSkillID    int64     `json:"user_skill_id" db:"user_skill_id"`
	SkillID        int64     `json:"skill_id" db:"skill_id"`
	SkillName      string    `json:"skill_name" db:"skill_name"`
	Rarity         int       `json:"rarity" db:"rarity"`
	Level          int       `json:"level" db:"level"`
	DecomposeCount int       `json:"decompose_count" db:"decompose_count"`
	RewardType     string    `json:"reward_type" db:"reward_type"`
	RewardAmount   int       `json:"reward_amount" db:"reward_amount"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

func (SkillDecomposeRecord) TableName() string { return "skill_decompose_records" }

// ============================================================
// 技能升级记录
// ============================================================

// SkillUpgradeRecord 技能升级记录
type SkillUpgradeRecord struct {
	ID             int64     `json:"id" db:"id"`
	UserID         int64     `json:"user_id" db:"user_id"`
	UserSkillID    int64     `json:"user_skill_id" db:"user_skill_id"`
	SkillID        int64     `json:"skill_id" db:"skill_id"`
	BeforeLevel    int       `json:"before_level" db:"before_level"`
	AfterLevel     int       `json:"after_level" db:"after_level"`
	CostFragments  int       `json:"cost_fragments" db:"cost_fragments"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

func (SkillUpgradeRecord) TableName() string { return "skill_upgrade_records" }

// ============================================================
// 请求/响应 DTO
// ============================================================

// SkillGachaRequest 技能抽卡请求
type SkillGachaRequest struct {
	PoolID int64 `json:"pool_id" binding:"required,min=1"`
	Count  int   `json:"count" binding:"required,min=1,max=10"`
}

// SkillGachaResponse 技能抽卡响应
type SkillGachaResponse struct {
	PullIndex   int            `json:"pull_index"`
	Skills      []SkillGachaResult `json:"skills"`
	NewSkills   int            `json:"new_skills"`
	SSRCount    int            `json:"ssr_count"`
	SRCount     int            `json:"sr_count"`
	RCount      int            `json:"r_count"`
	SSRPityLeft int            `json:"ssr_pity_left"`
	SRPityLeft  int            `json:"sr_pity_left"`
}

// SkillGachaResult 单个技能抽卡结果
type SkillGachaResult struct {
	SkillID      int64  `json:"skill_id"`
	Name         string `json:"name"`
	Rarity       int    `json:"rarity"`
	Category     string `json:"category"`
	IsNew        bool   `json:"is_new"`
	IsPity       bool   `json:"is_pity"`
	IsUp         bool   `json:"is_up"`
	UserSkillID  int64  `json:"user_skill_id"`
}

// EquipSkillRequest 装备技能请求
type EquipSkillRequest struct {
	UserCardID  int64 `json:"user_card_id" binding:"required,min=1"`
	UserSkillID int64 `json:"user_skill_id" binding:"required,min=1"`
	Slot        int   `json:"slot" binding:"required,min=1,max=3"`
}

// UnequipSkillRequest 卸下技能请求
type UnequipSkillRequest struct {
	UserCardID int64 `json:"user_card_id" binding:"required,min=1"`
	Slot       int   `json:"slot" binding:"required,min=1,max=3"`
}

// DecomposeSkillRequest 分解技能请求
type DecomposeSkillRequest struct {
	UserSkillID   int64 `json:"user_skill_id" binding:"required,min=1"`
	DecomposeCount int   `json:"decompose_count" binding:"required,min=1"`
}

// DecomposeSkillResponse 分解技能响应
type DecomposeSkillResponse struct {
	SkillName    string `json:"skill_name"`
	Rarity       int    `json:"rarity"`
	Level        int    `json:"level"`
	RewardType   string `json:"reward_type"`
	RewardAmount int    `json:"reward_amount"`
	RemainCount  int    `json:"remain_count"`
}

// UpgradeSkillRequest 升级技能请求
type UpgradeSkillRequest struct {
	UserSkillID int64 `json:"user_skill_id" binding:"required,min=1"`
}

// UpgradeSkillResponse 升级技能响应
type UpgradeSkillResponse struct {
	SkillName   string  `json:"skill_name"`
	Rarity      int     `json:"rarity"`
	BeforeLevel int     `json:"before_level"`
	AfterLevel  int     `json:"after_level"`
	CostFragments int   `json:"cost_fragments"`
	NewDamageRatio float64 `json:"new_damage_ratio"`
	NewBaseDamage int    `json:"new_base_damage"`
}

// HeroEquipmentResponse 英雄装备信息响应
type HeroEquipmentResponse struct {
	UserCardID  int64           `json:"user_card_id"`
	InnateSkill *SkillDefinition `json:"innate_skill,omitempty"`
	EquippedSkills []EquippedSkillDetail `json:"equipped_skills"`
}

// EquippedSkillDetail 装备的技能详情
type EquippedSkillDetail struct {
	Slot        int              `json:"slot"`
	UserSkillID int64            `json:"user_skill_id"`
	Skill       *SkillDefinition `json:"skill"`
	Level       int              `json:"level"`
}

// UserSkillListRequest 玩家技能列表请求
type UserSkillListRequest struct {
	Page     int `json:"page" form:"page" binding:"omitempty,min=1"`
	PageSize int `json:"page_size" form:"page_size" binding:"omitempty,min=1,max=100"`
	Rarity   int `json:"rarity" form:"rarity" binding:"omitempty,min=3,max=5"`
	Category string `json:"category" form:"category" binding:"omitempty"`
}

// UserSkillDetailResponse 玩家技能详情
type UserSkillDetailResponse struct {
	*UserSkill
	Skill *SkillDefinition `json:"skill,omitempty"`
}
