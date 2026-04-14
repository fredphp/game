using System;
using System.Collections;
using Game.Data;

namespace Game.Core.Network.Api
{
    /// <summary>
    /// 用户服务 API - 对应 user-service (port 9001)
    /// 提供注册、登录、用户信息管理等功能
    /// </summary>
    public static class UserApi
    {
        private const string BASE_URL = "/api/v1/user";

        /// <summary>
        /// 用户注册
        /// POST /api/v1/user/register
        /// </summary>
        public static IEnumerator Register(RegisterRequest request, Action<ApiResult<LoginResponse>> callback)
        {
            var body = new
            {
                username = request.Username,
                password = request.Password,
                nickname = request.Nickname
            };

            yield return HttpClient.Instance.Post<LoginResponse>(
                $"{BASE_URL}/register",
                body,
                (response) =>
                {
                    // 注册成功后自动保存令牌
                    if (response != null && response.User != null && !string.IsNullOrEmpty(response.AccessToken))
                    {
                        SaveTokens(response);
                    }
                    callback?.Invoke(new ApiResult<LoginResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<LoginResponse>(null, error));
                });
        }

        /// <summary>
        /// 用户登录
        /// POST /api/v1/user/login
        /// 登录成功后自动保存令牌到本地存储
        /// </summary>
        public static IEnumerator Login(LoginRequest request, Action<ApiResult<LoginResponse>> callback)
        {
            var body = new
            {
                username = request.Username,
                password = request.Password
            };

            yield return HttpClient.Instance.Post<LoginResponse>(
                $"{BASE_URL}/login",
                body,
                (response) =>
                {
                    // 登录成功后保存令牌到 TokenHolder 和 PlayerPrefs
                    if (response != null && response.User != null && !string.IsNullOrEmpty(response.AccessToken))
                    {
                        SaveTokens(response);
                    }
                    callback?.Invoke(new ApiResult<LoginResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<LoginResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取当前用户信息
        /// GET /api/v1/user/profile
        /// </summary>
        public static IEnumerator GetProfile(Action<ApiResult<User>> callback)
        {
            yield return HttpClient.Instance.Get<User>(
                $"{BASE_URL}/profile",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<User>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<User>(null, error));
                });
        }

        /// <summary>
        /// 更新用户资料（昵称、头像）
        /// PUT /api/v1/user/profile
        /// </summary>
        public static IEnumerator UpdateProfile(UpdateProfileRequest request, Action<ApiResult<User>> callback)
        {
            var body = new
            {
                nickname = request.Nickname,
                avatar = request.Avatar
            };

            yield return HttpClient.Instance.Put<User>(
                $"{BASE_URL}/profile",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<User>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<User>(null, error));
                });
        }

        /// <summary>
        /// 修改密码
        /// PUT /api/v1/user/password
        /// </summary>
        public static IEnumerator UpdatePassword(UpdatePasswordRequest request, Action<ApiResult<MessageResponse>> callback)
        {
            var body = new
            {
                old_password = request.OldPassword,
                new_password = request.NewPassword
            };

            yield return HttpClient.Instance.Put<MessageResponse>(
                $"{BASE_URL}/password",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<MessageResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<MessageResponse>(null, error));
                });
        }

        /// <summary>
        /// 用户登出
        /// POST /api/v1/user/logout
        /// 登出后清除本地令牌
        /// </summary>
        public static IEnumerator Logout(Action<ApiResult<MessageResponse>> callback)
        {
            yield return HttpClient.Instance.Post<MessageResponse>(
                $"{BASE_URL}/logout",
                null,
                (response) =>
                {
                    // 登出成功后清除本地令牌
                    ClearTokens();
                    callback?.Invoke(new ApiResult<MessageResponse>(response));
                },
                (error) =>
                {
                    // 即使登出请求失败也清除本地令牌
                    ClearTokens();
                    callback?.Invoke(new ApiResult<MessageResponse>(null, error));
                });
        }

        /// <summary>
        /// 保存令牌到 TokenHolder 和 PlayerPrefs
        /// </summary>
        private static void SaveTokens(LoginResponse response)
        {
            var tokenData = response.ToTokenData();

            // 保存到 TokenHolder（内存中的单例）
            TokenHolder.Instance.SetToken(tokenData.AccessToken, tokenData.RefreshToken, tokenData.ExpiresAt);

            // 持久化到 PlayerPrefs
            PlayerPrefs.SetString("access_token", tokenData.AccessToken);
            PlayerPrefs.SetString("refresh_token", tokenData.RefreshToken);
            PlayerPrefs.SetString("token_expires_at", tokenData.ExpiresAt);
            PlayerPrefs.Save();
        }

        /// <summary>
        /// 清除本地令牌
        /// </summary>
        private static void ClearTokens()
        {
            TokenHolder.Instance.ClearToken();

            PlayerPrefs.DeleteKey("access_token");
            PlayerPrefs.DeleteKey("refresh_token");
            PlayerPrefs.DeleteKey("token_expires_at");
            PlayerPrefs.Save();
        }
    }
}
