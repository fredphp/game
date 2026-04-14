package model

import "time"

// ============================================================
// 战斗单位
// ============================================================

// BattleUnit 战斗单位（运行时状态）
type BattleUnit struct {
	UnitID    int64  `json:"unit_id"`     // 唯一标识（uid + slot）
	UserID    int64  `json:"user_id"`     // 所属玩家
	CardID    int64  `json:"card_id"`     // 卡牌定义ID
	Name      string `json:"name"`        // 武将名
	Faction   string `json:"faction"`     // 阵营: wei/shu/wu/qun
	Element   string `json:"element"`     // 属性: fire/ice/wind/thunder/light/dark
	Role      string `json:"role"`        // 定位: tank/warrior/mage/assassin/support
	Slot      int    `json:"slot"`        // 阵位 0~4

	// 属性（计算后）
	MaxHP     int `json:"max_hp"`
	CurrentHP int `json:"current_hp"`
	ATK       int `json:"atk"`
	DEF       int `json:"def"`
	SPD       int `json:"spd"`           // 速度（决定出手顺序）
	CritRate  int `json:"crit_rate"`     // 暴击率 (万分比, 如 2000 = 20%)
	CritDMG   int `json:"crit_dmg"`      // 暴击伤害 (万分比, 如 15000 = 150%)

	// 技能
	NormalSkill *Skill  `json:"normal_skill"`
	ActiveSkill *Skill  `json:"active_skill"`  // 主动技能（CD好了就用）

	// 运行时状态
	Alive       bool           `json:"alive"`
	Buffs       []*BuffEffect  `json:"buffs"`
	Debuffs     []*BuffEffect  `json:"debuffs"`
	SkillCD     int            `json:"skill_cd"`       // 主动技能冷却（回合）
	TotalDamage int64          `json:"total_damage"`    // 累计输出伤害
	Kills       int            `json:"kills"`           // 击杀数
}

// ============================================================
// 技能定义
// ============================================================

// Skill 技能定义（JSON 配置）
type Skill struct {
	ID          int64   `json:"id"`
	Name        string  `json:"name"`
	Type        string  `json:"type"`          // normal/active/passive
	TargetType  string  `json:"target_type"`   // single/enemy_all/ally_lowest_hp/self
	DamageType  string  `json:"damage_type"`   // physical/magical/true
	DamageRatio float64 `json:"damage_ratio"`  // 伤害倍率 (如 1.5 = 150%)
	BaseDamage  int     `json:"base_damage"`   // 基础伤害值
	CD          int     `json:"cd"`            // 冷却回合数
	Buffs       []BuffTemplate `json:"buffs"` // 附加效果
	Special     string  `json:"special"`       // 特殊效果: heal/shield/revive
	HealRatio   float64 `json:"heal_ratio"`    // 治疗倍率
	Description string  `json:"description"`
}

// BuffTemplate Buff 模板
type BuffTemplate struct {
	Type       string  `json:"type"`        // atk_up/def_up/spd_up/dot/shield/stun
	Value      float64 `json:"value"`       // 数值（百分比或固定值）
	Duration   int     `json:"duration"`    // 持续回合数
	IsDebuff   bool    `json:"is_debuff"`
}

// BuffEffect 运行时 Buff 效果
type BuffEffect struct {
	Type     string  `json:"type"`
	Value    float64 `json:"value"`
	Remain   int     `json:"remain"`       // 剩余回合
	SourceID int64   `json:"source_id"`    // 施加者
	IsDebuff bool    `json:"is_debuff"`
}

// ============================================================
// 阵营克制
// ============================================================

// CounterRelation 阵营克制关系
// wei > shu > wu > wei   qun 被所有克制，克制所有（半克制）
// element 同理: fire > ice > wind > fire  thunder > water > fire  light <-> dark
var CounterMap = map[string]string{
	"wei":    "shu",
	"shu":    "wu",
	"wu":     "wei",
	"qun":    "",
	"fire":   "ice",
	"ice":    "wind",
	"wind":   "fire",
	"thunder": "water",
	"water":  "fire",
	"light":  "dark",
	"dark":   "light",
}

// IsCounter 判断 attacker 是否克制 target
func IsCounter(atkFaction, defFaction string) bool {
	if counter, ok := CounterMap[atkFaction]; ok && counter == defFaction {
		return true
	}
	return false
}

// CounterMultiplier 克制伤害倍率
func CounterMultiplier(atkFaction, defFaction string) float64 {
	if IsCounter(atkFaction, defFaction) {
		return 1.3 // 克制 +30% 伤害
	}
	if IsCounter(defFaction, atkFaction) {
		return 0.7 // 被克制 -30% 伤害
	}
	return 1.0
}

// ============================================================
// 战斗流程
// ============================================================

// BattleAction 单回合单个单位的行动
type BattleAction struct {
	ActorID    int64   `json:"actor_id"`
	ActorName  string  `json:"actor_name"`
	TargetID   int64   `json:"target_id"`
	TargetName string  `json:"target_name"`
	ActionType string  `json:"action_type"`  // attack/skill/heal/die
	SkillName  string  `json:"skill_name"`
	Damage     int     `json:"damage"`
	Heal       int     `json:"heal"`
	IsCrit     bool    `json:"is_crit"`
	IsCounter  bool    `json:"is_counter"`
	Buffs      []BuffEffect `json:"buffs,omitempty"`
	HPAfter    int     `json:"hp_after"`
}

// BattleTurn 单回合记录
type BattleTurn struct {
	TurnNumber int            `json:"turn_number"`
	Actions    []BattleAction `json:"actions"`
}

// BattleResult 战斗结果
type BattleResult struct {
	BattleID    string         `json:"battle_id"`
	Winner      int            `json:"winner"`         // 1=attacker赢 2=defender赢
	TurnCount   int            `json:"turn_count"`
	TotalDamage map[int64]int64 `json:"total_damage"`   // unitID -> damage
	Units       []UnitResult   `json:"units"`
	Turns       []BattleTurn   `json:"turns"`
	Duration    int64          `json:"duration_ms"`
}

// UnitResult 单位战斗结果
type UnitResult struct {
	UnitID      int64  `json:"unit_id"`
	Name        string `json:"name"`
	Faction     string `json:"faction"`
	Alive       bool   `json:"alive"`
	HPRemain    int    `json:"hp_remain"`
	MaxHP       int    `json:"max_hp"`
	TotalDamage int64  `json:"total_damage"`
	Kills       int    `json:"kills"`
}

// ============================================================
// 数据库模型
// ============================================================

// BattleRecord 战斗记录（持久化）
type BattleRecord struct {
	ID          int64     `json:"id" db:"id"`
	BattleID    string    `json:"battle_id" db:"battle_id"`
	AttackerID  int64     `json:"attacker_id" db:"attacker_id"`
	DefenderID  int64     `json:"defender_id" db:"defender_id"`
	AttackerWin bool      `json:"attacker_win" db:"attacker_win"`
	Type        string    `json:"type" db:"type"`            // pve/pvp/guild_war
	StageID     int       `json:"stage_id" db:"stage_id"`    // 关卡ID（PVE）
	TurnCount   int       `json:"turn_count" db:"turn_count"`
	ResultJSON  string    `json:"result_json" db:"result_json"`
	Duration    int64     `json:"duration_ms" db:"duration_ms"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

func (BattleRecord) TableName() string { return "battle_records" }

// ============================================================
// 请求/响应
// ============================================================

// StartBattleRequest 开始战斗请求
type StartBattleRequest struct {
	Type       string       `json:"type" binding:"required"` // pve/pvp
	DefenderID int64        `json:"defender_id"`            // PVP对手ID
	StageID    int          `json:"stage_id"`               // PVE关卡ID
	Team       []TeamSlot   `json:"team" binding:"required,min=1,max=5"`
}

// TeamSlot 出战卡牌槽位
type TeamSlot struct {
	CardID int `json:"card_id" binding:"required"`
	Slot   int `json:"slot" binding:"required,min=0,max=4"` // 阵位
}

// BattleResponse 战斗响应
type BattleResponse struct {
	BattleID  string       `json:"battle_id"`
	Winner    int          `json:"winner"`
	TurnCount int          `json:"turn_count"`
	Turns     []BattleTurn `json:"turns"`
	Units     []UnitResult `json:"units"`
	Rewards   []Reward     `json:"rewards,omitempty"`
	Duration  int64        `json:"duration_ms"`
}

// Reward 战斗奖励
type Reward struct {
	Type  string `json:"type"`   // gold/exp/item
	ID    int64  `json:"id"`     // 物品ID
	Count int    `json:"count"`  // 数量
}
