// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：音频管理器 —— 统一管理背景音乐（BGM）和音效（SFX）。
//       支持音量控制、淡入淡出切换、从 PlayerPrefs 恢复音量设置。
// =============================================================================

using System.Collections;
using UnityEngine;

namespace Jiuzhou.Core
{
    /// <summary>
    /// 音频管理器单例。
    /// <para>BGM: 背景音乐，同一时间只播放一首，支持切换时淡入淡出。</para>
    /// <para>SFX: 音效，支持多个同时播放。</para>
    /// </summary>
    public class AudioManager : Singleton<AudioManager>
    {
        // =====================================================================
        // 序列化字段（Inspector 配置）
        // =====================================================================

        [Header("音频源配置")]
        [Tooltip("BGM 音频源（挂载 AudioSource 组件）")]
        [SerializeField] private AudioSource _bgmSource;

        [Tooltip("SFX 音频源数量（默认 8 个，支持同时播放多个音效）")]
        [SerializeField] private int _sfxSourceCount = 8;

        [Header("默认音量")]
        [Range(0f, 1f)]
        [Tooltip("默认 BGM 音量")]
        [SerializeField] private float _defaultBgmVolume = 0.5f;

        [Range(0f, 1f)]
        [Tooltip("默认 SFX 音量")]
        [SerializeField] private float _defaultSfxVolume = 0.7f;

        [Header("淡入淡出设置")]
        [Tooltip("BGM 淡入淡出时间（秒）")]
        [SerializeField] private float _bgmFadeDuration = 1.0f;

        // =====================================================================
        // 私有字段
        // =====================================================================

        /// <summary>SFX 音频源池</summary>
        private AudioSource[] _sfxSources;

        /// <summary>SFX 音频源池的当前索引（轮询分配）</summary>
        private int _sfxSourceIndex = 0;

        /// <summary>BGM 淡入淡出协程</summary>
        private Coroutine _bgmFadeCoroutine;

        /// <summary>当前 BGM 音量（0.0 - 1.0）</summary>
        private float _bgmVolume = 0.5f;

        /// <summary>当前 SFX 音量（0.0 - 1.0）</summary>
        private float _sfxVolume = 0.7f;

        /// <summary>BGM 是否静音</summary>
        private bool _bgmMuted = false;

        /// <summary>SFX 是否静音</summary>
        private bool _sfxMuted = false;

        /// <summary>当前正在播放的 BGM 资源名（用于避免重复播放）</summary>
        private string _currentBgmName = string.Empty;

        // =====================================================================
        // 公开属性
        // =====================================================================

        /// <summary>获取/设置 BGM 音量（0.0 - 1.0），自动同步到音频源</summary>
        public float BgmVolume
        {
            get => _bgmVolume;
            set
            {
                _bgmVolume = Mathf.Clamp01(value);
                if (_bgmSource != null)
                {
                    _bgmSource.volume = _bgmMuted ? 0f : _bgmVolume;
                }
                PlayerPrefs.SetFloat(Constants.PlayerPrefsKeys.BGM_VOLUME, _bgmVolume);
            }
        }

        /// <summary>获取/设置 SFX 音量（0.0 - 1.0）</summary>
        public float SfxVolume
        {
            get => _sfxVolume;
            set
            {
                _sfxVolume = Mathf.Clamp01(value);
                PlayerPrefs.SetFloat(Constants.PlayerPrefsKeys.SFX_VOLUME, _sfxVolume);
            }
        }

        /// <summary>获取/设置 BGM 是否静音</summary>
        public bool BgmMuted
        {
            get => _bgmMuted;
            set
            {
                _bgmMuted = value;
                if (_bgmSource != null)
                {
                    _bgmSource.volume = _bgmMuted ? 0f : _bgmVolume;
                }
            }
        }

        /// <summary>获取/设置 SFX 是否静音</summary>
        public bool SfxMuted
        {
            get => _sfxMuted;
            set => _sfxMuted = value;
        }

        // =====================================================================
        // 生命周期
        // =====================================================================

        protected override void OnInitialize()
        {
            base.OnInitialize();
            InitializeAudioSources();
            LoadVolumeSettings();
            Debug.Log("[AudioManager] 初始化完成。");
        }

        /// <summary>
        /// 初始化音频源组件。
        /// </summary>
        private void InitializeAudioSources()
        {
            // 如果未在 Inspector 中赋值，自动创建 BGM AudioSource
            if (_bgmSource == null)
            {
                GameObject bgmObj = new GameObject("BGM_Source");
                bgmObj.transform.SetParent(transform);
                _bgmSource = bgmObj.AddComponent<AudioSource>();
                _bgmSource.loop = true;
                _bgmSource.playOnAwake = false;
                _bgmSource.priority = 0; // 最高优先级
                Debug.Log("[AudioManager] 自动创建 BGM AudioSource。");
            }

            // 创建 SFX AudioSource 池
            _sfxSources = new AudioSource[_sfxSourceCount];
            for (int i = 0; i < _sfxSourceCount; i++)
            {
                GameObject sfxObj = new GameObject($"SFX_Source_{i}");
                sfxObj.transform.SetParent(transform);
                _sfxSources[i] = sfxObj.AddComponent<AudioSource>();
                _sfxSources[i].loop = false;
                _sfxSources[i].playOnAwake = false;
                _sfxSources[i].priority = 128; // 普通优先级
            }
        }

        /// <summary>
        /// 从 PlayerPrefs 加载保存的音量设置。
        /// </summary>
        private void LoadVolumeSettings()
        {
            _bgmVolume = PlayerPrefs.GetFloat(Constants.PlayerPrefsKeys.BGM_VOLUME, _defaultBgmVolume);
            _sfxVolume = PlayerPrefs.GetFloat(Constants.PlayerPrefsKeys.SFX_VOLUME, _defaultSfxVolume);

            // 应用到音频源
            _bgmSource.volume = _bgmMuted ? 0f : _bgmVolume;
        }

        // =====================================================================
        // BGM 播放控制
        // =====================================================================

        /// <summary>
        /// 播放背景音乐（从 Resources 文件夹加载）。
        /// 如果当前正在播放相同的 BGM，则不重复播放。
        /// </summary>
        /// <param name="resourcePath">音频资源路径（相对于 Resources 文件夹），
        /// 例如 "Audio/BGM/MainCity"</param>
        public void PlayBGM(string resourcePath)
        {
            if (string.IsNullOrEmpty(resourcePath))
            {
                Debug.LogWarning("[AudioManager] PlayBGM: 资源路径为空。");
                return;
            }

            // 如果正在播放相同的 BGM，跳过
            if (_currentBgmName == resourcePath && _bgmSource != null && _bgmSource.isPlaying)
            {
                return;
            }

            // 加载音频资源
            AudioClip clip = Resources.Load<AudioClip>(resourcePath);
            if (clip == null)
            {
                Debug.LogError($"[AudioManager] PlayBGM: 无法加载音频资源 '{resourcePath}'。");
                return;
            }

            PlayBGMClip(clip);
            _currentBgmName = resourcePath;
        }

        /// <summary>
        /// 直接使用 AudioClip 播放 BGM。
        /// </summary>
        /// <param name="clip">音频剪辑</param>
        /// <param name="fadeIn">是否淡入</param>
        public void PlayBGMClip(AudioClip clip, bool fadeIn = true)
        {
            if (clip == null || _bgmSource == null) return;

            // 如果有正在进行的淡入淡出，停止它
            if (_bgmFadeCoroutine != null)
            {
                StopCoroutine(_bgmFadeCoroutine);
                _bgmFadeCoroutine = null;
            }

            if (fadeIn)
            {
                StartCoroutine(FadeAndPlayBGM(clip));
            }
            else
            {
                _bgmSource.clip = clip;
                _bgmSource.volume = _bgmMuted ? 0f : _bgmVolume;
                _bgmSource.Play();
            }
        }

        /// <summary>
        /// 停止背景音乐（支持淡出）。
        /// </summary>
        /// <param name="fadeOut">是否淡出</param>
        public void StopBGM(bool fadeOut = true)
        {
            if (_bgmSource == null) return;

            if (_bgmFadeCoroutine != null)
            {
                StopCoroutine(_bgmFadeCoroutine);
                _bgmFadeCoroutine = null;
            }

            if (fadeOut && _bgmSource.isPlaying)
            {
                _bgmFadeCoroutine = StartCoroutine(FadeOutBGM());
            }
            else
            {
                _bgmSource.Stop();
                _bgmSource.clip = null;
                _currentBgmName = string.Empty;
            }
        }

        /// <summary>
        /// 暂停 BGM。
        /// </summary>
        public void PauseBGM()
        {
            if (_bgmSource != null && _bgmSource.isPlaying)
            {
                _bgmSource.Pause();
            }
        }

        /// <summary>
        /// 恢复 BGM 播放。
        /// </summary>
        public void ResumeBGM()
        {
            if (_bgmSource != null && _bgmSource.clip != null && !_bgmSource.isPlaying)
            {
                _bgmSource.UnPause();
            }
        }

        // =====================================================================
        // SFX 播放控制
        // =====================================================================

        /// <summary>
        /// 播放音效（从 Resources 文件夹加载）。
        /// </summary>
        /// <param name="resourcePath">音频资源路径（相对于 Resources 文件夹）</param>
        /// <param name="volumeScale">音量缩放（0.0 - 1.0），与 SfxVolume 相乘</param>
        public void PlaySFX(string resourcePath, float volumeScale = 1f)
        {
            if (string.IsNullOrEmpty(resourcePath))
            {
                Debug.LogWarning("[AudioManager] PlaySFX: 资源路径为空。");
                return;
            }

            if (_sfxMuted) return;

            AudioClip clip = Resources.Load<AudioClip>(resourcePath);
            if (clip == null)
            {
                Debug.LogError($"[AudioManager] PlaySFX: 无法加载音频资源 '{resourcePath}'。");
                return;
            }

            PlaySFXClip(clip, volumeScale);
        }

        /// <summary>
        /// 直接使用 AudioClip 播放音效。
        /// </summary>
        /// <param name="clip">音频剪辑</param>
        /// <param name="volumeScale">音量缩放（0.0 - 1.0）</param>
        public void PlaySFXClip(AudioClip clip, float volumeScale = 1f)
        {
            if (clip == null || _sfxSources == null || _sfxSources.Length == 0) return;

            if (_sfxMuted) return;

            // 从池中获取一个空闲的 AudioSource
            AudioSource source = GetAvailableSFXSource();
            if (source == null)
            {
                Debug.LogWarning("[AudioManager] PlaySFXClip: 没有可用的 SFX 音频源。");
                return;
            }

            // 播放音效
            source.clip = clip;
            source.volume = _sfxVolume * Mathf.Clamp01(volumeScale);
            source.pitch = 1f;
            source.Play();

            // 通过协程在播放结束后自动释放
            StartCoroutine(AutoStopSFXAfterPlayback(source));
        }

        /// <summary>
        /// 播放一次性音效（使用 AudioSource.PlayClipAtPoint）。
        /// 适用于不需要精确控制的临时音效播放。
        /// </summary>
        /// <param name="clip">音频剪辑</param>
        /// <param name="position">3D 播放位置</param>
        /// <param name="volumeScale">音量缩放</param>
        public void PlaySFXOneShot(AudioClip clip, Vector3 position, float volumeScale = 1f)
        {
            if (clip == null || _sfxMuted) return;
            AudioSource.PlayClipAtPoint(clip, position, _sfxVolume * Mathf.Clamp01(volumeScale));
        }

        // =====================================================================
        // 内部协程
        // =====================================================================

        /// <summary>
        /// BGM 淡入并播放协程。
        /// </summary>
        private IEnumerator FadeAndPlayBGM(AudioClip clip)
        {
            // 先停止当前 BGM
            if (_bgmSource.isPlaying)
            {
                // 快速淡出当前 BGM
                float fadeOutDuration = Mathf.Min(_bgmFadeDuration * 0.5f, 0.5f);
                float startVolume = _bgmSource.volume;
                float elapsed = 0f;

                while (elapsed < fadeOutDuration)
                {
                    elapsed += Time.deltaTime;
                    _bgmSource.volume = Mathf.Lerp(startVolume, 0f, elapsed / fadeOutDuration);
                    yield return null;
                }

                _bgmSource.Stop();
            }

            // 设置新的 BGM 并淡入
            _bgmSource.clip = clip;
            _bgmSource.volume = 0f;
            _bgmSource.Play();

            float targetVolume = _bgmMuted ? 0f : _bgmVolume;
            elapsed = 0f;

            while (elapsed < _bgmFadeDuration)
            {
                elapsed += Time.deltaTime;
                _bgmSource.volume = Mathf.Lerp(0f, targetVolume, elapsed / _bgmFadeDuration);
                yield return null;
            }

            _bgmSource.volume = targetVolume;
            _bgmFadeCoroutine = null;
        }

        /// <summary>
        /// BGM 淡出协程。
        /// </summary>
        private IEnumerator FadeOutBGM()
        {
            float startVolume = _bgmSource.volume;
            float elapsed = 0f;

            while (elapsed < _bgmFadeDuration)
            {
                elapsed += Time.deltaTime;
                _bgmSource.volume = Mathf.Lerp(startVolume, 0f, elapsed / _bgmFadeDuration);
                yield return null;
            }

            _bgmSource.Stop();
            _bgmSource.clip = null;
            _currentBgmName = string.Empty;
            _bgmFadeCoroutine = null;
        }

        /// <summary>
        /// SFX 播放完毕后自动停止协程。
        /// </summary>
        private IEnumerator AutoStopSFXAfterPlayback(AudioSource source)
        {
            if (source == null || source.clip == null) yield break;

            // 等待音频播放完成
            yield return new WaitForSeconds(source.clip.length);

            if (source != null)
            {
                source.Stop();
                source.clip = null;
            }
        }

        // =====================================================================
        // 音频源池管理
        // =====================================================================

        /// <summary>
        /// 从 SFX 音频源池中获取一个可用的 AudioSource。
        /// 使用轮询（Round Robin）策略分配。
        /// </summary>
        /// <returns>可用的 AudioSource</returns>
        private AudioSource GetAvailableSFXSource()
        {
            if (_sfxSources == null || _sfxSources.Length == 0) return null;

            // 尝试找到一个不在播放中的源
            for (int i = 0; i < _sfxSources.Length; i++)
            {
                int idx = (_sfxSourceIndex + i) % _sfxSources.Length;
                if (!_sfxSources[idx].isPlaying)
                {
                    _sfxSourceIndex = (idx + 1) % _sfxSources.Length;
                    return _sfxSources[idx];
                }
            }

            // 所有源都在播放，返回下一个（轮询替换）
            AudioSource source = _sfxSources[_sfxSourceIndex];
            _sfxSourceIndex = (_sfxSourceIndex + 1) % _sfxSources.Length;
            return source;
        }

        // =====================================================================
        // 全局控制
        // =====================================================================

        /// <summary>
        /// 静音所有音频。
        /// </summary>
        public void MuteAll()
        {
            _bgmMuted = true;
            _sfxMuted = true;
            if (_bgmSource != null) _bgmSource.volume = 0f;
        }

        /// <summary>
        /// 取消所有静音。
        /// </summary>
        public void UnmuteAll()
        {
            _bgmMuted = false;
            _sfxMuted = false;
            if (_bgmSource != null) _bgmSource.volume = _bgmVolume;
        }
    }
}
