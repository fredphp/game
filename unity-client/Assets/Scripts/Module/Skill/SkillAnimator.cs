// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Skill System
// =============================================================================
// 描述：技能动画控制器 —— 管理技能释放时的角色动画、攻击动画、受击动画。
//       基于 Animator 状态机驱动，支持 AnimationEvent 触发特效/音效。
//       与 SkillVFXManager 配合实现"动画→特效→音效"完整表现链。
// =============================================================================

using System;
using System.Collections;
using UnityEngine;

namespace Jiuzhou.Zhengding.Module.Skill
{
    // ============================================================
    // 动画参数常量
    // ============================================================

    /// <summary>
    /// Animator 参数哈希缓存 —— 避免每帧字符串哈希计算
    /// </summary>
    public static class AnimParams
    {
        // ── 通用参数 ──
        public static readonly int Speed = Animator.StringToHash("Speed");
        public static readonly int IsMoving = Animator.StringToHash("IsMoving");
        public static readonly int IsGrounded = Animator.StringToHash("IsGrounded");
        public static readonly int IsDead = Animator.StringToHash("IsDead");

        // ── 技能参数 ──
        public static readonly int SkillId = Animator.StringToHash("SkillId");
        public static readonly int CastSkill = Animator.StringToHash("CastSkill");
        public static readonly int SkillLevel = Animator.StringToHash("SkillLevel");
        public static readonly int Element = Animator.StringToHash("Element");

        // ── 战斗参数 ──
        public static readonly int Attack = Animator.StringToHash("Attack");
        public static readonly int HeavyAttack = Animator.StringToHash("HeavyAttack");
        public static readonly int Hit = Animator.StringToHash("Hit");
        public static readonly int CriticalHit = Animator.StringToHash("CriticalHit");
        public static readonly int Block = Animator.StringToHash("Block");
        public static readonly int Dodge = Animator.StringToHash("Dodge");
        public static readonly int Stun = Animator.StringToHash("Stun");

        // ── Buff 参数 ──
        public static readonly int IsBuffed = Animator.StringToHash("IsBuffed");
        public static readonly int IsDebuffed = Animator.StringToHash("IsDebuffed");
        public static readonly int IsFrozen = Animator.StringToHash("IsFrozen");
        public static readonly int IsBurning = Animator.StringToHash("IsBurning");
    }

    // ============================================================
    // 技能动画事件参数
    // ============================================================

    /// <summary>
    /// AnimationEvent 传递给动画帧回调的参数
    /// 通过 Animator.SetFloat("SkillId", value) 在释放技能前设置
    /// </summary>
    public class SkillAnimEventData
    {
        public int SkillId;
        public ElementType Element;
        public int Rarity;
        public string SkillName;
        public Transform CasterTransform;
        public Transform TargetTransform;
        public bool IsCritical;
    }

    // ============================================================
    // 技能动画控制器
    // ============================================================

    /// <summary>
    /// 技能动画控制器 —— 挂载到英雄角色上，管理战斗中的所有动画状态
    /// <para>职责：施法动画 → AnimationEvent回调 → 通知特效管理器</para>
    /// </summary>
    [RequireComponent(typeof(Animator))]
    public class SkillAnimator : MonoBehaviour
    {
        // ── 引用 ──
        private Animator _animator;
        private Transform _transform;

        // ── 状态 ──
        private bool _isCasting = false;
        private bool _isStunned = false;
        private float _animSpeedMultiplier = 1f;
        private Coroutine _currentAnimCoroutine;
        private SkillAnimEventData _currentSkillData;

        // ── 事件（由 AnimationEvent 在动画帧中调用）──
        /// <summary>施法动画开始时触发</summary>
        public event Action<SkillAnimEventData> OnCastStart;
        /// <summary>弹道发射时触发（动画帧标记）</summary>
        public event Action<SkillAnimEventData> OnProjectileFire;
        /// <summary>命中判定时触发</summary>
        public event Action<SkillAnimEventData> OnHitFrame;
        /// <summary>施法动画结束时触发</summary>
        public event Action<SkillAnimEventData> OnCastEnd;
        /// <summary>受击动画开始时触发</summary>
        public event Action OnHitReactStart;
        /// <summary>受击动画结束时触发</summary>
        public event Action OnHitReactEnd;

        // ── 配置 ──
        [Header("动画配置")]
        [SerializeField] private float defaultCastAnimDuration = 0.8f;
        [SerializeField] private float defaultAttackAnimDuration = 0.4f;
        [SerializeField] private float defaultHitReactDuration = 0.3f;
        [SerializeField] private float crossFadeDuration = 0.1f;

        // ── 属性 ──
        public bool IsCasting => _isCasting;
        public bool IsStunned => _isStunned;
        public Animator Animator => _animator;
        public SkillAnimEventData CurrentSkillData => _currentSkillData;

        private void Awake()
        {
            _animator = GetComponent<Animator>();
            _transform = transform;
            if (_animator == null)
            {
                Debug.LogError($"[SkillAnimator] {name}: 缺少 Animator 组件!");
            }
        }

        private void OnDestroy()
        {
            if (_currentAnimCoroutine != null)
                StopCoroutine(_currentAnimCoroutine);
        }

        // ============================================================
        // 施法动画
        // ============================================================

        /// <summary>
        /// 播放技能施法动画 —— 完整流程
        /// </summary>
        /// <param name="data">技能动画数据</param>
        /// <param name="animSpeed">动画速度倍率</param>
        /// <param name="onComplete">动画完成回调</param>
        public void PlayCastAnimation(SkillAnimEventData data, float animSpeed = 1f,
            Action onComplete = null)
        {
            if (_animator == null || _isStunned) return;

            _isCasting = true;
            _currentSkillData = data;
            _animSpeedMultiplier = animSpeed;

            // 设置 Animator 参数
            _animator.SetFloat(AnimParams.SkillId, data.SkillId);
            _animator.SetFloat(AnimParams.Element, (int)data.Element);
            _animator.SetFloat(AnimParams.SkillLevel, data.Rarity);
            _animator.SetFloat(AnimParams.Speed, animSpeed);

            // 触发施法状态
            _animator.SetTrigger(AnimParams.CastSkill);

            // 触发事件
            OnCastStart?.Invoke(data);

            // 自动结束
            float duration = defaultCastAnimDuration / animSpeed;
            _currentAnimCoroutine = StartCoroutine(WaitForCastAnimation(data, duration, onComplete));
        }

        /// <summary>
        /// 播放技能施法动画 —— 简化版（通过动画名）
        /// </summary>
        public void PlayCastAnimation(string animName, int skillId, ElementType element,
            int rarity, float animSpeed = 1f, Action onComplete = null)
        {
            var data = new SkillAnimEventData
            {
                SkillId = skillId,
                Element = element,
                Rarity = rarity,
                SkillName = animName,
                CasterTransform = _transform
            };

            PlayCastAnimation(data, animSpeed, onComplete);
        }

        // ============================================================
        // 攻击动画
        // ============================================================

        /// <summary>
        /// 播放普通攻击动画
        /// </summary>
        public void PlayAttackAnimation(float animSpeed = 1f, Action onComplete = null)
        {
            if (_animator == null || _isStunned) return;

            _animator.SetTrigger(AnimParams.Attack);
            _animator.SetFloat(AnimParams.Speed, animSpeed);

            float duration = defaultAttackAnimDuration / animSpeed;
            StartCoroutine(WaitForAnimationComplete(duration, onComplete));
        }

        /// <summary>
        /// 播放重击动画
        /// </summary>
        public void PlayHeavyAttackAnimation(float animSpeed = 1f, Action onComplete = null)
        {
            if (_animator == null || _isStunned) return;

            _animator.SetTrigger(AnimParams.HeavyAttack);
            _animator.SetFloat(AnimParams.Speed, animSpeed);

            float duration = (defaultAttackAnimDuration * 1.5f) / animSpeed;
            StartCoroutine(WaitForAnimationComplete(duration, onComplete));
        }

        // ============================================================
        // 受击/反应动画
        // ============================================================

        /// <summary>
        /// 播放受击动画
        /// </summary>
        /// <param name="isCritical">是否暴击（影响击退距离和动画强度）</param>
        public void PlayHitReaction(bool isCritical = false, Action onComplete = null)
        {
            if (_animator == null) return;

            if (isCritical)
            {
                _animator.SetTrigger(AnimParams.CriticalHit);
            }
            else
            {
                _animator.SetTrigger(AnimParams.Hit);
            }

            OnHitReactStart?.Invoke();

            float duration = isCritical ?
                defaultHitReactDuration * 1.5f :
                defaultHitReactDuration;

            StartCoroutine(WaitForHitReaction(duration, onComplete));
        }

        /// <summary>
        /// 播放格挡动画
        /// </summary>
        public void PlayBlockAnimation(Action onComplete = null)
        {
            if (_animator == null) return;

            _animator.SetTrigger(AnimParams.Block);
            StartCoroutine(WaitForAnimationComplete(defaultHitReactDuration, onComplete));
        }

        /// <summary>
        /// 播放闪避动画
        /// </summary>
        public void PlayDodgeAnimation(Action onComplete = null)
        {
            if (_animator == null) return;

            _animator.SetTrigger(AnimParams.Dodge);
            StartCoroutine(WaitForAnimationComplete(0.3f, onComplete));
        }

        /// <summary>
        /// 播放眩晕动画
        /// </summary>
        public void PlayStunAnimation(float duration = 2f, Action onComplete = null)
        {
            if (_animator == null) return;

            _isStunned = true;
            _animator.SetBool(AnimParams.Stun, true);
            StartCoroutine(WaitForStun(duration, onComplete));
        }

        /// <summary>
        /// 播放死亡动画
        /// </summary>
        public void PlayDeathAnimation(Action onComplete = null)
        {
            if (_animator == null) return;

            _animator.SetBool(AnimParams.IsDead, true);
            StartCoroutine(WaitForAnimationComplete(1.0f, onComplete));
        }

        // ============================================================
        // Buff 状态动画
        // ============================================================

        /// <summary>
        /// 设置增益状态
        /// </summary>
        public void SetBuffedState(bool active)
        {
            if (_animator != null)
                _animator.SetBool(AnimParams.IsBuffed, active);
        }

        /// <summary>
        /// 设置减益状态
        /// </summary>
        public void SetDebuffedState(bool active)
        {
            if (_animator != null)
                _animator.SetBool(AnimParams.IsDebuffed, active);
        }

        /// <summary>
        /// 设置冻结状态
        /// </summary>
        public void SetFrozenState(bool active)
        {
            if (_animator != null)
                _animator.SetBool(AnimParams.IsFrozen, active);
        }

        /// <summary>
        /// 设置燃烧状态
        /// </summary>
        public void SetBurningState(bool active)
        {
            if (_animator != null)
                _animator.SetBool(AnimParams.IsBurning, active);
        }

        // ============================================================
        // AnimationEvent 回调（由动画帧中的 AnimationEvent 调用）
        // ============================================================

        /// <summary>
        /// AnimationEvent: "OnProjectileFire" —— 弹道发射帧回调
        /// </summary>
        public void AE_OnProjectileFire()
        {
            Debug.Log($"[SkillAnimator] {name} AE_OnProjectileFire - Skill: {_currentSkillData?.SkillName}");
            OnProjectileFire?.Invoke(_currentSkillData);
        }

        /// <summary>
        /// AnimationEvent: "OnHitFrame" —— 命中判定帧回调
        /// </summary>
        public void AE_OnHitFrame()
        {
            Debug.Log($"[SkillAnimator] {name} AE_OnHitFrame - Skill: {_currentSkillData?.SkillName}");
            OnHitFrame?.Invoke(_currentSkillData);
        }

        /// <summary>
        /// AnimationEvent: "OnCastEnd" —— 施法结束帧回调
        /// </summary>
        public void AE_OnCastEnd()
        {
            Debug.Log($"[SkillAnimator] {name} AE_OnCastEnd - Skill: {_currentSkillData?.SkillName}");
            OnCastEnd?.Invoke(_currentSkillData);
        }

        // ============================================================
        // 内部协程
        // ============================================================

        private IEnumerator WaitForCastAnimation(SkillAnimEventData data, float duration, Action onComplete)
        {
            yield return new WaitForSeconds(duration);
            _isCasting = false;
            _currentSkillData = null;
            OnCastEnd?.Invoke(data);
            onComplete?.Invoke();
        }

        private IEnumerator WaitForAnimationComplete(float duration, Action onComplete)
        {
            yield return new WaitForSeconds(duration);
            onComplete?.Invoke();
        }

        private IEnumerator WaitForHitReaction(float duration, Action onComplete)
        {
            yield return new WaitForSeconds(duration);
            OnHitReactEnd?.Invoke();
            onComplete?.Invoke();
        }

        private IEnumerator WaitForStun(float duration, Action onComplete)
        {
            yield return new WaitForSeconds(duration);
            _isStunned = false;
            if (_animator != null)
                _animator.SetBool(AnimParams.Stun, false);
            onComplete?.Invoke();
        }

        // ============================================================
        // 工具方法
        // ============================================================

        /// <summary>
        /// 中断当前动画
        /// </summary>
        public void InterruptAnimation()
        {
            _isCasting = false;
            _currentSkillData = null;

            if (_currentAnimCoroutine != null)
            {
                StopCoroutine(_currentAnimCoroutine);
                _currentAnimCoroutine = null;
            }
        }

        /// <summary>
        /// 设置动画速度
        /// </summary>
        public void SetAnimSpeed(float speed)
        {
            _animSpeedMultiplier = speed;
            if (_animator != null)
                _animator.SetFloat(AnimParams.Speed, speed);
        }

        /// <summary>
        /// 获取当前动画状态名称
        /// </summary>
        public string GetCurrentStateName()
        {
            if (_animator == null) return "None";
            var stateInfo = _animator.GetCurrentAnimatorStateInfo(0);
            return stateInfo.IsName("None") ? "Idle" : stateInfo.fullPathHash.ToString();
        }

        /// <summary>
        /// 是否在播放指定动画
        /// </summary>
        public bool IsPlayingState(string stateName, int layerIndex = 0)
        {
            if (_animator == null) return false;
            return _animator.GetCurrentAnimatorStateInfo(layerIndex).IsName(stateName);
        }

        /// <summary>
        /// 当前动画是否播放完毕（normalizedTime >= 1）
        /// </summary>
        public bool IsAnimationComplete(int layerIndex = 0)
        {
            if (_animator == null) return true;
            var stateInfo = _animator.GetCurrentAnimatorStateInfo(layerIndex);
            return stateInfo.normalizedTime >= 1f;
        }
    }

    // ============================================================
    // 受击控制器 —— 控制受击位移、击退、击飞
    // ============================================================

    /// <summary>
    /// 受击控制器 —— 管理受击时的位移效果（击退、击飞、震动）
    /// </summary>
    public class HitReactionController : MonoBehaviour
    {
        [Header("受击配置")]
        [SerializeField] private float normalKnockback = 0.5f;     // 普通击退距离
        [SerializeField] private float criticalKnockback = 1.2f;   // 暴击击退距离
        [SerializeField] private float knockbackDuration = 0.2f;   // 击退时长
        [SerializeField] private float knockupHeight = 0.5f;       // 击飞高度
        [SerializeField] private float knockupDuration = 0.3f;     // 击飞时长
        [SerializeField] private float hitShakeAmount = 0.1f;      // 受击震动幅度
        [SerializeField] private float hitShakeDuration = 0.15f;   // 受击震动时长

        private Vector3 _originalPosition;
        private Coroutine _activeReaction;
        private SkillAnimator _skillAnimator;

        private void Awake()
        {
            _skillAnimator = GetComponent<SkillAnimator>();
        }

        /// <summary>
        /// 触发受击反应 —— 击退 + 震动
        /// </summary>
        /// <param name="fromPosition">攻击来源位置</param>
        /// <param name="isCritical">是否暴击</param>
        /// <param name="isKnockup">是否击飞</param>
        public void ReactToHit(Vector3 fromPosition, bool isCritical = false, bool isKnockup = false)
        {
            if (_activeReaction != null) StopCoroutine(_activeReaction);

            Vector3 knockDir = (transform.position - fromPosition).normalized;
            knockDir.y = 0f;
            float knockDist = isCritical ? criticalKnockback : normalKnockback;

            // 播放受击动画
            _skillAnimator?.PlayHitReaction(isCritical);

            if (isKnockup)
            {
                _activeReaction = StartCoroutine(KnockupReaction(knockDir, knockDist));
            }
            else
            {
                _activeReaction = StartCoroutine(KnockbackReaction(knockDir, knockDist));
            }
        }

        /// <summary>
        /// 击退反应
        /// </summary>
        private IEnumerator KnockbackReaction(Vector3 direction, float distance)
        {
            _originalPosition = transform.position;
            Vector3 targetPos = _originalPosition + direction * distance;

            // 击退
            float elapsed = 0f;
            while (elapsed < knockbackDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / knockbackDuration;
                // 快速推出，缓慢停止（easeOut）
                t = 1f - (1f - t) * (1f - t);
                transform.position = Vector3.Lerp(_originalPosition, targetPos, t);

                // 受击震动
                if (elapsed < hitShakeDuration)
                {
                    float shake = hitShakeAmount * (1f - elapsed / hitShakeDuration);
                    transform.position += new Vector3(
                        UnityEngine.Random.Range(-shake, shake),
                        0f,
                        UnityEngine.Random.Range(-shake, shake)
                    );
                }

                yield return null;
            }

            transform.position = targetPos;
            _activeReaction = null;
        }

        /// <summary>
        /// 击飞反应
        /// </summary>
        private IEnumerator KnockupReaction(Vector3 direction, float distance)
        {
            _originalPosition = transform.position;
            Vector3 landPos = _originalPosition + direction * distance * 0.5f;

            // 上升
            float elapsed = 0f;
            float upDuration = knockupDuration * 0.4f;
            while (elapsed < upDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / upDuration;
                float height = Mathf.Sin(t * Mathf.PI * 0.5f) * knockupHeight;
                transform.position = _originalPosition + new Vector3(
                    direction.x * distance * 0.3f * t,
                    height,
                    direction.z * distance * 0.3f * t
                );
                yield return null;
            }

            // 下落
            Vector3 peakPos = transform.position;
            elapsed = 0f;
            float downDuration = knockupDuration * 0.6f;
            while (elapsed < downDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / downDuration;
                float height = Mathf.Cos(t * Mathf.PI * 0.5f) * knockupHeight;
                transform.position = new Vector3(
                    Vector3.Lerp(peakPos.x, landPos.x, t),
                    height,
                    Vector3.Lerp(peakPos.z, landPos.z, t)
                );
                yield return null;
            }

            transform.position = landPos;
            _activeReaction = null;
        }

        /// <summary>
        /// 重置位置
        /// </summary>
        public void ResetPosition()
        {
            if (_activeReaction != null)
            {
                StopCoroutine(_activeReaction);
                _activeReaction = null;
            }
            // 位置由外部恢复
        }
    }
}
