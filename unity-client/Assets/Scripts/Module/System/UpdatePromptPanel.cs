// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client
// =============================================================================
// 描述：更新提示面板 —— 显示版本更新和热更新的提示 UI。
//       支持强制更新（不可关闭）和推荐更新（可跳过）两种模式。
//       监听 EventBus 事件自动弹出对应面板。
// =============================================================================

using System;
using Jiuzhou.Core;
using Jiuzhou.Data;
using UnityEngine;
using UnityEngine.UI;

namespace Jiuzhou.Module.System
{
    // =====================================================================
    // 枚举
    // =====================================================================

    /// <summary>
    /// 更新类型
    /// </summary>
    public enum UpdatePromptType
    {
        /// <summary>推荐更新（可跳过）</summary>
        Recommended,
        /// <summary>强制更新（不可跳过）</summary>
        Forced,
        /// <summary>热更新</summary>
        HotUpdate
    }

    // =====================================================================
    // 更新提示面板
    // =====================================================================

    /// <summary>
    /// 更新提示面板
    /// <para>监听版本检查和热更新事件，弹出对应的更新提示。</para>
    /// <para>强制更新时用户必须更新才能继续游戏。</para>
    /// </summary>
    public class UpdatePromptPanel : UIBase
    {
        // =================================================================
        // Inspector 绑定 — 版本更新
        // =================================================================

        [Header("版本更新 UI")]
        [SerializeField] private GameObject versionUpdateRoot;
        [SerializeField] private Text titleText;
        [SerializeField] private Text descriptionText;
        [SerializeField] private Text versionInfoText;
        [SerializeField] private Text fileSizeText;
        [SerializeField] private Button updateButton;
        [SerializeField] private Button skipButton;       // 仅推荐更新可见
        [SerializeField] private GameObject forcedBadge;   // 强制更新标记

        // =================================================================
        // Inspector 绑定 — 热更新
        // =================================================================

        [Header("热更新 UI")]
        [SerializeField] private GameObject hotUpdateRoot;
        [SerializeField] private Text hotUpdateDescText;
        [SerializeField] private Slider downloadProgress;
        [SerializeField] private Text progressText;
        [SerializeField] private Text downloadSizeText;
        [SerializeField] private Button hotUpdateButton;
        [SerializeField] private Button hotUpdateSkipButton;

        // =================================================================
        // 内部状态
        // =================================================================

        private UpdatePromptType _promptType;
        private VersionCheckResponse _versionInfo;
        private HotUpdateCheckResponse _hotUpdateInfo;

        // =================================================================
        // UI 生命周期
        // =================================================================

        public override void OnInitialize()
        {
            base.OnInitialize();

            // 注册按钮事件
            updateButton.onClick.AddListener(OnUpdateClick);
            skipButton.onClick.AddListener(OnSkipClick);
            hotUpdateButton.onClick.AddListener(OnHotUpdateClick);
            hotUpdateSkipButton.onClick.AddListener(OnHotUpdateSkipClick);

            // 监听版本检查事件
            EventBus.AddListener<VersionCheckResponse>("version_update_recommended", OnVersionUpdateRecommended);
            EventBus.AddListener<VersionCheckResponse>("version_force_update_required", OnVersionForceUpdateRequired);
            EventBus.AddListener<HotUpdateCheckResponse>("hotupdate_force_required", OnHotUpdateForceRequired);
            EventBus.AddListener<HotUpdateCheckResponse>("hotupdate_available", OnHotUpdateAvailable);
        }

        public override void OnOpen(object args = null)
        {
            base.OnOpen(args);
            // 默认隐藏所有面板
            versionUpdateRoot.SetActive(false);
            hotUpdateRoot.SetActive(false);
        }

        public override void OnClose()
        {
            base.OnClose();
        }

        // =================================================================
        // 版本更新事件处理
        // =================================================================

        /// <summary>
        /// 推荐更新事件处理
        /// </summary>
        private void OnVersionUpdateRecommended(VersionCheckResponse info)
        {
            ShowVersionUpdate(info, UpdatePromptType.Recommended);
        }

        /// <summary>
        /// 强制更新事件处理
        /// </summary>
        private void OnVersionForceUpdateRequired(VersionCheckResponse info)
        {
            ShowVersionUpdate(info, UpdatePromptType.Forced);
        }

        /// <summary>
        /// 显示版本更新面板
        /// </summary>
        private void ShowVersionUpdate(VersionCheckResponse info, UpdatePromptType type)
        {
            _versionInfo = info;
            _promptType = type;

            versionUpdateRoot.SetActive(true);
            hotUpdateRoot.SetActive(false);

            // 标题
            titleText.text = string.IsNullOrEmpty(info.update_title)
                ? $"发现新版本 v{info.latest_version}"
                : info.update_title;

            // 更新说明（支持 \n 换行）
            descriptionText.text = info.update_description?.Replace("\\n", "\n") ?? "修复已知问题，优化游戏体验。";

            // 版本信息
            versionInfoText.text = $"当前版本: v{VersionCheckManager.CLIENT_VERSION}\n最新版本: v{info.latest_version}";

            // 文件大小
            fileSizeText.text = FormatFileSize(info.file_size);

            // 推荐更新 vs 强制更新 UI 控制
            skipButton.gameObject.SetActive(type == UpdatePromptType.Recommended);
            forcedBadge.SetActive(type == UpdatePromptType.Forced);

            // 按钮文字
            updateButton.GetComponentInChildren<Text>().text = "立即更新";
            skipButton.GetComponentInChildren<Text>().text = "跳过此版本";
        }

        // =================================================================
        // 热更新事件处理
        // =================================================================

        /// <summary>
        /// 可选热更新事件
        /// </summary>
        private void OnHotUpdateAvailable(HotUpdateCheckResponse info)
        {
            ShowHotUpdate(info, false);
        }

        /// <summary>
        /// 强制热更新事件
        /// </summary>
        private void OnHotUpdateForceRequired(HotUpdateCheckResponse info)
        {
            ShowHotUpdate(info, true);
        }

        /// <summary>
        /// 显示热更新面板
        /// </summary>
        private void ShowHotUpdate(HotUpdateCheckResponse info, bool forced)
        {
            _hotUpdateInfo = info;
            _promptType = forced ? UpdatePromptType.Forced : UpdatePromptType.HotUpdate;

            versionUpdateRoot.SetActive(false);
            hotUpdateRoot.SetActive(true);

            // 更新说明
            hotUpdateDescText.text = string.IsNullOrEmpty(info.description)
                ? $"发现资源更新 v{info.latest_version}"
                : info.description;

            // 文件大小
            downloadSizeText.text = FormatFileSize(info.total_size);

            // 重置进度
            downloadProgress.value = 0;
            progressText.text = "准备下载...";

            // UI 控制
            hotUpdateSkipButton.gameObject.SetActive(!forced);
            hotUpdateButton.interactable = true;
            hotUpdateButton.GetComponentInChildren<Text>().text = "开始下载";
        }

        // =================================================================
        // 按钮事件
        // =================================================================

        /// <summary>
        /// 点击"立即更新"按钮 → 跳转到应用商店或下载页
        /// </summary>
        private void OnUpdateClick()
        {
            if (_versionInfo != null && !string.IsNullOrEmpty(_versionInfo.download_url))
            {
                // 有直接下载链接
                Application.OpenURL(_versionInfo.download_url);
            }
            else
            {
                // 跳转到应用商店
#if UNITY_ANDROID
                Application.OpenURL("market://details?id=com.jiuzhou.game");
#elif UNITY_IOS
                Application.OpenURL("https://apps.apple.com/app/id123456789");
#else
                Application.OpenURL("https://jiuzhou.game/download");
#endif
            }
        }

        /// <summary>
        /// 点击"跳过"按钮
        /// </summary>
        private void OnSkipClick()
        {
            if (_promptType == UpdatePromptType.Recommended)
            {
                UIManager.Instance.ClosePanel(PanelNames.UPDATE_PROMPT);
            }
        }

        /// <summary>
        /// 点击"开始下载"按钮 → 启动热更新下载
        /// </summary>
        private void OnHotUpdateClick()
        {
            hotUpdateButton.interactable = false;
            hotUpdateButton.GetComponentInChildren<Text>().text = "下载中...";

            HotUpdateManager.Instance.StartDownload(
                // 进度回调
                (state, progress, message) =>
                {
                    downloadProgress.value = progress;
                    progressText.text = message;
                },
                // 完成回调
                (success) =>
                {
                    if (success)
                    {
                        progressText.text = "更新完成，即将重启游戏...";
                        // 延迟重启
                        Invoke(nameof(RestartGame), 2f);
                    }
                    else
                    {
                        progressText.text = "更新失败，请重试";
                        hotUpdateButton.interactable = true;
                        hotUpdateButton.GetComponentInChildren<Text>().text = "重新下载";
                    }
                }
            );
        }

        /// <summary>
        /// 跳过热更新
        /// </summary>
        private void OnHotUpdateSkipClick()
        {
            UIManager.Instance.ClosePanel(PanelNames.UPDATE_PROMPT);
        }

        // =================================================================
        // 工具方法
        // =================================================================

        /// <summary>
        /// 重启游戏（重新加载初始场景）
        /// </summary>
        private void RestartGame()
        {
            UnityEngine.SceneManagement.SceneManager.LoadScene(0);
        }

        /// <summary>
        /// 格式化文件大小为可读字符串
        /// </summary>
        private string FormatFileSize(long bytes)
        {
            if (bytes <= 0) return "未知大小";
            if (bytes < 1024) return $"{bytes} B";
            if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
            if (bytes < 1024L * 1024 * 1024) return $"{bytes / (1024.0 * 1024.0):F1} MB";
            return $"{bytes / (1024.0 * 1024.0 * 1024.0):F2} GB";
        }
    }
}
