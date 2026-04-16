// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Skill System
// =============================================================================
// 描述：Buff/Debuff 视觉效果系统 —— 管理角色身上的状态效果可视化。
//       包括持续粒子特效（燃烧/冰冻/中毒/护盾等）、状态图标UI、叠加层数显示。
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace Jiuzhou.Zhengding.Module.Skill
{
    // ============================================================
    // Buff 类型枚举
    // ============================================================

    /// <summary>
    /// Buff/Debuff 类型
    /// </summary>
    public enum BuffType
    {
        // ── 增益 Buff ──
        AttackUp,       // 攻击力提升
        DefenseUp,      // 防御力提升
        SpeedUp,        // 速度提升
        Shield,         // 护盾
        HealOverTime,   // 持续恢复
        CritUp,         // 暴击率提升
        DamageImmune,   // 无敌

        // ── 减益 Debuff ──
        AttackDown,     // 攻击力降低
        DefenseDown,    // 防御力降低
        SpeedDown,      // 速度降低
        Burn,           // 燃烧
        Freeze,         // 冻结
        Stun,           // 眩晕
        Poison,         // 中毒
        Bleed,          // 流血
        Silence,        // 沉默（无法释放技能）
    }

    // ============================================================
    // Buff 数据
    // ============================================================

    /// <summary>
    /// Buff 实例 —— 角色身上的一个状态效果
    /// </summary>
    public class BuffInstance
    {
        public int Id;
        public BuffType Type;
        public string Name;
        public bool IsBuff;        // true=增益, false=减益
        public int Stacks;         // 叠加层数
        public int MaxStacks;      // 最大层数
        public float Duration;     // 持续时间（秒）
        public float TickInterval; // Tick间隔（秒）
        public float Value;        // 效果值（百分比或固定值）
        public int SourceSkillId;  // 来源技能ID
        public int SourceCardId;   // 来源卡牌ID

        // ── 运行时状态 ──
        public float RemainingTime;
        public float TickTimer;
        public bool IsActive;
        public VFXHandle ActiveVFXHandle;
        public GameObject ActiveIconUI;

        public float DurationPercent => Duration > 0 ? RemainingTime / Duration : 0f;
    }

    // ============================================================
    // Buff 视觉配置
    // ============================================================

    /// <summary>
    /// Buff 默认视觉配置表
    /// </summary>
    [CreateAssetMenu(fileName = "BuffVFXTable", menuName = "九州争鼎/技能/Buff视觉配置")]
    public class BuffVFXTable : ScriptableObject
    {
        [Serializable]
        public class BuffVisualEntry
        {
            public BuffType Type;
            public string BuffName;
            public bool IsBuff;
            public Color TintColor;
            public string ParticlePath;
            public Sprite Icon;
            public float ParticleScale = 1f;
            public Vector3 AttachOffset = new Vector3(0f, 2f, 0f);
            public float ShakeOnApply = 0.2f;
        }

        [SerializeField] private List<BuffVisualEntry> entries = new List<BuffVisualEntry>();

        public BuffVisualEntry GetEntry(BuffType type)
        {
            return entries.Find(e => e.Type == type);
        }

        public Color GetBuffColor(BuffType type)
        {
            var entry = GetEntry(type);
            return entry?.TintColor ?? Color.white;
        }
    }

    // ============================================================
    // Buff 可视化管理器
    // ============================================================

    /// <summary>
    /// Buff 可视化管理器 —— 管理角色身上所有 Buff/Debuff 的视觉表现
    /// <para>挂载到英雄角色上，管理该角色的所有状态效果</para>
    /// </summary>
    public class BuffVisualizer : MonoBehaviour
    {
        // ── 配置 ──
        [Header("Buff 配置")]
        [SerializeField] private BuffVFXTable vfxTable;
        [SerializeField] private Transform buffAttachPoint;    // Buff 粒子挂载点
        [SerializeField] private Transform iconUIParent;      // Buff 图标 UI 父节点

        [Header("图标配置")]
        [SerializeField] private GameObject buffIconPrefab;
        [SerializeField] private Vector2 iconStartOffset = new Vector2(-120f, 30f);
        [SerializeField] private float iconSpacing = 30f;
        [SerializeField] private int maxVisibleIcons = 6;

        // ── 运行时数据 ──
        private readonly Dictionary<int, BuffInstance> _activeBuffs = new Dictionary<int, BuffInstance>();
        private readonly List<BuffInstance> _sortedBuffs = new List<BuffInstance>();
        private int _nextBuffId = 1;
        private Coroutine _tickCoroutine;

        // ── 事件 ──
        public event Action<BuffInstance> OnBuffApplied;
        public event Action<BuffInstance> OnBuffRemoved;
        public event Action<BuffInstance> OnBuffTick;
        public event Action<BuffType, int> OnStacksChanged;

        // ── 引用 ──
        private SkillAnimator _skillAnimator;
        private HitReactionController _hitController;

        private void Awake()
        {
            _skillAnimator = GetComponent<SkillAnimator>();
            _hitController = GetComponent<HitReactionController>();

            if (buffAttachPoint == null)
                buffAttachPoint = transform;
        }

        private void OnDestroy()
        {
            if (_tickCoroutine != null) StopCoroutine(_tickCoroutine);
            RemoveAllBuffs();
        }

        // ============================================================
        // Buff 管理 API
        // ============================================================

        /// <summary>
        /// 添加 Buff/Debuff
        /// </summary>
        public BuffInstance AddBuff(BuffType type, float duration, int stacks = 1,
            float value = 0f, int sourceSkillId = 0, int sourceCardId = 0)
        {
            // 检查是否已存在同类 Buff（可叠加）
            BuffInstance existing = GetBuffByType(type);

            if (existing != null)
            {
                // 刷新持续时间
                existing.RemainingTime = Mathf.Max(existing.RemainingTime, duration);

                // 增加层数
                if (stacks > 0)
                {
                    existing.Stacks = Mathf.Min(existing.Stacks + stacks, existing.MaxStacks);
                    OnStacksChanged?.Invoke(type, existing.Stacks);
                }

                // 叠加特效
                PlayStackEffect(existing);

                return existing;
            }

            // 创建新 Buff
            var visualEntry = vfxTable?.GetEntry(type);
            var buff = new BuffInstance
            {
                Id = _nextBuffId++,
                Type = type,
                Name = visualEntry?.BuffName ?? type.ToString(),
                IsBuff = visualEntry?.IsBuff ?? IsBuffType(type),
                Stacks = stacks,
                MaxStacks = GetMaxStacks(type),
                Duration = duration,
                RemainingTime = duration,
                TickInterval = GetTickInterval(type),
                Value = value,
                SourceSkillId = sourceSkillId,
                SourceCardId = sourceCardId,
                TickTimer = 0f,
                IsActive = true
            };

            _activeBuffs[buff.Id] = buff;

            // 播放添加特效
            PlayApplyEffect(buff, visualEntry);

            // 创建持续粒子
            if (visualEntry != null && !string.IsNullOrEmpty(visualEntry.ParticlePath))
            {
                var particlePrefab = Resources.Load<GameObject>(visualEntry.ParticlePath);
                if (particlePrefab != null)
                {
                    Vector3 offset = visualEntry.AttachOffset;
                    buff.ActiveVFXHandle = SkillVFXManager.Instance?.PlayEffectFollow(
                        particlePrefab, buffAttachPoint, offset,
                        0f, visualEntry.ParticleScale, true, VFXLayer.Body);
                }
            }

            // 创建图标
            CreateBuffIcon(buff, visualEntry);

            // 更新角色动画状态
            UpdateAnimatorStates();

            // 启动 Tick 协程
            if (_tickCoroutine == null)
                _tickCoroutine = StartCoroutine(BuffTickRoutine());

            OnBuffApplied?.Invoke(buff);

            return buff;
        }

        /// <summary>
        /// 移除指定类型的 Buff
        /// </summary>
        public bool RemoveBuff(BuffType type)
        {
            var buff = GetBuffByType(type);
            if (buff == null) return false;

            return RemoveBuffById(buff.Id);
        }

        /// <summary>
        /// 移除指定 ID 的 Buff
        /// </summary>
        public bool RemoveBuffById(int id)
        {
            if (!_activeBuffs.TryGetValue(id, out var buff)) return false;

            buff.IsActive = false;

            // 停止粒子
            buff.ActiveVFXHandle?.Stop(true);

            // 移除图标
            if (buff.ActiveIconUI != null)
                Destroy(buff.ActiveIconUI);

            _activeBuffs.Remove(id);

            // 更新动画状态
            UpdateAnimatorStates();

            OnBuffRemoved?.Invoke(buff);

            return true;
        }

        /// <summary>
        /// 移除所有 Buff
        /// </summary>
        public void RemoveAllBuffs()
        {
            var buffs = new List<BuffInstance>(_activeBuffs.Values);
            foreach (var buff in buffs)
            {
                RemoveBuffById(buff.Id);
            }
        }

        /// <summary>
        /// 移除所有 Debuff
        /// </summary>
        public void RemoveAllDebuffs()
        {
            var buffs = new List<BuffInstance>(_activeBuffs.Values);
            foreach (var buff in buffs)
            {
                if (!buff.IsBuff) RemoveBuffById(buff.Id);
            }
        }

        /// <summary>
        /// 检查是否有指定类型的 Buff
        /// </summary>
        public bool HasBuff(BuffType type) => GetBuffByType(type) != null;

        /// <summary>
        /// 获取指定类型的 Buff
        /// </summary>
        public BuffInstance GetBuffByType(BuffType type)
        {
            foreach (var buff in _activeBuffs.Values)
            {
                if (buff.Type == type && buff.IsActive) return buff;
            }
            return null;
        }

        /// <summary>当前 Buff 数量</summary>
        public int BuffCount => _activeBuffs.Count;

        /// <summary>获取所有激活 Buff</summary>
        public IEnumerable<BuffInstance> GetAllBuffs() => _activeBuffs.Values;

        // ============================================================
        // Tick 协程 —— Buff 持续效果
        // ============================================================

        private IEnumerator BuffTickRoutine()
        {
            while (_activeBuffs.Count > 0)
            {
                float deltaTime = Time.deltaTime;
                var expiredBuffs = new List<BuffInstance>();

                foreach (var buff in _activeBuffs.Values)
                {
                    if (!buff.IsActive) continue;

                    // 减少持续时间
                    buff.RemainingTime -= deltaTime;

                    // 持续效果 Tick
                    buff.TickTimer += deltaTime;
                    if (buff.TickInterval > 0f && buff.TickTimer >= buff.TickInterval)
                    {
                        buff.TickTimer -= buff.TickInterval;
                        OnBuffTick?.Invoke(buff);

                        // Tick 时播放小特效
                        PlayTickEffect(buff);
                    }

                    // 持续时间图标更新
                    UpdateBuffIconTimer(buff);

                    // 检查过期
                    if (buff.RemainingTime <= 0f)
                    {
                        expiredBuffs.Add(buff);
                    }
                }

                // 移除过期 Buff
                foreach (var buff in expiredBuffs)
                {
                    RemoveBuffById(buff.Id);
                }

                yield return null;
            }

            _tickCoroutine = null;
        }

        // ============================================================
        // 特效播放
        // ============================================================

        private void PlayApplyEffect(BuffInstance buff, BuffVFXTable.BuffVisualEntry entry)
        {
            if (entry == null) return;

            // 屏幕微震
            if (entry.ShakeOnApply > 0f)
                ScreenEffectManager.Instance?.Shake(ShakeIntensity.Light, entry.ShakeOnApply);

            // 播放元素默认音效
            ElementType elem = BuffTypeToElement(buff.Type);
            if (buff.IsBuff)
            {
                SkillAudioController.Instance?.PlaySFX("Audio/SFX/Buff/Buff_Apply", 0.8f);
            }
            else
            {
                SkillAudioController.Instance?.PlayElementSkillSFX(elem,
                    transform.position, false, 0.6f);
            }
        }

        private void PlayStackEffect(BuffInstance buff)
        {
            if (buff.ActiveVFXHandle != null)
            {
                // 叠加时让现有粒子闪烁一下
                buff.ActiveVFXHandle.SetScale(1.3f);
                StartCoroutine(DelayedResetScale(buff.ActiveVFXHandle, 0.2f));
            }

            SkillAudioController.Instance?.PlaySFX("Audio/SFX/Buff/Stack_Apply", 0.7f);
        }

        private void PlayTickEffect(BuffInstance buff)
        {
            // Tick 时小的视觉反馈（如燃烧的火星、中毒的绿色气泡）
            string tickParticlePath = buff.Type switch
            {
                BuffType.Burn => "VFX/Buffs/Burn_Tick",
                BuffType.Poison => "VFX/Buffs/Poison_Tick",
                BuffType.Bleed => "VFX/Buffs/Bleed_Tick",
                BuffType.HealOverTime => "VFX/Buffs/Heal_Tick",
                BuffType.Shield => null, // 护盾无 Tick 特效
                _ => null
            };

            if (!string.IsNullOrEmpty(tickParticlePath))
            {
                var prefab = Resources.Load<GameObject>(tickParticlePath);
                if (prefab != null)
                {
                    SkillVFXManager.Instance?.PlayEffect(
                        prefab, buffAttachPoint.position + Vector3.up * 0.5f,
                        Quaternion.identity, 0.5f, 0.5f, true, VFXLayer.Body);
                }
            }
        }

        private IEnumerator DelayedResetScale(VFXHandle handle, float delay)
        {
            yield return new WaitForSeconds(delay);
            handle?.SetScale(1f);
        }

        // ============================================================
        // 图标 UI 管理
        // ============================================================

        private void CreateBuffIcon(BuffInstance buff, BuffVFXTable.BuffVisualEntry entry)
        {
            if (iconUIParent == null || buffIconPrefab == null) return;

            var iconGo = Instantiate(buffIconPrefab, iconUIParent);
            iconGo.name = $"BuffIcon_{buff.Name}_{buff.Id}";

            // 设置图标
            var image = iconGo.GetComponent<Image>();
            if (image != null && entry?.Icon != null)
            {
                image.sprite = entry.Icon;
            }

            // 设置颜色（Buff绿色边框，Debuff红色边框）
            Color tintColor = entry?.TintColor ?? Color.white;
            if (image != null) image.color = tintColor;

            // 设置名称
            var nameText = iconGo.GetComponentInChildren<TMPro.TextMeshProUGUI>();
            if (nameText != null) nameText.text = buff.Name;

            // 层数显示
            var stackText = iconGo.transform.Find("StackCount")?.GetComponent<TMPro.TextMeshProUGUI>();
            if (stackText != null)
            {
                stackText.gameObject.SetActive(buff.Stacks > 1);
                stackText.text = buff.Stacks.ToString();
            }

            buff.ActiveIconUI = iconGo;

            // 重新排列所有图标
            RefreshIconPositions();
        }

        private void UpdateBuffIconTimer(BuffInstance buff)
        {
            if (buff.ActiveIconUI == null) return;

            // 更新剩余时间显示（如有）
            var timerText = buff.ActiveIconUI.transform.Find("Timer")?.GetComponent<TMPro.TextMeshProUGUI>();
            if (timerText != null)
            {
                timerText.text = Mathf.CeilToInt(buff.RemainingTime).ToString();
            }

            // 低于30%时闪烁提示
            if (buff.RemainingTime > 0f && buff.DurationPercent < 0.3f)
            {
                var canvasGroup = buff.ActiveIconUI.GetComponent<CanvasGroup>();
                if (canvasGroup != null)
                {
                    canvasGroup.alpha = Mathf.PingPong(Time.time * 3f, 0.5f) + 0.5f;
                }
            }
        }

        private void RefreshIconPositions()
        {
            int index = 0;
            foreach (var buff in _activeBuffs.Values)
            {
                if (buff.ActiveIconUI == null || index >= maxVisibleIcons) continue;

                RectTransform rect = buff.ActiveIconUI.GetComponent<RectTransform>();
                if (rect != null)
                {
                    rect.anchoredPosition = iconStartOffset + new Vector2(0f, -index * iconSpacing);
                }

                index++;
            }
        }

        // ============================================================
        // 角色动画状态同步
        // ============================================================

        private void UpdateAnimatorStates()
        {
            if (_skillAnimator == null) return;

            bool hasBuff = false, hasDebuff = false;
            bool isFrozen = false, isBurning = false;

            foreach (var buff in _activeBuffs.Values)
            {
                if (!buff.IsActive) continue;

                if (buff.IsBuff) hasBuff = true;
                else hasDebuff = true;

                switch (buff.Type)
                {
                    case BuffType.Freeze:
                        isFrozen = true;
                        break;
                    case BuffType.Burn:
                        isBurning = true;
                        break;
                }
            }

            _skillAnimator.SetBuffedState(hasBuff);
            _skillAnimator.SetDebuffedState(hasDebuff);
            _skillAnimator.SetFrozenState(isFrozen);
            _skillAnimator.SetBurningState(isBurning);

            // 冻结时触发眩晕动画
            if (isFrozen)
                _skillAnimator.PlayStunAnimation(999f); // 冻结持续时间由 Buff 控制
        }

        // ============================================================
        // 工具方法
        // ============================================================

        private static bool IsBuffType(BuffType type)
        {
            return type switch
            {
                BuffType.AttackUp => true,
                BuffType.DefenseUp => true,
                BuffType.SpeedUp => true,
                BuffType.Shield => true,
                BuffType.HealOverTime => true,
                BuffType.CritUp => true,
                BuffType.DamageImmune => true,
                _ => false
            };
        }

        private static int GetMaxStacks(BuffType type)
        {
            return type switch
            {
                BuffType.Burn => 5,
                BuffType.Poison => 5,
                BuffType.Bleed => 3,
                BuffType.AttackUp => 3,
                BuffType.DefenseUp => 3,
                _ => 1
            };
        }

        private static float GetTickInterval(BuffType type)
        {
            return type switch
            {
                BuffType.Burn => 1f,
                BuffType.Poison => 1.5f,
                BuffType.Bleed => 2f,
                BuffType.HealOverTime => 2f,
                BuffType.Shield => 0f,  // 护盾无 Tick
                _ => 0f
            };
        }

        private static ElementType BuffTypeToElement(BuffType type)
        {
            return type switch
            {
                BuffType.Burn => ElementType.Fire,
                BuffType.Freeze => ElementType.Ice,
                BuffType.Poison => ElementType.Dark,
                BuffType.Bleed => ElementType.Dark,
                BuffType.Shield => ElementType.Light,
                BuffType.HealOverTime => ElementType.Water,
                BuffType.SpeedUp => ElementType.Wind,
                BuffType.AttackUp => ElementType.Fire,
                BuffType.DefenseUp => ElementType.Ice,
                _ => ElementType.Light
            };
        }
    }
}
