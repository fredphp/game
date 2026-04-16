// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Skill System
// =============================================================================
// 描述：技能音效控制器 —— 管理 技能施法音效、命中音效、语音台词、环境音效。
//       支持音效组合播放（多音轨叠加）、3D 空间音效、音效延迟、音量淡入。
//       与 AudioManager 协作，按元素/稀有度自动选择默认音效。
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Jiuzhou.Zhengding.Module.Skill
{
    // ============================================================
    // 音效播放句柄
    // ============================================================

    /// <summary>
    /// 音效播放句柄 —— 控制单个音效的播放/停止/淡出
    /// </summary>
    public class SFXHandle
    {
        public int Id { get; }
        public string Name { get; }
        public AudioSource Source { get; private set; }
        public bool IsPlaying { get; private set; }
        public float ElapsedTime { get; private set; }
        public float TotalDuration { get; }

        private readonly SkillAudioController _controller;
        private Coroutine _lifetimeCoroutine;
        private bool _isFadingOut;

        public event Action<SFXHandle> OnComplete;

        public SFXHandle(int id, string name, AudioSource source, float duration, SkillAudioController controller)
        {
            Id = id;
            Name = name;
            Source = source;
            TotalDuration = duration;
            _controller = controller;
            IsPlaying = true;
            _isFadingOut = false;
            ElapsedTime = 0f;
        }

        /// <summary>停止音效（立即或淡出）</summary>
        public void Stop(bool fadeOut = false, float fadeDuration = 0.3f)
        {
            if (!IsPlaying) return;
            IsPlaying = false;
            _isFadingOut = true;

            if (fadeOut && Source != null)
            {
                _controller.StartCoroutine(FadeOutRoutine(this, fadeDuration));
            }
            else
            {
                Release();
            }
        }

        /// <summary>暂停音效</summary>
        public void Pause()
        {
            if (Source != null && IsPlaying) Source.Pause();
        }

        /// <summary>恢复音效</summary>
        public void Resume()
        {
            if (Source != null && IsPlaying) Source.UnPause();
        }

        /// <summary>设置音量</summary>
        public void SetVolume(float volume)
        {
            if (Source != null) Source.volume = Mathf.Clamp01(volume);
        }

        /// <summary>设置音调</summary>
        public void SetPitch(float pitch)
        {
            if (Source != null) Source.pitch = Mathf.Clamp(pitch, 0.5f, 2f);
        }

        internal void StartLifetime(MonoBehaviour runner)
        {
            _lifetimeCoroutine = runner.StartCoroutine(LifetimeRoutine());
        }

        private IEnumerator LifetimeRoutine()
        {
            ElapsedTime = 0f;

            if (TotalDuration > 0f)
            {
                yield return new WaitForSeconds(TotalDuration);
            }
            else if (Source != null && Source.clip != null)
            {
                yield return new WaitForSeconds(Source.clip.length);
            }
            else
            {
                yield return new WaitForSeconds(2f);
            }

            Complete();
        }

        private IEnumerator FadeOutRoutine(SFXHandle handle, float duration)
        {
            if (handle.Source == null) { Release(); yield break; }

            float startVolume = handle.Source.volume;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                handle.Source.volume = Mathf.Lerp(startVolume, 0f, t);
                yield return null;
            }

            Release();
        }

        private void Complete()
        {
            IsPlaying = false;
            OnComplete?.Invoke(this);
            Release();
        }

        private void Release()
        {
            if (_lifetimeCoroutine != null && _controller != null)
            {
                _controller.StopSFXCoroutine(_lifetimeCoroutine);
                _lifetimeCoroutine = null;
            }
            _controller?.ReturnSFXHandle(this);
        }
    }

    // ============================================================
    // 技能音效控制器
    // ============================================================

    /// <summary>
    /// 技能音效控制器 —— 管理技能相关音效的生命周期
    /// <para>音效池: 预创建多个 AudioSource 实现同时播放</para>
    /// <para>组合播放: 一个技能可触发多个音效层</para>
    /// </summary>
    public class SkillAudioController : MonoBehaviour
    {
        private static SkillAudioController _instance;
        public static SkillAudioController Instance
        {
            get
            {
                if (_instance == null)
                {
                    var go = new GameObject("SkillAudioController");
                    _instance = go.AddComponent<SkillAudioController>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }

        // ── 音效源池 ──
        private readonly List<AudioSource> _audioSources = new List<AudioSource>();
        private readonly List<bool> _sourceBusy = new List<bool>();
        private int _sourceCount = 12;
        private int _nextHandleId = 1;
        private readonly Dictionary<int, SFXHandle> _activeHandles = new Dictionary<int, SFXHandle>();

        // ── 全局配置 ──
        [Header("音效配置")]
        [SerializeField] private float globalSFXVolume = 1f;
        [SerializeField] private bool enableSFX = true;
        [SerializeField] private float defaultFadeDuration = 0.2f;
        [SerializeField] private int sfxPriority = 128;

        // ── 事件 ──
        public event Action<SFXHandle> OnSFXPlayed;
        public event Action<SFXHandle> OnSFXComplete;

        // ── 缓存 ──
        private readonly Dictionary<string, AudioClip> _clipCache = new Dictionary<string, AudioClip>();

        private void Awake()
        {
            if (_instance != null && _instance != this) { Destroy(gameObject); return; }
            _instance = this;
            DontDestroyOnLoad(gameObject);

            InitializeAudioSources();
            Debug.Log("[SkillAudioController] 初始化完成");
        }

        private void OnDestroy()
        {
            if (_instance == this) _instance = null;
            StopAll();
        }

        // ============================================================
        // 初始化
        // ============================================================

        private void InitializeAudioSources()
        {
            for (int i = 0; i < _sourceCount; i++)
            {
                var sourceObj = new GameObject($"SFX_Skill_{i:D3}");
                sourceObj.transform.SetParent(transform);

                var source = sourceObj.AddComponent<AudioSource>();
                source.playOnAwake = false;
                source.loop = false;
                source.spatialBlend = 0f; // 默认2D
                source.priority = sfxPriority;
                source.dopplerLevel = 0f;

                _audioSources.Add(source);
                _sourceBusy.Add(false);
            }
        }

        // ============================================================
        // 核心播放 API
        // ============================================================

        /// <summary>
        /// 播放音效 —— 核心方法
        /// </summary>
        public SFXHandle PlaySFX(string resourcePath, float volumeScale = 1f,
            float pitch = 1f, float delay = 0f, bool is3D = false,
            Vector3 worldPosition = default, float maxDistance = 20f)
        {
            if (!enableSFX) return null;

            if (delay > 0f)
            {
                StartCoroutine(DelayedPlaySFX(resourcePath, volumeScale, pitch, delay, is3D, worldPosition, maxDistance));
                return null;
            }

            return PlaySFXNow(resourcePath, volumeScale, pitch, is3D, worldPosition, maxDistance);
        }

        /// <summary>
        /// 播放 AudioClip
        /// </summary>
        public SFXHandle PlaySFXClip(AudioClip clip, float volumeScale = 1f,
            float pitch = 1f, bool is3D = false, Vector3 worldPosition = default)
        {
            if (!enableSFX || clip == null) return null;

            int sourceIndex = GetAvailableSource();
            if (sourceIndex < 0)
            {
                Debug.LogWarning("[SkillAudioController] 没有可用的音效源");
                return null;
            }

            var source = _audioSources[sourceIndex];
            SetupSource(source, clip, volumeScale * globalSFXVolume, pitch, is3D, worldPosition);
            source.Play();
            _sourceBusy[sourceIndex] = true;

            var handle = new SFXHandle(_nextHandleId++, clip.name, source, clip.length, this);
            handle.StartLifetime(this);
            _activeHandles[handle.Id] = handle;
            OnSFXPlayed?.Invoke(handle);

            // 播放完毕后释放源
            StartCoroutine(ReleaseSourceOnComplete(sourceIndex, clip.length));

            return handle;
        }

        // ============================================================
        // 技能音效组合播放
        // ============================================================

        /// <summary>
        /// 播放完整技能音效序列 —— 按照配置自动播放施法+命中+环境+语音
        /// </summary>
        public IEnumerator PlaySkillAudioSequence(SkillVFXProfile profile,
            Vector3 casterPosition, Vector3 targetPosition, float battleSpeed = 1f)
        {
            if (profile == null) yield break;

            // 1. 施法音效
            PlaySkillAudioAtPosition(profile.CastAudio, casterPosition, battleSpeed);

            // 2. 环境音效（低音铺垫）
            PlaySkillAudioAtPosition(profile.AmbientAudio, casterPosition, battleSpeed);

            // 3. 语音台词
            PlaySkillAudioAtPosition(profile.VoiceAudio, casterPosition, battleSpeed);

            // 4. 等待弹道时间（如果有弹道）
            if (profile.HasProjectile)
            {
                float travelTime = Vector3.Distance(casterPosition, targetPosition) /
                                   Mathf.Max(profile.ProjectileSpeed, 1f);
                yield return new WaitForSeconds(travelTime / battleSpeed);
            }

            // 5. 命中音效
            PlaySkillAudioAtPosition(profile.HitAudio, targetPosition, battleSpeed);
        }

        /// <summary>
        /// 按元素播放默认技能音效
        /// </summary>
        public void PlayElementSkillSFX(ElementType element, Vector3 position,
            bool isCast = true, float volumeScale = 1f)
        {
            string path = isCast ?
                ElementDefaults.GetCastAudioPath(element) :
                ElementDefaults.GetHitAudioPath(element);

            PlaySFX(path, volumeScale, is3D: false);
        }

        /// <summary>
        /// 按稀有度播放不同品质的命中音效
        /// </summary>
        public void PlayRarityHitSFX(int rarity, Vector3 position, bool isCritical = false)
        {
            string hitPath;
            switch (rarity)
            {
                case 5: // SSR
                    hitPath = isCritical ?
                        "Audio/SFX/Skill/SSR_Critical_Hit" :
                        "Audio/SFX/Skill/SSR_Normal_Hit";
                    break;
                case 4: // SR
                    hitPath = isCritical ?
                        "Audio/SFX/Skill/SR_Critical_Hit" :
                        "Audio/SFX/Skill/SR_Normal_Hit";
                    break;
                default: // R
                    hitPath = isCritical ?
                        "Audio/SFX/Skill/R_Critical_Hit" :
                        "Audio/SFX/Skill/R_Normal_Hit";
                    break;
            }

            float volume = isCritical ? 1.2f : 1f;
            PlaySFX(hitPath, volume, is3D: false);
        }

        /// <summary>
        /// 播放普通攻击音效
        /// </summary>
        public void PlayNormalAttackSFX(ElementType element, Vector3 position)
        {
            string path = $"Audio/SFX/Combat/{ElementDefaults.GetElementName(element)}_Attack";
            PlaySFX(path, 0.8f, is3D: false);
        }

        /// <summary>
        /// 播放受击音效
        /// </summary>
        public void PlayHitReactSFX(bool isCritical = false)
        {
            string path = isCritical ?
                "Audio/SFX/Combat/Critical_Hit_React" :
                "Audio/SFX/Combat/Normal_Hit_React";
            PlaySFX(path, isCritical ? 1f : 0.7f);
        }

        /// <summary>
        /// 播放暴击音效
        /// </summary>
        public void PlayCriticalSFX()
        {
            PlaySFX("Audio/SFX/UI/Critical_Alert", 1.2f);
        }

        // ============================================================
        // 控制方法
        // ============================================================

        /// <summary>停止所有音效</summary>
        public void StopAll()
        {
            foreach (var handle in new List<SFXHandle>(_activeHandles.Values))
            {
                handle.Stop(true, defaultFadeDuration);
            }
        }

        /// <summary>按名称停止音效</summary>
        public void StopByName(string name)
        {
            foreach (var handle in new List<SFXHandle>(_activeHandles.Values))
            {
                if (handle.Name.Contains(name))
                    handle.Stop(true, defaultFadeDuration);
            }
        }

        /// <summary>设置全局音量</summary>
        public void SetGlobalVolume(float volume) => globalSFXVolume = Mathf.Clamp01(volume);

        /// <summary>启用/禁用音效</summary>
        public void SetSFXEnabled(bool enabled) => enableSFX = enabled;

        // ============================================================
        // 内部方法
        // ============================================================

        private SFXHandle PlaySFXNow(string resourcePath, float volumeScale, float pitch,
            bool is3D, Vector3 worldPosition, float maxDistance)
        {
            var clip = LoadClip(resourcePath);
            if (clip == null)
            {
                Debug.LogWarning($"[SkillAudioController] 无法加载音效: {resourcePath}");
                return null;
            }

            return PlaySFXClip(clip, volumeScale, pitch, is3D, worldPosition);
        }

        private void PlaySkillAudioAtPosition(AudioConfig config, Vector3 position, float battleSpeed)
        {
            if (config == null || !config.IsValid) return;

            var clip = config.AudioClip;
            if (clip == null && !string.IsNullOrEmpty(config.ResourcePath))
            {
                clip = LoadClip(config.ResourcePath);
            }
            if (clip == null) return;

            if (config.Delay > 0f)
            {
                StartCoroutine(DelayedPlayClip(clip, config.VolumeScale, config.Pitch,
                    config.Delay / battleSpeed, config.Is3D, position));
            }
            else
            {
                PlaySFXClip(clip, config.VolumeScale, config.Pitch, config.Is3D, position);
            }
        }

        private IEnumerator DelayedPlaySFX(string resourcePath, float volumeScale,
            float pitch, float delay, bool is3D, Vector3 position, float maxDist)
        {
            yield return new WaitForSeconds(delay);
            PlaySFXNow(resourcePath, volumeScale, pitch, is3D, position, maxDist);
        }

        private IEnumerator DelayedPlayClip(AudioClip clip, float volume, float pitch,
            float delay, bool is3D, Vector3 position)
        {
            yield return new WaitForSeconds(delay);
            PlaySFXClip(clip, volume, pitch, is3D, position);
        }

        private int GetAvailableSource()
        {
            for (int i = 0; i < _sourceBusy.Count; i++)
            {
                if (!_sourceBusy[i] && _audioSources[i] != null && !_audioSources[i].isPlaying)
                {
                    return i;
                }
            }

            // 所有源都忙，强制占用最旧的
            for (int i = 0; i < _sourceBusy.Count; i++)
            {
                if (_audioSources[i] != null)
                {
                    _audioSources[i].Stop();
                    _sourceBusy[i] = false;
                    return i;
                }
            }

            return -1;
        }

        private void SetupSource(AudioSource source, AudioClip clip, float volume,
            float pitch, bool is3D, Vector3 position)
        {
            source.clip = clip;
            source.volume = volume;
            source.pitch = pitch;

            if (is3D)
            {
                source.spatialBlend = 1f;
                source.transform.position = position;
                source.minDistance = 1f;
                source.maxDistance = 20f;
                source.rolloffMode = AudioRolloffMode.Linear;
            }
            else
            {
                source.spatialBlend = 0f;
            }
        }

        private IEnumerator ReleaseSourceOnComplete(int sourceIndex, float duration)
        {
            yield return new WaitForSeconds(duration + 0.1f);
            if (sourceIndex < _sourceBusy.Count)
            {
                _sourceBusy[sourceIndex] = false;
            }
        }

        private AudioClip LoadClip(string resourcePath)
        {
            if (string.IsNullOrEmpty(resourcePath)) return null;

            if (_clipCache.TryGetValue(resourcePath, out var cached))
                return cached;

            var clip = Resources.Load<AudioClip>(resourcePath);
            if (clip != null)
            {
                _clipCache[resourcePath] = clip;
            }
            return clip;
        }

        internal void StopSFXCoroutine(Coroutine coroutine)
        {
            if (coroutine != null) StopCoroutine(coroutine);
        }

        private void ReturnSFXHandle(SFXHandle handle)
        {
            if (handle == null) return;
            _activeHandles.Remove(handle.Id);
            OnSFXComplete?.Invoke(handle);
        }

        /// <summary>当前活跃音效数</summary>
        public int ActiveCount => _activeHandles.Count;
    }
}
