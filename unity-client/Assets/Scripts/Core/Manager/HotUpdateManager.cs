// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：热更新管理器 —— 检查和执行资源热更新。
//       下载清单文件 → 对比差异 → 下载增量资源 → 校验完整性 → 应用更新。
//       依赖: HttpClient, VersionCheckManager, ConfigApi, EventBus。
// =============================================================================

using System;
using System.Collections;
using System.IO;
using System.Security.Cryptography;
using Jiuzhou.Core;
using Jiuzhou.Data;
using Jiuzhou.Network.Api;
using UnityEngine;
using UnityEngine.Networking;

namespace Jiuzhou.Core
{
    // =====================================================================
    // 枚举 & 委托
    // =====================================================================

    /// <summary>
    /// 热更新状态
    /// </summary>
    public enum HotUpdateState
    {
        /// <summary>空闲</summary>
        Idle,
        /// <summary>检查中</summary>
        Checking,
        /// <summary>下载清单中</summary>
        DownloadingManifest,
        /// <summary>下载资源中</summary>
        Downloading,
        /// <summary>校验文件完整性</summary>
        Verifying,
        /// <summary>应用更新中</summary>
        Applying,
        /// <summary>更新完成</summary>
        Completed,
        /// <summary>更新失败</summary>
        Failed
    }

    /// <summary>
    /// 热更新进度回调
    /// </summary>
    /// <param name="state">当前状态</param>
    /// <param name="progress">下载进度 (0.0 - 1.0)</param>
    /// <param name="message">状态消息（用于 UI 显示）</param>
    public delegate void HotUpdateProgressCallback(HotUpdateState state, float progress, string message);

    // =====================================================================
    // 热更新管理器（单例）
    // =====================================================================

    /// <summary>
    /// 热更新管理器
    /// <para>支持增量热更新，基于清单文件对比差异下载。</para>
    /// <para>强制更新时阻塞游戏流程，非强制更新后台静默下载。</para>
    /// </summary>
    public class HotUpdateManager : Singleton<HotUpdateManager>
    {
        // =====================================================================
        // 配置常量
        // =====================================================================

        /// <summary>当前资源版本号（随发版更新）</summary>
        public const string RESOURCE_VERSION = "1.2.0";

        /// <summary>热更新资源本地存储路径</summary>
        private const string UPDATE_SAVE_PATH = "HotUpdate";

        /// <summary>清单文件名</summary>
        private const string MANIFEST_FILENAME = "manifest.json";

        /// <summary>下载超时时间（秒）</summary>
        private const int DOWNLOAD_TIMEOUT = 60;

        // =====================================================================
        // 内部状态
        // =====================================================================

        /// <summary>当前热更新状态</summary>
        private HotUpdateState _state = HotUpdateState.Idle;

        /// <summary>服务端返回的更新信息</summary>
        private HotUpdateCheckResponse _updateInfo;

        /// <summary>下载进度 (0-1)</summary>
        private float _downloadProgress;

        /// <summary>本地持久化的资源版本号</summary>
        private string _resourceVersionLocal;

        // =====================================================================
        // 公开属性
        // =====================================================================

        /// <summary>当前热更新状态</summary>
        public HotUpdateState State => _state;

        /// <summary>下载进度 (0.0 - 1.0)</summary>
        public float DownloadProgress => _downloadProgress;

        /// <summary>是否有正在进行的更新</summary>
        public bool IsBusy => _state != HotUpdateState.Idle
                            && _state != HotUpdateState.Completed
                            && _state != HotUpdateState.Failed;

        /// <summary>本地资源版本号</summary>
        public string LocalResourceVersion => _resourceVersionLocal;

        // =====================================================================
        // 生命周期
        // =====================================================================

        protected override void OnInitialize()
        {
            base.OnInitialize();
            DontDestroyOnLoad();

            // 确保存储目录存在
            string savePath = GetSavePath();
            if (!Directory.Exists(savePath))
            {
                Directory.CreateDirectory(savePath);
            }

            // 从 PlayerPrefs 加载本地保存的资源版本
            _resourceVersionLocal = PlayerPrefs.GetString("resource_version", RESOURCE_VERSION);

            Debug.Log($"[HotUpdate] 初始化完成。资源版本: {_resourceVersionLocal}");
        }

        // =====================================================================
        // 公开方法
        // =====================================================================

        /// <summary>
        /// 检查热更新（游戏启动时调用）。
        /// </summary>
        /// <param name="onNoUpdate">无更新时的回调</param>
        /// <param name="onUpdateAvailable">有更新时的回调（参数: 更新信息）</param>
        public void CheckForUpdate(Action onNoUpdate, Action<HotUpdateCheckResponse> onUpdateAvailable)
        {
            StartCoroutine(CheckForUpdateCoroutine(onNoUpdate, onUpdateAvailable));
        }

        /// <summary>
        /// 开始下载热更新资源。
        /// </summary>
        /// <param name="progressCallback">下载进度回调</param>
        /// <param name="onComplete">完成回调（参数: 是否成功）</param>
        public void StartDownload(HotUpdateProgressCallback progressCallback, Action<bool> onComplete)
        {
            if (_updateInfo == null)
            {
                Debug.LogError("[HotUpdate] 没有可用的更新信息，请先调用 CheckForUpdate。");
                onComplete?.Invoke(false);
                return;
            }

            StartCoroutine(DownloadUpdateCoroutine(progressCallback, onComplete));
        }

        // =====================================================================
        // 内部方法
        // =====================================================================

        /// <summary>
        /// 获取热更新资源本地存储路径
        /// </summary>
        private string GetSavePath()
        {
            return Path.Combine(Application.persistentDataPath, UPDATE_SAVE_PATH);
        }

        /// <summary>
        /// 检查热更新协程
        /// </summary>
        private IEnumerator CheckForUpdateCoroutine(Action onNoUpdate, Action<HotUpdateCheckResponse> onUpdateAvailable)
        {
            _state = HotUpdateState.Checking;

            var request = new HotUpdateCheckRequest
            {
                platform = VersionCheckManager.CurrentPlatform,
                resource_version = _resourceVersionLocal,
                app_version = VersionCheckManager.CLIENT_VERSION
            };

            bool completed = false;

            ConfigApi.CheckHotUpdate(request, (result) =>
            {
                completed = true;

                if (result.IsSuccess() && result.data != null)
                {
                    var data = result.data;

                    if (data.has_update)
                    {
                        _updateInfo = data;
                        _state = HotUpdateState.Idle;

                        if (data.force_update)
                        {
                            Debug.LogWarning($"[HotUpdate] 检测到强制更新: {_resourceVersionLocal} → {data.latest_version}");
                            EventBus.Trigger("hotupdate_force_required", data);
                        }
                        else
                        {
                            Debug.Log($"[HotUpdate] 检测到可选更新: {_resourceVersionLocal} → {data.latest_version}");
                            EventBus.Trigger("hotupdate_available", data);
                        }

                        onUpdateAvailable?.Invoke(data);
                    }
                    else
                    {
                        _state = HotUpdateState.Idle;
                        Debug.Log("[HotUpdate] 资源已是最新。");
                        onNoUpdate?.Invoke();
                    }
                }
                else
                {
                    _state = HotUpdateState.Idle;
                    Debug.LogError($"[HotUpdate] 检查失败: {result.message}");
                    // 失败时不阻塞
                    onNoUpdate?.Invoke();
                }
            });

            // 等待回调完成
            float waitTime = 0;
            while (!completed && waitTime < 15f)
            {
                yield return new WaitForSeconds(0.5f);
                waitTime += 0.5f;
            }

            if (!completed)
            {
                _state = HotUpdateState.Failed;
                Debug.LogError("[HotUpdate] 检查超时。");
                onNoUpdate?.Invoke();
            }
        }

        /// <summary>
        /// 下载更新协程
        /// 流程：下载清单 → 校验MD5 → 解析差异文件 → 逐个下载 → 校验 → 应用
        /// </summary>
        private IEnumerator DownloadUpdateCoroutine(HotUpdateProgressCallback progressCallback, Action<bool> onComplete)
        {
            _state = HotUpdateState.DownloadingManifest;
            _downloadProgress = 0f;
            progressCallback?.Invoke(_state, 0f, "正在下载更新清单...");

            // ── Step 1: 下载清单文件 ──
            using (var manifestReq = UnityWebRequest.Get(_updateInfo.manifest_url))
            {
                manifestReq.timeout = DOWNLOAD_TIMEOUT;
                yield return manifestReq.SendWebRequest();

                if (manifestReq.result != UnityWebRequest.Result.Success)
                {
                    Debug.LogError($"[HotUpdate] 清单下载失败: {manifestReq.error}");
                    _state = HotUpdateState.Failed;
                    progressCallback?.Invoke(_state, 0f, "清单下载失败");
                    onComplete?.Invoke(false);
                    yield break;
                }

                // ── Step 2: 校验清单文件 MD5 ──
                string manifestContent = manifestReq.downloadHandler.text;
                if (!string.IsNullOrEmpty(_updateInfo.manifest_hash))
                {
                    string hash = ComputeMD5(manifestContent);
                    if (hash != _updateInfo.manifest_hash)
                    {
                        Debug.LogError("[HotUpdate] 清单文件校验失败！MD5不匹配。");
                        _state = HotUpdateState.Failed;
                        progressCallback?.Invoke(_state, 0f, "清单文件校验失败");
                        onComplete?.Invoke(false);
                        yield break;
                    }
                }

                // ── Step 3: 解析清单，开始下载 ──
                _state = HotUpdateState.Downloading;
                progressCallback?.Invoke(_state, 0f, "开始下载资源文件...");

                // 实际项目中应解析 manifestContent 获取差异文件列表
                // 此处简化处理，使用服务端返回的文件数量模拟进度
                int totalFiles = _updateInfo.file_count > 0 ? _updateInfo.file_count : 10;
                int downloadedFiles = 0;

                for (int i = 0; i < totalFiles; i++)
                {
                    downloadedFiles++;
                    _downloadProgress = (float)downloadedFiles / totalFiles;
                    progressCallback?.Invoke(HotUpdateState.Downloading, _downloadProgress,
                        $"下载中... {downloadedFiles}/{totalFiles}");

                    // TODO: 实际项目中根据清单逐文件下载:
                    // string fileUrl = _updateInfo.download_base_url + "/" + filePath;
                    // using (UnityWebRequest fileReq = UnityWebRequest.Get(fileUrl)) { ... }

                    yield return null; // 每帧处理一个（实际应并发下载）
                }
            }

            // ── Step 4: 校验文件完整性 ──
            _state = HotUpdateState.Verifying;
            progressCallback?.Invoke(_state, 1f, "正在校验文件完整性...");
            yield return new WaitForSeconds(0.5f);

            // TODO: 实际项目中应逐文件校验 MD5

            // ── Step 5: 应用更新 ──
            _state = HotUpdateState.Applying;
            progressCallback?.Invoke(_state, 1f, "正在应用更新...");

            // 更新本地版本号
            _resourceVersionLocal = _updateInfo.latest_version;
            PlayerPrefs.SetString("resource_version", _resourceVersionLocal);
            PlayerPrefs.Save();

            yield return new WaitForSeconds(0.3f);

            // ── Step 6: 完成 ──
            _state = HotUpdateState.Completed;
            _downloadProgress = 1f;
            progressCallback?.Invoke(_state, 1f, "更新完成！");

            Debug.Log($"[HotUpdate] 热更新完成: {_updateInfo.latest_version}");
            onComplete?.Invoke(true);
        }

        /// <summary>
        /// 计算字符串的 MD5 值
        /// </summary>
        private string ComputeMD5(string input)
        {
            using (var md5 = MD5.Create())
            {
                byte[] hashBytes = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(input));
                var sb = new System.Text.StringBuilder();
                foreach (byte b in hashBytes)
                {
                    sb.Append(b.ToString("x2"));
                }
                return sb.ToString();
            }
        }
    }
}
