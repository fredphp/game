// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Skill System
// =============================================================================
// 描述：技能特效管理器 —— 管理粒子特效的对象池化、播放、回收和生命周期。
//       支持多层级粒子、弹道发射、命中爆炸、持续 Buff 特效等。
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Jiuzhou.Zhengding.Module.Skill
{
    /// <summary>
    /// 特效播放句柄 —— 用于控制正在播放的特效实例
    /// </summary>
    public class VFXHandle
    {
        public int Id { get; }
        public GameObject Instance { get; private set; }
        public ParticleSystem MainParticle { get; private set; }
        public VFXLayer Layer { get; }
        public bool IsPlaying { get; private set; }
        public bool IsFollowing { get; private set; }
        public Transform FollowTarget { get; private set; }
        public Vector3 FollowOffset { get; set; }
        public float ElapsedTime { get; private set; }
        public float TotalDuration { get; private set; }
        public bool IsDone { get; private set; }

        private readonly SkillVFXManager _manager;
        private Coroutine _lifetimeCoroutine;
        private Coroutine _followCoroutine;

        public event Action<VFXHandle> OnComplete;
        public event Action<VFXHandle> OnStop;

        public VFXHandle(int id, GameObject instance, ParticleSystem ps, VFXLayer layer,
            float duration, bool follow, Transform target, Vector3 offset, SkillVFXManager manager)
        {
            Id = id;
            Instance = instance;
            MainParticle = ps;
            Layer = layer;
            TotalDuration = duration;
            IsFollowing = follow;
            FollowTarget = target;
            FollowOffset = offset;
            _manager = manager;
            IsPlaying = true;
            IsDone = false;
            ElapsedTime = 0f;
        }

        /// <summary>停止特效（触发淡出或直接销毁）</summary>
        public void Stop(bool fadeOut = false)
        {
            if (!IsPlaying) return;
            IsPlaying = false;
            OnStop?.Invoke(this);

            if (fadeOut && MainParticle != null)
            {
                // 停止发射新粒子，等待现有粒子消失
                MainParticle.Stop(true, ParticleSystemStopBehavior.StopEmittingAndClear);
            }

            ReturnToPool();
        }

        /// <summary>设置粒子颜色</summary>
        public void SetColor(Color color)
        {
            if (MainParticle != null)
            {
                var main = MainParticle.main;
                main.startColor = color;
            }
        }

        /// <summary>设置缩放</summary>
        public void SetScale(float scale)
        {
            if (Instance != null)
            {
                Instance.transform.localScale = Vector3.one * scale;
            }
        }

        /// <summary>更新跟随目标</summary>
        public void SetFollowTarget(Transform target, Vector3 offset)
        {
            FollowTarget = target;
            FollowOffset = offset;
            IsFollowing = true;
        }

        /// <summary>启动生命周期协程</summary>
        internal void StartLifetime(MonoBehaviour runner)
        {
            _lifetimeCoroutine = runner.StartCoroutine(LifetimeRoutine());

            if (IsFollowing && FollowTarget != null)
            {
                _followCoroutine = runner.StartCoroutine(FollowRoutine());
            }
        }

        private IEnumerator LifetimeRoutine()
        {
            ElapsedTime = 0f;

            if (TotalDuration > 0f)
            {
                yield return new WaitForSeconds(TotalDuration);
            }
            else if (MainParticle != null)
            {
                // 使用粒子系统自身的 duration
                var main = MainParticle.main;
                if (main.looping)
                {
                    yield return new WaitForSeconds(5f); // 循环粒子默认5秒
                }
                else
                {
                    yield return new WaitForSeconds(MainParticle.main.duration + MainParticle.main.startLifetime.constantMax);
                }
            }
            else
            {
                yield return new WaitForSeconds(2f);
            }

            Complete();
        }

        private IEnumerator FollowRoutine()
        {
            while (IsPlaying && FollowTarget != null)
            {
                if (Instance != null)
                {
                    Instance.transform.position = FollowTarget.position + FollowOffset;
                }
                yield return null;
            }
        }

        private void Complete()
        {
            IsDone = true;
            IsPlaying = false;
            OnComplete?.Invoke(this);
            ReturnToPool();
        }

        private void ReturnToPool()
        {
            if (_lifetimeCoroutine != null && _manager != null)
            {
                _manager.StopHandleCoroutine(_lifetimeCoroutine);
                _lifetimeCoroutine = null;
            }
            if (_followCoroutine != null && _manager != null)
            {
                _manager.StopHandleCoroutine(_followCoroutine);
                _followCoroutine = null;
            }

            _manager?.ReturnToPool(this);
        }
    }

    /// <summary>
    /// 技能特效管理器 —— 粒子池化 + 特效播放 + 生命周期管理
    /// </summary>
    public class SkillVFXManager : MonoBehaviour
    {
        private static SkillVFXManager _instance;
        public static SkillVFXManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    var go = new GameObject("SkillVFXManager");
                    _instance = go.AddComponent<SkillVFXManager>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }

        // ── 对象池 ──
        private readonly Dictionary<string, Queue<GameObject>> _pools = new Dictionary<string, Queue<GameObject>>();
        private readonly Dictionary<int, VFXHandle> _activeHandles = new Dictionary<int, VFXHandle>();
        private int _nextHandleId = 1;
        private readonly List<Coroutine> _handleCoroutines = new List<Coroutine>();

        // ── 特效层级 Transform ──
        private Transform _groundLayer;
        private Transform _bodyLayer;
        private Transform _airLayer;
        private Transform _overlayLayer;

        // ── 配置 ──
        [Header("特效配置")]
        [SerializeField] private int defaultPoolSize = 5;
        [SerializeField] private int maxPoolSize = 20;
        [SerializeField] private float globalVFXScale = 1f;
        [SerializeField] private bool enableVFX = true;

        // ── 事件 ──
        public event Action<VFXHandle> OnVFXSpawned;
        public event Action<VFXHandle> OnVFXComplete;

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }
            _instance = this;
            DontDestroyOnLoad(gameObject);

            InitializeLayers();
            Debug.Log("[SkillVFXManager] 初始化完成");
        }

        private void OnDestroy()
        {
            if (_instance == this) _instance = null;
        }

        // ============================================================
        // 层级初始化
        // ============================================================

        private void InitializeLayers()
        {
            var layerParent = new GameObject("VFX_Layers").transform;
            layerParent.SetParent(transform);

            _groundLayer = CreateLayer("GroundLayer", layerParent, 0);
            _bodyLayer = CreateLayer("BodyLayer", layerParent, 1);
            _airLayer = CreateLayer("AirLayer", layerParent, 2);
            _overlayLayer = CreateLayer("OverlayLayer", layerParent, 3);
        }

        private Transform CreateLayer(string name, Transform parent, int order)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent);
            return go.transform;
        }

        private Transform GetLayerTransform(VFXLayer layer)
        {
            return layer switch
            {
                VFXLayer.Ground => _groundLayer,
                VFXLayer.Body => _bodyLayer,
                VFXLayer.Air => _airLayer,
                VFXLayer.Overlay => _overlayLayer,
                _ => _bodyLayer
            };
        }

        // ============================================================
        // 特效播放 API
        // ============================================================

        /// <summary>
        /// 播放粒子特效 —— 核心方法
        /// </summary>
        public VFXHandle PlayEffect(GameObject prefab, Vector3 position, Quaternion rotation,
            float duration = 0f, float scale = 1f, bool usePool = true, VFXLayer layer = VFXLayer.Body)
        {
            if (!enableVFX || prefab == null) return null;

            GameObject instance;
            if (usePool)
            {
                instance = GetFromPool(prefab.name, prefab);
            }
            else
            {
                instance = Instantiate(prefab);
            }

            // 设置层级
            instance.transform.SetParent(GetLayerTransform(layer));
            instance.transform.position = position;
            instance.transform.rotation = rotation;
            instance.transform.localScale = Vector3.one * scale * globalVFXScale;
            instance.SetActive(true);

            // 获取粒子系统
            var ps = instance.GetComponent<ParticleSystem>();
            if (ps != null)
            {
                ps.Clear(true);
                ps.Play(true);
            }
            else
            {
                // 尝试子对象中的粒子系统
                var childPs = instance.GetComponentInChildren<ParticleSystem>();
                if (childPs != null)
                {
                    childPs.Clear(true);
                    childPs.Play(true);
                }
            }

            // 创建句柄
            var handle = new VFXHandle(
                _nextHandleId++, instance, ps, layer,
                duration, false, null, Vector3.zero, this
            );

            handle.StartLifetime(this);
            _activeHandles[handle.Id] = handle;
            OnVFXSpawned?.Invoke(handle);

            return handle;
        }

        /// <summary>
        /// 播放特效并跟随目标
        /// </summary>
        public VFXHandle PlayEffectFollow(GameObject prefab, Transform target,
            Vector3 offset = default, float duration = 0f, float scale = 1f,
            bool usePool = true, VFXLayer layer = VFXLayer.Body)
        {
            if (!enableVFX || prefab == null || target == null) return null;

            Vector3 position = target.position + offset;
            var handle = PlayEffect(prefab, position, Quaternion.identity, duration, scale, usePool, layer);

            if (handle != null)
            {
                handle.SetFollowTarget(target, offset);
            }

            return handle;
        }

        /// <summary>
        /// 播放弹道特效（从起点到终点）
        /// </summary>
        public VFXHandle PlayProjectile(GameObject prefab, Vector3 from, Vector3 to,
            float speed = 10f, float scale = 1f, Action onHit = null, VFXLayer layer = VFXLayer.Air)
        {
            if (!enableVFX || prefab == null) return null;

            Vector3 position = from;
            Quaternion rotation = Quaternion.LookRotation(to - from);

            var instance = GetFromPool(prefab.name, prefab);
            instance.transform.SetParent(GetLayerTransform(layer));
            instance.transform.position = position;
            instance.transform.rotation = rotation;
            instance.transform.localScale = Vector3.one * scale * globalVFXScale;
            instance.SetActive(true);

            var ps = instance.GetComponentInChildren<ParticleSystem>();
            if (ps != null) { ps.Clear(true); ps.Play(true); }

            float distance = Vector3.Distance(from, to);
            float duration = distance / Mathf.Max(speed, 0.1f);

            var handle = new VFXHandle(_nextHandleId++, instance, ps, layer, duration, false, null, Vector3.zero, this);
            _activeHandles[handle.Id] = handle;

            StartCoroutine(ProjectileRoutine(instance, from, to, speed, handle, onHit));
            OnVFXSpawned?.Invoke(handle);

            return handle;
        }

        /// <summary>
        /// 播放弹道特效（带拖尾）
        /// </summary>
        public VFXHandle PlayProjectileWithTrail(GameObject projectilePrefab, GameObject trailPrefab,
            Vector3 from, Vector3 to, float speed = 10f, float scale = 1f,
            Action onHit = null, VFXLayer layer = VFXLayer.Air)
        {
            if (!enableVFX || projectilePrefab == null) return null;

            // 弹道本体
            var handle = PlayProjectile(projectilePrefab, from, to, speed, scale, onHit, layer);

            // 拖尾效果跟随弹道
            if (trailPrefab != null && handle != null)
            {
                var trail = PlayEffectFollow(trailPrefab, handle.Instance.transform,
                    Vector3.zero, speed > 0 ? Vector3.Distance(from, to) / speed + 0.5f : 2f,
                    scale * 0.8f, true, layer);
            }

            return handle;
        }

        /// <summary>
        /// 从 SkillVFXProfile 配置播放完整技能特效序列
        /// </summary>
        public IEnumerator PlaySkillVFXSequence(SkillVFXProfile profile, Transform caster, Transform target,
            Action onCastStart = null, Action onHit = null, Action onComplete = null)
        {
            if (profile == null || caster == null) yield break;

            float battleSpeed = 1f; // 可从 BattleManager 获取
            float castDur = profile.CastDuration / battleSpeed;

            // ── 阶段1: 施法特效 ──
            onCastStart?.Invoke();

            if (profile.CastParticle.IsValid)
            {
                var cfg = profile.CastParticle;
                PlayEffectFollow(cfg.ParticlePrefab, caster, cfg.PositionOffset,
                    cfg.Duration > 0 ? cfg.Duration / battleSpeed : castDur * 0.6f,
                    cfg.Scale * globalVFXScale, cfg.UsePooling, cfg.Layer);
            }

            // ── 施法音效 ──
            PlaySkillAudio(profile.CastAudio, caster.position);

            // ── 地面特效（法阵等） ──
            if (profile.GroundParticle.IsValid)
            {
                var cfg = profile.GroundParticle;
                Vector3 groundPos = target != null ? target.position : caster.position;
                groundPos.y = 0f;
                PlayEffect(cfg.ParticlePrefab, groundPos, Quaternion.identity,
                    cfg.Duration > 0 ? cfg.Duration / battleSpeed : castDur,
                    cfg.Scale * globalVFXScale, cfg.UsePooling, VFXLayer.Ground);
            }

            // ── 延迟等待 ──
            if (profile.CastParticle.Delay > 0)
                yield return new WaitForSeconds(profile.CastParticle.Delay / battleSpeed);

            // ── 阶段2: 弹道 ──
            if (profile.HasProjectile && target != null)
            {
                if (profile.TrailParticle.IsValid && profile.TrailParticle.ParticlePrefab != null)
                {
                    PlayProjectileWithTrail(
                        profile.TrailParticle.ParticlePrefab,
                        profile.TrailParticle.ParticlePrefab,
                        caster.position, target.position + profile.HitParticle.PositionOffset,
                        profile.ProjectileSpeed, profile.TrailParticle.Scale * globalVFXScale,
                        null, VFXLayer.Air
                    );
                }
                else
                {
                    // 使用施法粒子作为弹道
                    if (profile.CastParticle.IsValid)
                    {
                        PlayProjectile(profile.CastParticle.ParticlePrefab,
                            caster.position, target.position + profile.HitParticle.PositionOffset,
                            profile.ProjectileSpeed, profile.CastParticle.Scale * globalVFXScale,
                            null, VFXLayer.Air);
                    }
                }

                float travelTime = Vector3.Distance(caster.position, target.position) /
                                   Mathf.Max(profile.ProjectileSpeed, 1f);
                yield return new WaitForSeconds(travelTime / battleSpeed);
            }

            // ── 阶段3: 命中特效 ──
            onHit?.Invoke();

            if (profile.HitParticle.IsValid && target != null)
            {
                var cfg = profile.HitParticle;
                Vector3 hitPos = target.position + cfg.PositionOffset;
                PlayEffect(cfg.ParticlePrefab, hitPos, cfg.LookAtTarget ?
                    Quaternion.LookRotation(caster.position - hitPos) : Quaternion.identity,
                    cfg.Duration > 0 ? cfg.Duration / battleSpeed : 1.5f,
                    cfg.Scale * globalVFXScale, cfg.UsePooling, cfg.Layer);
            }

            // ── 命中音效 ──
            if (target != null)
                PlaySkillAudio(profile.HitAudio, target.position);

            // ── 屏幕效果 ──
            if (profile.ScreenShake != ShakeIntensity.None)
                ScreenEffectManager.Instance?.Shake(profile.ScreenShake, profile.ShakeDuration / battleSpeed);

            if (profile.FlashColor.a > 0.01f)
                ScreenEffectManager.Instance?.Flash(profile.FlashColor, profile.FlashDuration / battleSpeed);

            if (profile.SlowMotionScale > 0f)
                ScreenEffectManager.Instance?.SlowMotion(profile.SlowMotionScale, profile.SlowMotionDuration / battleSpeed);

            // ── Buff特效 ──
            if (profile.AppliedBuffs != null)
            {
                foreach (var buff in profile.AppliedBuffs)
                {
                    if (buff.TickParticle.IsValid && target != null)
                    {
                        var cfg = buff.TickParticle;
                        PlayEffectFollow(cfg.ParticlePrefab, target, buff.AttachOffset,
                            cfg.Duration > 0 ? cfg.Duration : 3f,
                            cfg.Scale * globalVFXScale, cfg.UsePooling, cfg.Layer);
                    }
                }
            }

            // ── 等待剩余时间 ──
            yield return new WaitForSeconds(0.3f / battleSpeed);

            onComplete?.Invoke();
        }

        // ============================================================
        // 弹道协程
        // ============================================================

        private IEnumerator ProjectileRoutine(GameObject instance, Vector3 from, Vector3 to,
            float speed, VFXHandle handle, Action onHit)
        {
            float distance = Vector3.Distance(from, to);
            float elapsed = 0f;
            float totalDuration = distance / Mathf.Max(speed, 0.1f);
            Vector3 direction = (to - from).normalized;

            while (elapsed < totalDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / totalDuration;
                // 使用弧线轨迹
                Vector3 pos = Vector3.Lerp(from, to, t);
                pos.y += Mathf.Sin(t * Mathf.PI) * distance * 0.15f; // 弧线高度
                if (instance != null) instance.transform.position = pos;

                yield return null;
            }

            // 命中
            onHit?.Invoke();
            if (handle != null) handle.Stop(false);
        }

        // ============================================================
        // 音效播放
        // ============================================================

        /// <summary>
        /// 播放技能音效
        /// </summary>
        public void PlaySkillAudio(AudioConfig config, Vector3 worldPosition)
        {
            if (config == null || !config.IsValid) return;
            if (config.Delay > 0)
            {
                StartCoroutine(DelayedAudio(config, worldPosition, config.Delay));
                return;
            }
            PlayAudioNow(config, worldPosition);
        }

        private void PlayAudioNow(AudioConfig config, Vector3 position)
        {
            AudioClip clip = config.AudioClip;
            if (clip == null && !string.IsNullOrEmpty(config.ResourcePath))
            {
                clip = Resources.Load<AudioClip>(config.ResourcePath);
            }
            if (clip == null) return;

            if (config.Is3D)
            {
                AudioSource.PlayClipAtPoint(clip, position, config.VolumeScale);
            }
            else
            {
                // 使用 AudioManager
                Jiuzhou.Core.AudioManager.Instance?.PlaySFXClip(clip, config.VolumeScale);
            }
        }

        private IEnumerator DelayedAudio(AudioConfig config, Vector3 pos, float delay)
        {
            yield return new WaitForSeconds(delay);
            PlayAudioNow(config, pos);
        }

        // ============================================================
        // 对象池
        // ============================================================

        private GameObject GetFromPool(string key, GameObject prefab)
        {
            if (!_pools.ContainsKey(key))
                _pools[key] = new Queue<GameObject>();

            var pool = _pools[key];

            while (pool.Count > 0)
            {
                var obj = pool.Dequeue();
                if (obj != null)
                {
                    obj.SetActive(true);
                    return obj;
                }
            }

            // 池空，新建
            return Instantiate(prefab);
        }

        private void ReturnToPool(VFXHandle handle)
        {
            if (handle == null || handle.Instance == null) return;

            _activeHandles.Remove(handle.Id);
            OnVFXComplete?.Invoke(handle);

            string key = handle.Instance.name.Replace("(Clone)", "").Trim();
            if (!_pools.ContainsKey(key))
                _pools[key] = new Queue<GameObject>();

            var pool = _pools[key];
            if (pool.Count < maxPoolSize)
            {
                handle.Instance.SetActive(false);
                handle.Instance.transform.SetParent(transform);
                pool.Enqueue(handle.Instance);
            }
            else
            {
                Destroy(handle.Instance);
            }
        }

        /// <summary>停止句柄协程</summary>
        internal void StopHandleCoroutine(Coroutine coroutine)
        {
            if (coroutine != null)
                StopCoroutine(coroutine);
        }

        // ============================================================
        // 控制 API
        // ============================================================

        /// <summary>停止所有特效</summary>
        public void StopAll()
        {
            var handles = new List<VFXHandle>(_activeHandles.Values);
            foreach (var h in handles) h.Stop(false);
        }

        /// <summary>按层级停止</summary>
        public void StopByLayer(VFXLayer layer)
        {
            var handles = new List<VFXHandle>(_activeHandles.Values);
            foreach (var h in handles)
            {
                if (h.Layer == layer) h.Stop(false);
            }
        }

        /// <summary>设置全局特效缩放</summary>
        public void SetGlobalScale(float scale) => globalVFXScale = Mathf.Clamp(scale, 0.1f, 3f);

        /// <summary>启用/禁用特效</summary>
        public void SetVFXEnabled(bool enabled) => enableVFX = enabled;

        /// <summary>清空所有对象池</summary>
        public void ClearAllPools()
        {
            StopAll();
            foreach (var pool in _pools.Values)
            {
                foreach (var obj in pool)
                {
                    if (obj != null) Destroy(obj);
                }
                pool.Clear();
            }
            _pools.Clear();
        }

        /// <summary>当前活跃特效数</summary>
        public int ActiveCount => _activeHandles.Count;
    }

    // ============================================================
    // 屏幕特效管理器
    // ============================================================

    /// <summary>
    /// 屏幕特效管理器 —— 屏幕震动、闪光、慢动作
    /// </summary>
    public class ScreenEffectManager : MonoBehaviour
    {
        private static ScreenEffectManager _instance;
        public static ScreenEffectManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    var go = new GameObject("ScreenEffectManager");
                    _instance = go.AddComponent<ScreenEffectManager>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }

        [Header("震动配置")]
        [SerializeField] private float lightShakeAmount = 0.3f;
        [SerializeField] private float mediumShakeAmount = 0.8f;
        [SerializeField] private float heavyShakeAmount = 1.5f;
        [SerializeField] private float extremeShakeAmount = 3f;
        [SerializeField] private int shakeFrequency = 30;

        [Header("闪光配置")]
        [SerializeField] private GameObject flashOverlayPrefab;

        [Header("慢动作配置")]
        [SerializeField] private float defaultSlowMotionDuration = 0.3f;

        private Camera _mainCam;
        private Vector3 _originalCamPos;
        private Coroutine _shakeCoroutine;
        private Coroutine _slowMoCoroutine;

        private void Awake()
        {
            if (_instance != null && _instance != this) { Destroy(gameObject); return; }
            _instance = this;
            DontDestroyOnLoad(gameObject);
            _mainCam = Camera.main;
        }

        private void OnDestroy()
        {
            if (_instance == this) _instance = null;
            Time.timeScale = 1f;
        }

        // ── 屏幕震动 ──

        /// <summary>
        /// 屏幕震动
        /// </summary>
        public void Shake(ShakeIntensity intensity, float duration = 0.3f)
        {
            float amount = intensity switch
            {
                ShakeIntensity.Light => lightShakeAmount,
                ShakeIntensity.Medium => mediumShakeAmount,
                ShakeIntensity.Heavy => heavyShakeAmount,
                ShakeIntensity.Extreme => extremeShakeAmount,
                _ => 0f
            };

            if (amount <= 0f || duration <= 0f) return;

            if (_shakeCoroutine != null) StopCoroutine(_shakeCoroutine);
            _shakeCoroutine = StartCoroutine(ShakeRoutine(amount, duration));
        }

        private IEnumerator ShakeRoutine(float amount, float duration)
        {
            _mainCam = Camera.main;
            if (_mainCam == null) yield break;

            _originalCamPos = _mainCam.transform.localPosition;
            float elapsed = 0f;
            float interval = 1f / shakeFrequency;

            while (elapsed < duration)
            {
                elapsed += Time.unscaledDeltaTime;
                float progress = elapsed / duration;
                float currentAmount = amount * (1f - progress); // 衰减

                float offsetX = UnityEngine.Random.Range(-currentAmount, currentAmount);
                float offsetY = UnityEngine.Random.Range(-currentAmount, currentAmount);
                _mainCam.transform.localPosition = _originalCamPos + new Vector3(offsetX, offsetY, 0f);

                yield return new WaitForSecondsRealtime(interval);
            }

            if (_mainCam != null)
                _mainCam.transform.localPosition = _originalCamPos;
        }

        // ── 屏幕闪光 ──

        /// <summary>
        /// 全屏闪光效果
        /// </summary>
        public void Flash(Color color, float duration = 0.2f)
        {
            StartCoroutine(FlashRoutine(color, duration));
        }

        private IEnumerator FlashRoutine(Color color, float duration)
        {
            // 如果没有预制体，直接用UGUI Image方式
            if (flashOverlayPrefab == null)
            {
                // 简易实现：使用 Camera.backgroundColor 闪烁
                var cam = Camera.main;
                if (cam == null) yield break;

                Color origColor = cam.backgroundColor;
                cam.backgroundColor = color;
                yield return new WaitForSeconds(duration * 0.3f);
                cam.backgroundColor = origColor;
                yield break;
            }

            var overlay = Instantiate(flashOverlayPrefab);
            var img = overlay.GetComponent<UnityEngine.UI.Image>();
            if (img != null) img.color = color;

            yield return new WaitForSeconds(duration);

            Destroy(overlay);
        }

        // ── 慢动作 ──

        /// <summary>
        /// 触发慢动作效果
        /// </summary>
        /// <param name="scale">时间缩放（0.1=很慢, 0.5=半速）</param>
        /// <param name="duration">持续时间</param>
        public void SlowMotion(float scale, float duration = 0.3f)
        {
            if (scale <= 0f || scale >= 1f) return;
            if (_slowMoCoroutine != null) StopCoroutine(_slowMoCoroutine);
            _slowMoCoroutine = StartCoroutine(SlowMotionRoutine(scale, duration));
        }

        private IEnumerator SlowMotionRoutine(float scale, float duration)
        {
            Time.timeScale = scale;
            yield return new WaitForSecondsRealtime(duration);

            // 平滑恢复
            float elapsed = 0f;
            float recoverDuration = 0.15f;
            while (elapsed < recoverDuration)
            {
                elapsed += Time.unscaledDeltaTime;
                Time.timeScale = Mathf.Lerp(scale, 1f, elapsed / recoverDuration);
                yield return null;
            }

            Time.timeScale = 1f;
        }

        // ── 重置 ──

        /// <summary>重置所有屏幕效果</summary>
        public void ResetAll()
        {
            if (_shakeCoroutine != null) StopCoroutine(_shakeCoroutine);
            if (_slowMoCoroutine != null) StopCoroutine(_slowMoCoroutine);
            Time.timeScale = 1f;

            var cam = Camera.main;
            if (cam != null && _mainCam != null)
                cam.transform.localPosition = _originalCamPos;
        }
    }
}
