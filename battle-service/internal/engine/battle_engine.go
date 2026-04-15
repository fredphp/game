package engine

import (
        "crypto/rand"
        "encoding/json"
        "fmt"
        "math"
        "math/big"
        "sort"
        "sync"
        "time"

        "battle-service/internal/model"
)

const (
        MaxTurns      = 30       // 最大回合数
        CritBase      = 500      // 基础暴击率 5%
        CritDMGBase   = 20000    // 基础暴击伤害 200%
        DefReduction  = 0.5      // 防御减伤系数
        SpeedVariance = 0.1      // 速度浮动 ±10%
)

// BattleEngine 战斗引擎（无状态，线程安全）
type BattleEngine struct{}

func NewBattleEngine() *BattleEngine {
        return &BattleEngine{}
}

// Execute 执行完整战斗
func (e *BattleEngine) Execute(attackers, defenders []*model.BattleUnit) *model.BattleResult {
        startTime := time.Now()
        battleID := generateBattleID()

        // 初始化单位
        for _, u := range append(attackers, defenders...) {
                u.Alive = true
                u.Buffs = make([]*model.BuffEffect, 0)
                u.Debuffs = make([]*model.BuffEffect, 0)
        }

        result := &model.BattleResult{
                BattleID:    battleID,
                TotalDamage: make(map[int64]int64),
                Turns:       make([]model.BattleTurn, 0),
                Units:       make([]model.UnitResult, 0),
        }

        winner := 0

        // 最多 MaxTurns 回合
        for turn := 1; turn <= MaxTurns; turn++ {
                battleTurn := model.BattleTurn{
                        TurnNumber: turn,
                        Actions:    make([]model.BattleAction, 0),
                }

                // ── 构建行动队列（速度排序 + 浮动） ──
                actionQueue := e.buildActionQueue(attackers, defenders)

                // ── 依次执行每个单位的行动 ──
                for _, unit := range actionQueue {
                        if !unit.Alive {
                                continue
                        }

                        // 处理 Buff/Debuff 回合计时
                        e.processBuffTick(unit, &battleTurn)

                        if !unit.Alive {
                                continue // 可能被 DOT 击杀
                        }

                        // 选择目标
                        enemies := e.getAliveEnemies(unit, attackers, defenders)
                        allies := e.getAliveAllies(unit, attackers, defenders)
                        if len(enemies) == 0 {
                                break // 对方全灭
                        }

                        // 选择技能
                        useSkill := false
                        if unit.ActiveSkill != nil && unit.SkillCD <= 0 {
                                useSkill = true
                        }

                        // 执行行动
                        var actions []model.BattleAction
                        if useSkill {
                                actions = e.executeSkill(unit, unit.ActiveSkill, enemies, allies)
                                unit.SkillCD = unit.ActiveSkill.CD
                        } else {
                                actions = e.executeNormalAttack(unit, enemies)
                        }

                        // 累计CD
                        if unit.SkillCD > 0 {
                                unit.SkillCD--
                        }

                        battleTurn.Actions = append(battleTurn.Actions, actions...)

                        // 检查胜负
                        if len(e.getAliveEnemies(unit, attackers, defenders)) == 0 {
                                if e.isAttacker(unit, attackers) {
                                        winner = 1
                                } else {
                                        winner = 2
                                }
                                break
                        }
                }

                result.Turns = append(result.Turns, battleTurn)

                if winner != 0 {
                        break
                }

                // 回合结束：减少 Buff 持续时间（已在 processBuffTick 中处理）
        }

        // 超过最大回合 → 判断剩余HP
        if winner == 0 {
                attHP := e.totalHP(attackers)
                defHP := e.totalHP(defenders)
                if attHP > defHP {
                        winner = 1
                } else if defHP > attHP {
                        winner = 2
                } else {
                        winner = 2 // 平局算防守方赢
                }
        }

        result.Winner = winner
        result.TurnCount = len(result.Turns)

        // 汇总单位结果
        for _, u := range append(attackers, defenders...) {
                result.TotalDamage[u.UnitID] = u.TotalDamage
                result.Units = append(result.Units, model.UnitResult{
                        UnitID:      u.UnitID,
                        Name:        u.Name,
                        Faction:     u.Faction,
                        Alive:       u.Alive,
                        HPRemain:    u.CurrentHP,
                        MaxHP:       u.MaxHP,
                        TotalDamage: u.TotalDamage,
                        Kills:       u.Kills,
                })
        }

        result.Duration = time.Since(startTime).Milliseconds()
        return result
}

// ──────────────────────────────────────
// 行动队列
// ──────────────────────────────────────

func (e *BattleEngine) buildActionQueue(attackers, defenders []*model.BattleUnit) []*model.BattleUnit {
        allUnits := make([]*model.BattleUnit, 0, len(attackers)+len(defenders))
        for _, u := range append(attackers, defenders...) {
                if u.Alive {
                        // 速度浮动 ±10%
                        sp := float64(u.SPD)
                        variance := 1.0 + (randomFloat()-0.5)*2*SpeedVariance
                        u.SPD = int(sp * variance)
                        allUnits = append(allUnits, u)
                }
        }

        // 按速度降序
        sort.Slice(allUnits, func(i, j int) bool {
                return allUnits[i].SPD > allUnits[j].SPD
        })
        return allUnits
}

// ──────────────────────────────────────
// 普通攻击
// ──────────────────────────────────────

func (e *BattleEngine) executeNormalAttack(attacker *model.BattleUnit, enemies []*model.BattleUnit) []model.BattleAction {
        target := e.selectTarget(attacker, enemies)

        // 伤害计算
        isCrit := randomInt(10000) < (attacker.CritRate + CritBase)
        counterMul := model.CounterMultiplier(attacker.Faction, target.Faction)

        damage := e.calcDamage(attacker.ATK, target.DEF, 1.0, counterMul, isCrit)
        if isCrit {
                damage = int(float64(damage) * float64(attacker.CritDMG) / 10000.0)
        }

        target.CurrentHP -= damage
        attacker.TotalDamage += int64(damage)

        isCounter := model.IsCounter(attacker.Faction, target.Faction)

        action := model.BattleAction{
                ActorID:    attacker.UnitID,
                ActorName:  attacker.Name,
                TargetID:   target.UnitID,
                TargetName: target.Name,
                ActionType: "attack",
                SkillName:  attacker.NormalSkill.Name,
                Damage:     damage,
                IsCrit:     isCrit,
                IsCounter:  isCounter,
                HPAfter:    target.CurrentHP,
        }

        if target.CurrentHP <= 0 {
                target.CurrentHP = 0
                target.Alive = false
                attacker.Kills++
                action.ActionType = "attack_kill"
        }

        return []model.BattleAction{action}
}

// ──────────────────────────────────────
// 技能释放
// ──────────────────────────────────────

func (e *BattleEngine) executeSkill(caster *model.BattleUnit, skill *model.Skill, enemies, allies []*model.BattleUnit) []model.BattleAction {
        actions := make([]model.BattleAction, 0)

        switch skill.TargetType {
        case "single":
                target := e.selectTarget(caster, enemies)
                if target != nil {
                        actions = append(actions, e.applySkillToTarget(caster, skill, target, true)...)
                }

        case "enemy_all":
                for _, enemy := range enemies {
                        if enemy.Alive {
                                actions = append(actions, e.applySkillToTarget(caster, skill, enemy, true)...)
                        }
                }

        case "ally_lowest_hp":
                target := e.selectLowestHPAlly(caster, allies)
                if target != nil && skill.Special == "heal" {
                        actions = append(actions, e.applyHeal(caster, skill, target)...)
                }

        case "self":
                if skill.Special == "heal" {
                        actions = append(actions, e.applyHeal(caster, skill, caster)...)
                }
                // Buff
                for _, buffTpl := range skill.Buffs {
                        if !buffTpl.IsDebuff {
                                e.applyBuff(caster, caster, &buffTpl)
                        }
                }

        case "enemy_back":
                // 优先攻击后排（slot 3,4）
                back := make([]*model.BattleUnit, 0)
                front := make([]*model.BattleUnit, 0)
                for _, en := range enemies {
                        if en.Alive {
                                if en.Slot >= 3 {
                                        back = append(back, en)
                                } else {
                                        front = append(front, en)
                                }
                        }
                }
                targets := back
                if len(targets) == 0 {
                        targets = front
                }
                if len(targets) > 0 {
                        for _, t := range targets {
                                actions = append(actions, e.applySkillToTarget(caster, skill, t, true)...)
                        }
                }
        }

        // 对所有被攻击目标施加 Buff/Debuff
        for _, buffTpl := range skill.Buffs {
                if buffTpl.IsDebuff {
                        for _, enemy := range enemies {
                                if enemy.Alive {
                                        e.applyBuff(caster, enemy, &buffTpl)
                                }
                        }
                }
        }

        return actions
}

func (e *BattleEngine) applySkillToTarget(caster *model.BattleUnit, skill *model.Skill, target *model.BattleUnit, checkCounter bool) []model.BattleAction {
        actions := make([]model.BattleAction, 0)

        isCrit := randomInt(10000) < (caster.CritRate + CritBase)
        counterMul := 1.0
        if checkCounter {
                counterMul = model.CounterMultiplier(caster.Faction, target.Faction)
        }

        damage := e.calcDamage(caster.ATK, target.DEF, skill.DamageRatio, counterMul, isCrit)
        damage += skill.BaseDamage // 加上固定伤害
        if isCrit {
                damage = int(float64(damage) * float64(CritDMGBase) / 10000.0)
        }

        target.CurrentHP -= damage
        caster.TotalDamage += int64(damage)

        isCounter := model.IsCounter(caster.Faction, target.Faction)

        action := model.BattleAction{
                ActorID:    caster.UnitID,
                ActorName:  caster.Name,
                TargetID:   target.UnitID,
                TargetName: target.Name,
                ActionType: "skill",
                SkillName:  skill.Name,
                Damage:     damage,
                IsCrit:     isCrit,
                IsCounter:  isCounter,
                HPAfter:    target.CurrentHP,
        }

        if target.CurrentHP <= 0 {
                target.CurrentHP = 0
                target.Alive = false
                caster.Kills++
                action.ActionType = "skill_kill"
        }

        actions = append(actions, action)

        // 施加 Buff/Debuff
        for _, buffTpl := range skill.Buffs {
                e.applyBuff(caster, target, &buffTpl)
        }

        return actions
}

// ──────────────────────────────────────
// 治疗技能
// ──────────────────────────────────────

func (e *BattleEngine) applyHeal(caster *model.BattleUnit, skill *model.Skill, target *model.BattleUnit) []model.BattleAction {
        healAmount := int(float64(caster.ATK) * skill.HealRatio)
        if target.CurrentHP+healAmount > target.MaxHP {
                healAmount = target.MaxHP - target.CurrentHP
        }
        target.CurrentHP += healAmount

        return []model.BattleAction{{
                ActorID:    caster.UnitID,
                ActorName:  caster.Name,
                TargetID:   target.UnitID,
                TargetName: target.Name,
                ActionType: "heal",
                SkillName:  skill.Name,
                Heal:       healAmount,
                HPAfter:    target.CurrentHP,
        }}
}

// ──────────────────────────────────────
// Buff 系统
// ──────────────────────────────────────

func (e *BattleEngine) applyBuff(caster, target *model.BattleUnit, tpl *model.BuffTemplate) {
        effect := &model.BuffEffect{
                Type:     tpl.Type,
                Value:    tpl.Value,
                Remain:   tpl.Duration,
                SourceID: caster.UnitID,
                IsDebuff: tpl.IsDebuff,
        }

        // 应用属性修改
        switch tpl.Type {
        case "atk_up":
                target.ATK = int(float64(target.ATK) * (1 + tpl.Value))
                target.Buffs = append(target.Buffs, effect)
        case "def_up":
                target.DEF = int(float64(target.DEF) * (1 + tpl.Value))
                target.Buffs = append(target.Buffs, effect)
        case "spd_up":
                target.SPD = int(float64(target.SPD) * (1 + tpl.Value))
                target.Buffs = append(target.Buffs, effect)
        case "atk_down":
                target.ATK = int(float64(target.ATK) * (1 - tpl.Value))
                target.Debuffs = append(target.Debuffs, effect)
        case "def_down":
                target.DEF = int(float64(target.DEF) * (1 - tpl.Value))
                target.Debuffs = append(target.Debuffs, effect)
        case "spd_down":
                target.SPD = int(float64(target.SPD) * (1 - tpl.Value))
                target.Debuffs = append(target.Debuffs, effect)
        case "dot": // 持续伤害（在 tick 中处理）
                target.Debuffs = append(target.Debuffs, effect)
        case "hot": // 持续治疗
                target.Buffs = append(target.Buffs, effect)
        case "stun": // 眩晕
                target.Debuffs = append(target.Debuffs, effect)
        case "shield": // 护盾（简化为增加 DEF）
                target.Buffs = append(target.Buffs, effect)
        }
}

func (e *BattleEngine) processBuffTick(unit *model.BattleUnit, turn *model.BattleTurn) {
        processEffect := func(effects *[]*model.BuffEffect, isDebuff bool) {
                newEffects := make([]*model.BuffEffect, 0)
                for _, eff := range *effects {
                        eff.Remain--

                        // DOT: 持续伤害
                        if eff.Type == "dot" {
                                dotDmg := int(float64(unit.MaxHP) * eff.Value)
                                unit.CurrentHP -= dotDmg
                                turn.Actions = append(turn.Actions, model.BattleAction{
                                        ActorID:    eff.SourceID,
                                        TargetID:   unit.UnitID,
                                        TargetName: unit.Name,
                                        ActionType: "dot",
                                        Damage:     dotDmg,
                                        HPAfter:    unit.CurrentHP,
                                })
                                if unit.CurrentHP <= 0 {
                                        unit.CurrentHP = 0
                                        unit.Alive = false
                                }
                        }

                        // HOT: 持续治疗
                        if eff.Type == "hot" {
                                healAmt := int(float64(unit.MaxHP) * eff.Value)
                                if unit.CurrentHP+healAmt > unit.MaxHP {
                                        healAmt = unit.MaxHP - unit.CurrentHP
                                }
                                unit.CurrentHP += healAmt
                                turn.Actions = append(turn.Actions, model.BattleAction{
                                        ActorID:  unit.UnitID,
                                        TargetID: unit.UnitID,
                                        ActionType: "hot",
                                        Heal:    healAmt,
                                        HPAfter: unit.CurrentHP,
                                })
                        }

                        // Stun: 眩晕中跳过行动（在这里只做计时，实际跳过在上层处理）
                        // 属性 Buff 在过期时恢复（简化处理：到期自动清除）

                        if eff.Remain > 0 {
                                newEffects = append(newEffects, eff)
                        }
                }
                *effects = newEffects
        }

        processEffect(&unit.Buffs, false)
        processEffect(&unit.Debuffs, true)
}

// ──────────────────────────────────────
// 伤害计算
// ──────────────────────────────────────

func (e *BattleEngine) calcDamage(atk, def int, ratio, counterMul float64, isCrit bool) int {
        // 基础伤害 = ATK * 技能倍率
        baseDmg := float64(atk) * ratio

        // 减伤 = DEF * 减伤系数
        reduction := float64(def) * DefReduction

        // 最终伤害（确保最低1）
        damage := baseDmg - reduction
        damage = math.Max(damage, 1)

        // 阵营克制加成
        damage *= counterMul

        // 浮动 ±5%
        damage *= 0.95 + randomFloat()*0.1

        return int(math.Round(damage))
}

// ──────────────────────────────────────
// 目标选择
// ──────────────────────────────────────

func (e *BattleEngine) selectTarget(attacker *model.BattleUnit, enemies []*model.BattleUnit) *model.BattleUnit {
        if len(enemies) == 0 {
                return nil
        }
        // 刺客优先攻击血量最低的
        if attacker.Role == "assassin" {
                sort.Slice(enemies, func(i, j int) bool {
                        return enemies[i].CurrentHP < enemies[j].CurrentHP
                })
                return enemies[0]
        }
        // 其他优先攻击对面同位置，否则随机前排
        front := make([]*model.BattleUnit, 0)
        back := make([]*model.BattleUnit, 0)
        for _, en := range enemies {
                if en.Slot < 3 {
                        front = append(front, en)
                } else {
                        back = append(back, en)
                }
        }
        if len(front) > 0 {
                return front[randomInt(len(front))]
        }
        return enemies[randomInt(len(enemies))]
}

func (e *BattleEngine) selectLowestHPAlly(self *model.BattleUnit, allies []*model.BattleUnit) *model.BattleUnit {
        var target *model.BattleUnit
        minHP := math.MaxInt32
        for _, ally := range allies {
                if ally.Alive && ally.CurrentHP < minHP && ally.UnitID != self.UnitID {
                        minHP = ally.CurrentHP
                        target = ally
                }
        }
        if target == nil && len(allies) > 0 {
                // 只能治疗自己
                return self
        }
        return target
}

// ──────────────────────────────────────
// 工具函数
// ──────────────────────────────────────

func (e *BattleEngine) getAliveEnemies(unit *model.BattleUnit, attackers, defenders []*model.BattleUnit) []*model.BattleUnit {
        if e.isAttacker(unit, attackers) {
                return filterAlive(defenders)
        }
        return filterAlive(attackers)
}

func (e *BattleEngine) getAliveAllies(unit *model.BattleUnit, attackers, defenders []*model.BattleUnit) []*model.BattleUnit {
        if e.isAttacker(unit, attackers) {
                return filterAlive(attackers)
        }
        return filterAlive(defenders)
}

func (e *BattleEngine) isAttacker(unit *model.BattleUnit, attackers []*model.BattleUnit) bool {
        for _, a := range attackers {
                if a.UnitID == unit.UnitID {
                        return true
                }
        }
        return false
}

func (e *BattleEngine) totalHP(units []*model.BattleUnit) int {
        total := 0
        for _, u := range units {
                if u.Alive {
                        total += u.CurrentHP
                }
        }
        return total
}

func filterAlive(units []*model.BattleUnit) []*model.BattleUnit {
        alive := make([]*model.BattleUnit, 0)
        for _, u := range units {
                if u.Alive {
                        alive = append(alive, u)
                }
        }
        return alive
}

func generateBattleID() string {
        b := make([]byte, 8)
        _, _ = rand.Read(b)
        return fmt.Sprintf("%x-%d", b, time.Now().UnixNano())
}

func randomInt(max int) int {
        n, _ := rand.Int(rand.Reader, big.NewInt(int64(max)))
        return int(n.Int64())
}

func randomFloat() float64 {
        n, _ := rand.Int(rand.Reader, big.NewInt(10000))
        return float64(n.Int64()) / 10000.0
}

// SerializeResult 序列化战斗结果为 JSON
func SerializeResult(result *model.BattleResult) (string, error) {
        data, err := json.Marshal(result)
        if err != nil {
                return "", err
        }
        return string(data), nil
}

// ParseSkillConfig 解析技能配置 JSON
func ParseSkillConfig(jsonStr string) (*model.Skill, error) {
        var skill model.Skill
        if err := json.Unmarshal([]byte(jsonStr), &skill); err != nil {
                return nil, fmt.Errorf("parse skill config: %w", err)
        }
        return &skill, nil
}

var _ = sync.Mutex{}
