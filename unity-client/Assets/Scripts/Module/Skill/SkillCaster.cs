// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Skill System
// =============================================================================
// 描述：技能释放系统 —— 完整的技能释放流程控制器。
//       管理 冷却系统 → 目标选择 → 释放动画 → 弹道 → 命中 → 伤害结算 → Buff/Debuff。
//       与 BattleManager 集成，驱动战斗中的技能释放逻辑。
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Jiuzhou.Zhengding.Module.Skill
{
    // ============================================================
    // 技能释放上下文 —— 技能释放过程中的所有运行时数据
    // ============================================================

    /// <summary>
    /// 技能释放上下文（一次技能释放的完整数据包）
    /// </summary>
    public class SkillCastContext
    {
        // ── 技能信息 ──
        public int SkillId;
        public string SkillName;
        public ElementType Element;
        public SkillCategory Category;
        public SkillTargetType TargetType;
        public int Rarity;
        public float DamageRatio;
        public int BaseDamage;
        public float HealRatio;
        public int MaxCooldown;
        public string SpecialEffect;  // 特殊效果标签: burn/freeze/stun/poison/bleed/shield

        // ── 施法者 ──
        public Transform CasterTransform;
        public SkillAnimator CasterAnimator;
        public int CasterCardId;
        public string CasterName;
        public int CasterAttack;
        public int CasterLevel;

        // ── 目标 ──
        public List<Transform> TargetTransforms = new List<Transform>();
        public List<SkillAnimator> TargetAnimators = new List<SkillAnimator>();
        public List<HitReactionController> TargetHitControllers = new List<HitReactionController>();
        public List<int> TargetCardIds = new List<int>();
        public List<string> TargetNames = new List<string>();

        // ── 结算数据（释放后填充）──
        public List<SkillHitResult> HitResults = new List<SkillHitResult>();
        public bool IsCritical;
        public int TotalDamage;
        public int TotalHeal;
        public float CastTime;
        public bool IsBlocked;
        public bool IsDodged;

        // ── VFX 配置 ──
        public SkillVFXProfile VFXProfile;
    }

    /// <summary>
    /// 技能命中结算结果
    /// </summary>
    [Serializable]
    public class SkillHitResult
    {
        public int TargetCardId;
        public string TargetName;
        public int Damage;
        public int Heal;
        public bool IsCritical;
        public bool IsBlocked;
        public bool IsDodged;
        public string SpecialEffectApplied;  // 命中时附加的特殊效果
        public bool IsDead;
    }

    /// <summary>
    /// 技能释放状态
    /// </summary>
    public enum CastState
    {
        Idle,           // 空闲
        Selecting,      // 选择目标
        Casting,        // 施法中（前摇）
        Projectiling,   // 弹道飞行中
        Hitting,        // 命中结算中
        Cooldown        // 冷却中
    }

    // ============================================================
    // 技能冷却数据
    // ============================================================

    /// <summary>
    /// 单个技能的冷却追踪器
    /// </summary>
    public class SkillCooldownTracker
    {
        public int SkillId;
        public int CurrentCooldown;
        public int MaxCooldown;
        public bool IsReady => CurrentCooldown <= 0;

        public void ReduceCooldown(int amount = 1)
        {
            CurrentCooldown = Mathf.Max(0, CurrentCooldown - amount);
        }

        public void ResetCooldown()
        {
            CurrentCooldown = MaxCooldown;
        }

        public float CooldownPercent => MaxCooldown > 0 ? (float)CurrentCooldown / MaxCooldown : 0f;
    }

    // ============================================================
    // 技能释放系统
    // ============================================================

    /// <summary>
    /// 技能释放系统 —— 战斗中技能的完整释放流程
    /// <para>流程: 选择目标 → 前摇 → 弹道 → 命中 → 伤害结算 → 后摇 → 冷却</para>
    /// </summary>
    public class SkillCaster : MonoBehaviour
    {
        private static SkillCaster _instance;
        public static SkillCaster Instance
        {
            get
            {
                if (_instance == null)
                {
                    var go = new GameObject("SkillCaster");
                    _instance = go.AddComponent<SkillCaster>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }

        // ── 状态 ──
        public CastState CurrentState { get; private set; } = CastState.Idle;
        public SkillCastContext ActiveContext { get; private set; }

        // ── 冷却追踪 ──
        private readonly Dictionary<int, SkillCooldownTracker> _cooldownTrackers =
            new Dictionary<int, SkillCooldownTracker>();

        // ── 配置 ──
        [Header("施法配置")]
        [SerializeField] private float autoCastThreshold = 0.5f;    // 自动释放概率
        [SerializeField] private bool enableAutoCast = true;
        [SerializeField] private float castCancelWindow = 0.2f;     // 施法取消窗口

        // ── 事件 ──
        /// <summary>技能释放开始</summary>
        public event Action<SkillCastContext> OnSkillCastStart;
        /// <summary>技能命中</summary>
        public event Action<SkillCastContext> OnSkillHit;
        /// <summary>技能释放完成</summary>
        public event Action<SkillCastContext> OnSkillCastComplete;
        /// <summary>技能冷却更新</summary>
        public event Action<int, int, int> OnCooldownUpdate; // skillId, current, max
        /// <summary>伤害数字显示请求</summary>
        public event Action<Transform, int, bool, ElementType> OnShowDamageNumber;
        /// <summary>治疗数字显示请求</summary>
        public event Action<Transform, int, ElementType> OnShowHealNumber;

        private Coroutine _castCoroutine;

        private void Awake()
        {
            if (_instance != null && _instance != this) { Destroy(gameObject); return; }
            _instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void OnDestroy()
        {
            if (_instance == this) _instance = null;
        }

        // ============================================================
        // 技能释放 API
        // ============================================================

        /// <summary>
        /// 释放技能 —— 主入口
        /// </summary>
        /// <param name="context">技能释放上下文</param>
        /// <param name="battleSpeed">战斗速度倍率</param>
        public void CastSkill(SkillCastContext context, float battleSpeed = 1f)
        {
            if (CurrentState != CastState.Idle)
            {
                Debug.LogWarning("[SkillCaster] 正在施法中，无法释放新技能");
                return;
            }

            if (context == null || context.CasterTransform == null)
            {
                Debug.LogError("[SkillCaster] 无效的释放上下文");
                return;
            }

            ActiveContext = context;

            // 检查冷却
            if (!IsSkillReady(context.SkillId))
            {
                Debug.Log($"[SkillCaster] 技能 {context.SkillName} 冷却中");
                return;
            }

            // 设置冷却
            SetCooldown(context.SkillId, context.MaxCooldown);

            // 开始施法流程
            _castCoroutine = StartCoroutine(SkillCastSequence(context, battleSpeed));
        }

        /// <summary>
        /// 自动释放决策 —— AI 自动判断是否使用技能
        /// </summary>
        public bool ShouldAutoCast(int skillId, float currentHpPercent)
        {
            if (!enableAutoCast) return false;
            if (!IsSkillReady(skillId)) return false;

            // HP低于30%时更倾向于使用治疗/防御技能
            if (currentHpPercent < 0.3f) return UnityEngine.Random.value < 0.8f;

            return UnityEngine.Random.value < autoCastThreshold;
        }

        /// <summary>
        /// 减少所有技能冷却（回合结束调用）
        /// </summary>
        public void ReduceAllCooldowns(int amount = 1)
        {
            foreach (var tracker in _cooldownTrackers.Values)
            {
                tracker.ReduceCooldown(amount);
                OnCooldownUpdate?.Invoke(tracker.SkillId, tracker.CurrentCooldown, tracker.MaxCooldown);
            }
        }

        /// <summary>
        /// 检查技能是否就绪
        /// </summary>
        public bool IsSkillReady(int skillId)
        {
            if (_cooldownTrackers.TryGetValue(skillId, out var tracker))
                return tracker.IsReady;
            return true; // 未追踪的技能默认就绪
        }

        /// <summary>
        /// 设置技能冷却
        /// </summary>
        public void SetCooldown(int skillId, int cooldown)
        {
            if (!_cooldownTrackers.ContainsKey(skillId))
            {
                _cooldownTrackers[skillId] = new SkillCooldownTracker
                {
                    SkillId = skillId,
                    MaxCooldown = cooldown
                };
            }
            _cooldownTrackers[skillId].ResetCooldown();
            OnCooldownUpdate?.Invoke(skillId, cooldown, cooldown);
        }

        /// <summary>
        /// 获取技能冷却信息
        /// </summary>
        public SkillCooldownTracker GetCooldown(int skillId)
        {
            return _cooldownTrackers.TryGetValue(skillId, out var tracker) ? tracker : null;
        }

        /// <summary>
        /// 目标选择 —— 根据目标类型选择目标列表
        /// </summary>
        public List<Transform> SelectTargets(SkillTargetType targetType,
            Transform caster, List<Transform> allies, List<Transform> enemies)
        {
            var targets = new List<Transform>();

            switch (targetType)
            {
                case SkillTargetType.SingleEnemy:
                    targets.Add(GetClosestEnemy(caster, enemies));
                    break;

                case SkillTargetType.AllEnemies:
                    targets.AddRange(enemies);
                    break;

                case SkillTargetType.Self:
                    targets.Add(caster);
                    break;

                case SkillTargetType.SingleAlly:
                    targets.Add(GetLowestHpAlly(allies));
                    break;

                case SkillTargetType.AllAllies:
                    targets.AddRange(allies);
                    break;

                case SkillTargetType.RandomEnemy:
                    if (enemies.Count > 0)
                        targets.Add(enemies[UnityEngine.Random.Range(0, enemies.Count)]);
                    break;

                case SkillTargetType.FrontRow:
                    int frontCount = Mathf.Min(3, enemies.Count);
                    for (int i = 0; i < frontCount; i++) targets.Add(enemies[i]);
                    break;

                case SkillTargetType.BackRow:
                    int backStart = Mathf.Max(0, enemies.Count - 2);
                    for (int i = backStart; i < enemies.Count; i++) targets.Add(enemies[i]);
                    break;

                case SkillTargetType.CrossArea:
                    // 十字范围：选中间目标+上下左右
                    if (enemies.Count > 0)
                    {
                        targets.Add(enemies[0]);
                        if (enemies.Count > 1) targets.Add(enemies[1]);
                        if (enemies.Count > 2) targets.Add(enemies[2]);
                    }
                    break;

                case SkillTargetType.RowLine:
                    targets.AddRange(enemies);
                    break;
            }

            // 移除 null 目标
            targets.RemoveAll(t => t == null);
            return targets;
        }

        /// <summary>
        /// 取消当前施法
        /// </summary>
        public void CancelCast()
        {
            if (_castCoroutine != null)
            {
                StopCoroutine(_castCoroutine);
                _castCoroutine = null;
            }

            CurrentState = CastState.Idle;
            ActiveContext?.CasterAnimator?.InterruptAnimation();
            ActiveContext = null;
        }

        // ============================================================
        // 技能释放主流程
        // ============================================================

        private IEnumerator SkillCastSequence(SkillCastContext ctx, float battleSpeed)
        {
            float spd = Mathf.Max(battleSpeed, 0.1f);

            // ── 阶段1: 前摇 + 施法动画 ──
            SetState(CastState.Casting);
            OnSkillCastStart?.Invoke(ctx);

            // 设置技能动画数据
            var animData = new SkillAnimEventData
            {
                SkillId = ctx.SkillId,
                Element = ctx.Element,
                Rarity = ctx.Rarity,
                SkillName = ctx.SkillName,
                CasterTransform = ctx.CasterTransform,
                IsCritical = ctx.IsCritical
            };

            if (ctx.TargetTransforms.Count > 0)
                animData.TargetTransform = ctx.TargetTransforms[0];

            // 播放施法动画
            ctx.CasterAnimator?.PlayCastAnimation(animData, spd);

            // 播放施法音效
            SkillAudioController.Instance?.PlayElementSkillSFX(ctx.Element,
                ctx.CasterTransform.position, true);

            // 施法粒子
            if (ctx.VFXProfile?.CastParticle.IsValid == true)
            {
                SkillVFXManager.Instance?.PlayEffectFollow(
                    ctx.VFXProfile.CastParticle.ParticlePrefab,
                    ctx.CasterTransform,
                    ctx.VFXProfile.CastParticle.PositionOffset,
                    0f, ctx.VFXProfile.CastParticle.Scale, true, VFXLayer.Body);
            }

            // 地面特效（法阵）
            if (ctx.VFXProfile?.GroundParticle.IsValid == true && ctx.TargetTransforms.Count > 0)
            {
                Vector3 groundPos = ctx.TargetTransforms[0].position;
                groundPos.y = 0f;
                SkillVFXManager.Instance?.PlayEffect(
                    ctx.VFXProfile.GroundParticle.ParticlePrefab,
                    groundPos, Quaternion.identity,
                    ctx.CastTime / spd, ctx.VFXProfile.GroundParticle.Scale, true, VFXLayer.Ground);
            }

            // 等待施法前摇
            yield return new WaitForSeconds(0.3f / spd);

            // ── 阶段2: 弹道飞行 ──
            if (ctx.VFXProfile?.HasProjectile == true && ctx.TargetTransforms.Count > 0)
            {
                SetState(CastState.Projectiling);

                Vector3 targetPos = ctx.TargetTransforms[0].position;
                float travelTime = Vector3.Distance(ctx.CasterTransform.position, targetPos) /
                                   Mathf.Max(ctx.VFXProfile.ProjectileSpeed, 1f);

                // 弹道粒子
                var trailPrefab = ctx.VFXProfile.TrailParticle?.ParticlePrefab;
                SkillVFXManager.Instance?.PlayProjectileWithTrail(
                    ctx.VFXProfile.CastParticle?.ParticlePrefab ?? trailPrefab,
                    trailPrefab,
                    ctx.CasterTransform.position, targetPos,
                    ctx.VFXProfile.ProjectileSpeed, 1f, null, VFXLayer.Air);

                yield return new WaitForSeconds(travelTime / spd);
            }

            // ── 阶段3: 命中 + 伤害结算 ──
            SetState(CastState.Hitting);
            OnSkillHit?.Invoke(ctx);

            // 伤害计算
            CalculateDamage(ctx);

            // 对每个目标播放命中效果
            for (int i = 0; i < ctx.TargetTransforms.Count; i++)
            {
                if (i >= ctx.HitResults.Count) break;
                var target = ctx.TargetTransforms[i];
                var result = ctx.HitResults[i];

                if (result.IsDodged)
                {
                    // 闪避
                    if (i < ctx.TargetAnimators.Count)
                        ctx.TargetAnimators[i]?.PlayDodgeAnimation();
                    continue;
                }

                // 受击动画
                if (i < ctx.TargetAnimators.Count)
                    ctx.TargetAnimators[i]?.PlayHitReaction(result.IsCritical);

                // 击退
                if (i < ctx.TargetHitControllers.Count)
                {
                    ctx.TargetHitControllers[i]?.ReactToHit(
                        ctx.CasterTransform.position,
                        result.IsCritical,
                        ctx.TargetType == SkillTargetType.AllEnemies);
                }

                // 命中粒子
                if (ctx.VFXProfile?.HitParticle.IsValid == true)
                {
                    SkillVFXManager.Instance?.PlayEffect(
                        ctx.VFXProfile.HitParticle.ParticlePrefab,
                        target.position + ctx.VFXProfile.HitParticle.PositionOffset,
                        Quaternion.LookRotation(ctx.CasterTransform.position - target.position),
                        1f / spd, ctx.VFXProfile.HitParticle.Scale, true,
                        ctx.VFXProfile.HitParticle.Layer);
                }

                // 伤害数字
                if (result.Damage > 0)
                {
                    OnShowDamageNumber?.Invoke(target, result.Damage, result.IsCritical, ctx.Element);
                }

                // 治疗数字
                if (result.Heal > 0)
                {
                    OnShowHealNumber?.Invoke(target, result.Heal, ctx.Element);
                }

                // Buff/Debuff 特效
                if (!string.IsNullOrEmpty(result.SpecialEffectApplied) && ctx.VFXProfile != null)
                {
                    foreach (var buff in ctx.VFXProfile.AppliedBuffs)
                    {
                        if (buff.TickParticle.IsValid)
                        {
                            SkillVFXManager.Instance?.PlayEffectFollow(
                                buff.TickParticle.ParticlePrefab,
                                target, buff.AttachOffset,
                                3f / spd, buff.TickParticle.Scale, true, buff.TickParticle.Layer);
                        }
                    }
                }

                // 每个目标之间间隔
                if (ctx.TargetTransforms.Count > 1)
                    yield return new WaitForSeconds(0.1f / spd);
            }

            // 命中音效
            if (ctx.TargetTransforms.Count > 0)
            {
                SkillAudioController.Instance?.PlayRarityHitSFX(ctx.Rarity,
                    ctx.TargetTransforms[0].position, ctx.IsCritical);

                if (ctx.IsCritical)
                    SkillAudioController.Instance?.PlayCriticalSFX();
            }

            // 屏幕效果
            if (ctx.VFXProfile != null)
            {
                if (ctx.VFXProfile.ScreenShake != ShakeIntensity.None)
                    ScreenEffectManager.Instance?.Shake(ctx.VFXProfile.ScreenShake, ctx.VFXProfile.ShakeDuration / spd);

                if (ctx.VFXProfile.SlowMotionScale > 0f)
                    ScreenEffectManager.Instance?.SlowMotion(ctx.VFXProfile.SlowMotionScale, ctx.VFXProfile.SlowMotionDuration / spd);

                if (ctx.VFXProfile.FlashColor.a > 0.01f)
                    ScreenEffectManager.Instance?.Flash(ctx.VFXProfile.FlashColor, ctx.VFXProfile.FlashDuration / spd);
            }

            // 等待后摇
            yield return new WaitForSeconds(0.2f / spd);

            // ── 完成 ──
            SetState(CastState.Idle);
            OnSkillCastComplete?.Invoke(ctx);
            ActiveContext = null;
        }

        // ============================================================
        // 伤害计算
        // ============================================================

        private void CalculateDamage(SkillCastContext ctx)
        {
            ctx.HitResults.Clear();
            ctx.TotalDamage = 0;
            ctx.TotalHeal = 0;

            bool anyCritical = false;

            for (int i = 0; i < ctx.TargetTransforms.Count; i++)
            {
                var result = new SkillHitResult
                {
                    TargetCardId = i < ctx.TargetCardIds.Count ? ctx.TargetCardIds[i] : -1,
                    TargetName = i < ctx.TargetNames.Count ? ctx.TargetNames[i] : "未知",
                    IsDead = false
                };

                // 暴击判定 (SSR=15%, SR=12%, R=10%)
                float critChance = ctx.Rarity switch
                {
                    5 => 0.15f,
                    4 => 0.12f,
                    _ => 0.10f
                };
                result.IsCritical = UnityEngine.Random.value < critChance;
                if (result.IsCritical) anyCritical = true;

                // 闪避判定 (5%)
                result.IsDodged = UnityEngine.Random.value < 0.05f;
                if (result.IsDodged)
                {
                    ctx.HitResults.Add(result);
                    continue;
                }

                // 格挡判定 (3%)
                result.IsBlocked = UnityEngine.Random.value < 0.03f;

                // 伤害计算
                float baseDamage = ctx.BaseDamage + ctx.CasterAttack * ctx.DamageRatio;
                baseDamage *= UnityEngine.Random.Range(0.9f, 1.1f); // 随机浮动

                if (result.IsCritical)
                    baseDamage *= 1.5f; // 暴击倍率

                if (result.IsBlocked)
                    baseDamage *= 0.5f; // 格挡减伤

                // AOE衰减 (多目标时伤害减少)
                if (ctx.TargetTransforms.Count > 1)
                    baseDamage *= 0.85f;

                result.Damage = Mathf.Max(1, Mathf.RoundToInt(baseDamage));
                ctx.TotalDamage += result.Damage;

                // 治疗计算
                if (ctx.HealRatio > 0f)
                {
                    result.Heal = Mathf.RoundToInt(ctx.CasterAttack * ctx.HealRatio);
                    ctx.TotalHeal += result.Heal;
                }

                // 特殊效果
                result.SpecialEffectApplied = ctx.SpecialEffect;

                ctx.HitResults.Add(result);
            }

            ctx.IsCritical = anyCritical;
        }

        // ============================================================
        // 目标选择辅助
        // ============================================================

        private Transform GetClosestEnemy(Transform caster, List<Transform> enemies)
        {
            Transform closest = null;
            float minDist = float.MaxValue;

            foreach (var enemy in enemies)
            {
                if (enemy == null) continue;
                float dist = Vector3.Distance(caster.position, enemy.position);
                if (dist < minDist)
                {
                    minDist = dist;
                    closest = enemy;
                }
            }

            return closest;
        }

        private Transform GetLowestHpAlly(List<Transform> allies)
        {
            // 简单实现：返回第一个友方（实际应根据 HP 百分比排序）
            return allies.Count > 0 ? allies[0] : null;
        }

        // ============================================================
        // 工具方法
        // ============================================================

        private void SetState(CastState state)
        {
            CurrentState = state;
        }

        /// <summary>重置所有冷却</summary>
        public void ResetAllCooldowns()
        {
            foreach (var tracker in _cooldownTrackers.Values)
            {
                tracker.CurrentCooldown = 0;
                OnCooldownUpdate?.Invoke(tracker.SkillId, 0, tracker.MaxCooldown);
            }
        }

        /// <summary>清除冷却追踪</summary>
        public void ClearCooldownTrackers()
        {
            _cooldownTrackers.Clear();
        }
    }
}
