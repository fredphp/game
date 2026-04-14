using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;
using Game.Core.Network.Api;
using Game.Data;

namespace Game.Module.Login
{
    /// <summary>
    /// 登录面板 - 九州争鼎游戏登录界面
    /// 提供用户名密码登录、记住密码、自动登录功能
    /// 继承自 UIBase，由 UIManager 统一管理生命周期
    /// </summary>
    public class LoginPanel : UIBase
    {
        // ──────────────────────────────────────
        // UI 元素引用（在 Unity Inspector 中拖拽绑定）
        // ──────────────────────────────────────

        [Header("输入区域")]
        [SerializeField] private InputField usernameInput;       // 用户名输入框
        [SerializeField] private InputField passwordInput;       // 密码输入框

        [Header("按钮区域")]
        [SerializeField] private Button loginButton;             // 登录按钮
        [SerializeField] private Button registerButton;          // 注册按钮

        [Header("提示信息")]
        [SerializeField] private Text errorText;                 // 错误提示文本

        [Header("加载遮罩")]
        [SerializeField] private GameObject loadingOverlay;      // 加载遮罩层

        [Header("记住密码")]
        [SerializeField] private Toggle rememberMeToggle;        // 记住密码开关

        // ──────────────────────────────────────
        // 常量定义
        // ──────────────────────────────────────

        private const string PREF_KEY_USERNAME = "Login_Username";
        private const string PREF_KEY_PASSWORD = "Login_Password";
        private const string PREF_KEY_REMEMBER = "Login_Remember";

        // ──────────────────────────────────────
        // 内部状态
        // ──────────────────────────────────────

        private bool isLoggingIn = false;     // 是否正在登录中
        private User currentProfile;           // 当前登录的用户资料

        // ============================================================
        // 生命周期方法
        // ============================================================

        /// <summary>
        /// 面板初始化（Unity Awake）
        /// 注册按钮事件监听
        /// </summary>
        protected override void Awake()
        {
            base.Awake();

            // 绑定按钮点击事件
            if (loginButton != null)
                loginButton.onClick.AddListener(OnLoginClick);

            if (registerButton != null)
                registerButton.onClick.AddListener(OnRegisterClick);

            // 加载记住密码设置
            if (rememberMeToggle != null)
            {
                bool remembered = PlayerPrefs.GetInt(PREF_KEY_REMEMBER, 0) == 1;
                rememberMeToggle.isOn = remembered;
            }

            // 隐藏加载遮罩和错误信息
            HideLoading();
            HideError();
        }

        /// <summary>
        /// 面板打开回调
        /// 清空输入框，检查是否有已保存的 Token 可自动登录
        /// </summary>
        /// <param name="args">可选参数（通常为空）</param>
        public override void OnOpen(params object[] args)
        {
            // 调用基类 OnOpen（处理动画等）
            base.OnOpen(args);

            // 清空错误信息
            HideError();
            HideLoading();
            isLoggingIn = false;

            // 恢复记住的用户名密码
            RestoreSavedCredentials();

            // 检查是否有已保存的 Token，尝试自动登录
            if (TokenHolder.Instance.HasToken)
            {
                StartCoroutine(AutoLoginWithToken());
            }
        }

        /// <summary>
        /// 面板关闭回调
        /// 保存记住密码状态
        /// </summary>
        public override void OnClose()
        {
            SaveRememberState();
            base.OnClose();
        }

        /// <summary>
        /// 面板刷新回调
        /// </summary>
        public override void OnRefresh()
        {
            HideError();
            HideLoading();
            isLoggingIn = false;
        }

        // ============================================================
        // 登录相关逻辑
        // ============================================================

        /// <summary>
        /// 登录按钮点击处理
        /// 1. 验证输入
        /// 2. 调用 API 登录
        /// 3. 保存 Token（API内部已自动处理）
        /// 4. 触发登录成功事件
        /// </summary>
        private void OnLoginClick()
        {
            if (isLoggingIn) return;

            // 获取输入内容
            string username = usernameInput != null ? usernameInput.text.Trim() : "";
            string password = passwordInput != null ? passwordInput.text : "";

            // 验证输入
            string error = ValidateInput(username, password);
            if (!string.IsNullOrEmpty(error))
            {
                ShowError(error);
                return;
            }

            // 开始登录流程
            isLoggingIn = true;
            ShowLoading();
            HideError();

            // 保存凭证（如果勾选了记住密码）
            if (rememberMeToggle != null && rememberMeToggle.isOn)
            {
                SaveCredentials(username, password);
            }
            else
            {
                ClearSavedCredentials();
            }

            // 构建登录请求
            LoginRequest request = new LoginRequest(username, password);

            // 调用登录 API
            StartCoroutine(UserApi.Login(request, (apiResult) =>
            {
                isLoggingIn = false;
                HideLoading();

                if (apiResult != null && apiResult.IsSuccess() && apiResult.data != null)
                {
                    OnLoginSuccess(apiResult.data);
                }
                else
                {
                    // 登录失败，显示错误信息
                    string errorMsg = apiResult != null ? apiResult.message : "网络连接失败";
                    string displayError = ParseLoginError(errorMsg);
                    ShowError(displayError);
                }
            }));
        }

        /// <summary>
        /// 登录成功处理
        /// 1. Token 已由 UserApi.Login 内部保存到 TokenHolder
        /// 2. 触发登录成功事件（EventBus）
        /// 3. 关闭登录面板
        /// </summary>
        private void OnLoginSuccess(LoginResponse response)
        {
            currentProfile = response.User;

            // 触发登录成功事件（通过 EventBus）
            EventBus.Trigger(Constants.GameEvents.PLAYER_LOGIN, response);

            Debug.Log($"[LoginPanel] 登录成功: 用户={response.User.Username}, Token已保存");

            // 关闭登录面板，进入主城
            UIManager.Instance.ClosePanel(PanelName);
        }

        /// <summary>
        /// 注册按钮点击处理
        /// 打开注册面板
        /// </summary>
        private void OnRegisterClick()
        {
            UIManager.Instance.OpenPanel(Constants.PanelNames.REGISTER);
        }

        // ============================================================
        // 自动登录
        // ============================================================

        /// <summary>
        /// 使用已保存的 Token 尝试自动登录
        /// 调用个人信息接口验证 Token 有效性
        /// </summary>
        private IEnumerator AutoLoginWithToken()
        {
            if (!TokenHolder.Instance.HasToken)
            {
                yield break;
            }

            // 检查 Token 是否过期
            if (TokenHolder.Instance.IsExpired())
            {
                Debug.Log("[LoginPanel] 已保存的 Token 已过期，清除并等待手动登录");
                TokenHolder.Instance.ClearTokens();
                yield break;
            }

            Debug.Log("[LoginPanel] 尝试自动登录...");
            ShowLoading();

            // 调用获取个人信息接口验证 Token 有效性
            bool done = false;
            User profile = null;
            string errorMsg = null;

            StartCoroutine(UserApi.GetProfile((apiResult) =>
            {
                if (apiResult != null && apiResult.IsSuccess() && apiResult.data != null)
                {
                    profile = apiResult.data;
                }
                else
                {
                    errorMsg = apiResult != null ? apiResult.message : "Token验证失败";
                }
                done = true;
            }));

            // 等待请求完成
            float timeout = 10f;
            float elapsed = 0f;
            while (!done && elapsed < timeout)
            {
                yield return new WaitForSeconds(0.1f);
                elapsed += 0.1f;
            }

            HideLoading();

            if (profile != null)
            {
                Debug.Log($"[LoginPanel] 自动登录成功: 用户={profile.Username}");
                currentProfile = profile;

                // 自动登录成功
                LoginResponse autoResponse = new LoginResponse
                {
                    // 使用已保存的 token 信息
                };
                EventBus.Trigger(Constants.GameEvents.PLAYER_LOGIN, autoResponse);

                UIManager.Instance.ClosePanel(PanelName);
            }
            else
            {
                Debug.Log("[LoginPanel] 自动登录失败: " + (errorMsg ?? "Token 无效"));
                // Token 无效，清除并等待手动登录
                TokenHolder.Instance.ClearTokens();
            }
        }

        // ============================================================
        // 输入验证
        // ============================================================

        /// <summary>
        /// 验证登录输入
        /// 规则：用户名不为空且3~20字符，密码不为空且6~20字符
        /// </summary>
        private string ValidateInput(string username, string password)
        {
            if (string.IsNullOrEmpty(username))
                return "请输入用户名";

            if (username.Length < 3)
                return "用户名至少需要3个字符";
            if (username.Length > 20)
                return "用户名不能超过20个字符";

            if (string.IsNullOrEmpty(password))
                return "请输入密码";

            if (password.Length < 6)
                return "密码至少需要6个字符";
            if (password.Length > 20)
                return "密码不能超过20个字符";

            return "";
        }

        // ============================================================
        // 记住密码
        // ============================================================

        private void SaveCredentials(string username, string password)
        {
            PlayerPrefs.SetString(PREF_KEY_USERNAME, username);
            PlayerPrefs.SetString(PREF_KEY_PASSWORD, password);
            PlayerPrefs.Save();
        }

        private void RestoreSavedCredentials()
        {
            if (rememberMeToggle != null && rememberMeToggle.isOn)
            {
                string username = PlayerPrefs.GetString(PREF_KEY_USERNAME, "");
                string password = PlayerPrefs.GetString(PREF_KEY_PASSWORD, "");
                if (usernameInput != null) usernameInput.text = username;
                if (passwordInput != null) passwordInput.text = password;
            }
        }

        private void ClearSavedCredentials()
        {
            PlayerPrefs.DeleteKey(PREF_KEY_USERNAME);
            PlayerPrefs.DeleteKey(PREF_KEY_PASSWORD);
            PlayerPrefs.Save();
        }

        private void SaveRememberState()
        {
            if (rememberMeToggle != null)
            {
                PlayerPrefs.SetInt(PREF_KEY_REMEMBER, rememberMeToggle.isOn ? 1 : 0);
                PlayerPrefs.Save();
            }
        }

        // ============================================================
        // UI 显示辅助方法
        // ============================================================

        private void ShowError(string message)
        {
            if (errorText != null)
            {
                errorText.text = message;
                errorText.gameObject.SetActive(true);
            }
        }

        private void HideError()
        {
            if (errorText != null)
            {
                errorText.text = "";
                errorText.gameObject.SetActive(false);
            }
        }

        private void ShowLoading()
        {
            if (loadingOverlay != null)
                loadingOverlay.SetActive(true);
        }

        private void HideLoading()
        {
            if (loadingOverlay != null)
                loadingOverlay.SetActive(false);
        }

        /// <summary>
        /// 解析后端错误码，转换为用户友好的中文提示
        /// </summary>
        private string ParseLoginError(string errorMsg)
        {
            if (string.IsNullOrEmpty(errorMsg))
                return "登录失败，请检查网络连接后重试";

            if (errorMsg.Contains("密码") || errorMsg.Contains("password") || errorMsg.Contains("credentials"))
                return "用户名或密码错误";
            if (errorMsg.Contains("禁用") || errorMsg.Contains("banned"))
                return "账号已被禁用，请联系客服";
            if (errorMsg.Contains("不存在") || errorMsg.Contains("not found"))
                return "用户名不存在";
            if (errorMsg.Contains("网络") || errorMsg.Contains("timeout") || errorMsg.Contains("network"))
                return "网络连接超时，请检查网络后重试";
            if (errorMsg.Contains("服务器") || errorMsg.Contains("server") || errorMsg.Contains("500"))
                return "服务器繁忙，请稍后再试";

            return $"登录失败: {errorMsg}";
        }

        protected override void OnDestroy()
        {
            if (loginButton != null) loginButton.onClick.RemoveAllListeners();
            if (registerButton != null) registerButton.onClick.RemoveAllListeners();
            base.OnDestroy();
        }
    }
}
