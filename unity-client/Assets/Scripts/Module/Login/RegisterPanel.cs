using System;
using System.Collections;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;
using Game.Core.Network.Api;
using Game.Data;

namespace Game.Module.Login
{
    /// <summary>
    /// 注册面板 - 九州争鼎游戏注册界面
    /// 提供用户名、密码、确认密码、昵称的注册功能
    /// 注册成功后自动登录并跳转主城
    /// 继承自 UIBase，由 UIManager 统一管理生命周期
    /// </summary>
    public class RegisterPanel : UIBase
    {
        // ──────────────────────────────────────
        // UI 元素引用（在 Unity Inspector 中拖拽绑定）
        // ──────────────────────────────────────

        [Header("输入区域")]
        [SerializeField] private InputField usernameInput;           // 用户名输入框
        [SerializeField] private InputField passwordInput;           // 密码输入框
        [SerializeField] private InputField confirmPasswordInput;    // 确认密码输入框
        [SerializeField] private InputField nicknameInput;           // 昵称输入框

        [Header("按钮区域")]
        [SerializeField] private Button registerButton;              // 注册按钮
        [SerializeField] private Button backButton;                  // 返回按钮

        [Header("提示信息")]
        [SerializeField] private Text errorText;                     // 错误提示文本

        [Header("加载遮罩")]
        [SerializeField] private GameObject loadingOverlay;          // 加载遮罩层

        // ──────────────────────────────────────
        // 常量定义
        // ──────────────────────────────────────

        // 正则表达式：用户名只允许字母和数字
        private static readonly Regex UsernameRegex = new Regex(@"^[a-zA-Z0-9]+$", RegexOptions.Compiled);
        // 正则表达式：昵称允许中文、字母、数字
        private static readonly Regex NicknameRegex = new Regex(@"^[\u4e00-\u9fff a-zA-Z0-9]+$", RegexOptions.Compiled);

        // ──────────────────────────────────────
        // 内部状态
        // ──────────────────────────────────────

        private bool isRegistering = false;   // 是否正在注册中

        // ============================================================
        // 生命周期方法
        // ============================================================

        protected override void Awake()
        {
            base.Awake();

            if (registerButton != null)
                registerButton.onClick.AddListener(OnRegisterClick);

            if (backButton != null)
                backButton.onClick.AddListener(OnBackClick);

            HideLoading();
            HideError();
        }

        /// <summary>
        /// 面板打开回调 - 清空所有输入框和提示信息
        /// </summary>
        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);
            ClearAllInputs();
            HideError();
            HideLoading();
            isRegistering = false;

            if (usernameInput != null)
                usernameInput.ActivateInputField();
        }

        public override void OnClose()
        {
            isRegistering = false;
            base.OnClose();
        }

        public override void OnRefresh()
        {
            ClearAllInputs();
            HideError();
            HideLoading();
            isRegistering = false;
        }

        // ============================================================
        // 注册逻辑
        // ============================================================

        /// <summary>
        /// 注册按钮点击处理
        /// 1. 获取并验证所有输入
        /// 2. 调用注册 API
        /// 3. 注册成功后自动登录
        /// </summary>
        private void OnRegisterClick()
        {
            if (isRegistering) return;

            string username = usernameInput != null ? usernameInput.text.Trim() : "";
            string password = passwordInput != null ? passwordInput.text : "";
            string confirmPassword = confirmPasswordInput != null ? confirmPasswordInput.text : "";
            string nickname = nicknameInput != null ? nicknameInput.text.Trim() : "";

            // 验证所有输入
            string error = ValidateInput(username, password, confirmPassword, nickname);
            if (!string.IsNullOrEmpty(error))
            {
                ShowError(error);
                return;
            }

            // 如果昵称为空，使用默认昵称
            if (string.IsNullOrEmpty(nickname))
            {
                nickname = "新玩家" + UnityEngine.Random.Range(1000, 9999);
            }

            isRegistering = true;
            ShowLoading();
            HideError();

            // 构建注册请求
            RegisterRequest request = new RegisterRequest(username, password, nickname);

            // 调用注册 API（注册成功后 UserApi 内部已保存 Token）
            StartCoroutine(UserApi.Register(request, (apiResult) =>
            {
                isRegistering = false;
                HideLoading();

                if (apiResult != null && apiResult.IsSuccess() && apiResult.data != null)
                {
                    OnRegisterSuccess(apiResult.data);
                }
                else
                {
                    string displayError = ParseRegisterError(apiResult?.message);
                    ShowError(displayError);
                }
            }));
        }

        /// <summary>
        /// 注册成功处理
        /// UserApi.Register 内部已自动保存 Token，直接触发事件并跳转
        /// </summary>
        private void OnRegisterSuccess(LoginResponse response)
        {
            Debug.Log($"[RegisterPanel] 注册成功: 用户={response.User.Username}");

            // 触发登录成功事件
            EventBus.Trigger(Constants.GameEvents.PLAYER_LOGIN, response);

            // 关闭注册和登录面板
            UIManager.Instance.ClosePanel(PanelName);
            UIManager.Instance.ClosePanel(Constants.PanelNames.LOGIN);
        }

        /// <summary>
        /// 返回按钮点击 - 关闭注册面板，回到登录面板
        /// </summary>
        private void OnBackClick()
        {
            UIManager.Instance.ClosePanel(PanelName);
        }

        // ============================================================
        // 输入验证
        // ============================================================

        /// <summary>
        /// 验证注册输入
        /// 用户名：3~20字符，仅允许字母和数字
        /// 密码：6~20字符
        /// 确认密码：必须与密码一致
        /// 昵称：2~12字符（可选），允许中文、字母、数字
        /// </summary>
        private string ValidateInput(string username, string password, string confirmPassword, string nickname)
        {
            if (string.IsNullOrEmpty(username))
                return "请输入用户名";
            if (username.Length < 3)
                return "用户名至少需要3个字符";
            if (username.Length > 20)
                return "用户名不能超过20个字符";
            if (!UsernameRegex.IsMatch(username))
                return "用户名只能包含字母和数字";

            if (string.IsNullOrEmpty(password))
                return "请输入密码";
            if (password.Length < 6)
                return "密码至少需要6个字符";
            if (password.Length > 20)
                return "密码不能超过20个字符";

            if (string.IsNullOrEmpty(confirmPassword))
                return "请确认密码";
            if (password != confirmPassword)
                return "两次输入的密码不一致";

            if (!string.IsNullOrEmpty(nickname))
            {
                if (nickname.Length < 2)
                    return "昵称至少需要2个字符";
                if (nickname.Length > 12)
                    return "昵称不能超过12个字符";
                if (!NicknameRegex.IsMatch(nickname))
                    return "昵称只能包含中文、字母和数字";
            }

            return "";
        }

        // ============================================================
        // UI 辅助方法
        // ============================================================

        private void ClearAllInputs()
        {
            if (usernameInput != null) usernameInput.text = "";
            if (passwordInput != null) passwordInput.text = "";
            if (confirmPasswordInput != null) confirmPasswordInput.text = "";
            if (nicknameInput != null) nicknameInput.text = "";
        }

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

        private string ParseRegisterError(string errorMsg)
        {
            if (string.IsNullOrEmpty(errorMsg))
                return "注册失败，请检查网络连接后重试";

            if (errorMsg.Contains("已存在") || errorMsg.Contains("already exist") || errorMsg.Contains("重复"))
                return "该用户名已被注册，请更换用户名";
            if (errorMsg.Contains("参数") || errorMsg.Contains("param") || errorMsg.Contains("invalid"))
                return "输入信息格式不正确，请检查后重试";
            if (errorMsg.Contains("网络") || errorMsg.Contains("timeout"))
                return "网络连接超时，请检查网络后重试";
            if (errorMsg.Contains("服务器") || errorMsg.Contains("server"))
                return "服务器繁忙，请稍后再试";

            return $"注册失败: {errorMsg}";
        }

        protected override void OnDestroy()
        {
            if (registerButton != null) registerButton.onClick.RemoveAllListeners();
            if (backButton != null) backButton.onClick.RemoveAllListeners();
            base.OnDestroy();
        }
    }
}
