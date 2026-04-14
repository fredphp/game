using System;
using UnityEngine;

namespace Game.Data
{
    /// <summary>
    /// 用户数据模型 - 对应 user-service 数据结构
    /// </summary>
    [Serializable]
    public class User
    {
        [SerializeField] private int id;
        [SerializeField] private string username;
        [SerializeField] private string nickname;
        [SerializeField] private string avatar;
        [SerializeField] private int vipLevel;
        [SerializeField] private int gold;
        [SerializeField] private int diamonds;
        [SerializeField] private int stamina;
        [SerializeField] private string createdAt;

        public int Id { get => id; set => id = value; }
        public string Username { get => username; set => username = value; }
        public string Nickname { get => nickname; set => nickname = value; }
        public string Avatar { get => avatar; set => avatar = value; }
        public int VipLevel { get => vipLevel; set => vipLevel = value; }
        public int Gold { get => gold; set => gold = value; }
        public int Diamonds { get => diamonds; set => diamonds = value; }
        public int Stamina { get => stamina; set => stamina = value; }
        public string CreatedAt { get => createdAt; set => createdAt = value; }
    }

    /// <summary>
    /// 登录请求体
    /// </summary>
    [Serializable]
    public class LoginRequest
    {
        [SerializeField] private string username;
        [SerializeField] private string password;

        public LoginRequest(string username, string password)
        {
            this.username = username;
            this.password = password;
        }

        public string Username { get => username; set => username = value; }
        public string Password { get => password; set => password = value; }
    }

    /// <summary>
    /// 注册请求体
    /// </summary>
    [Serializable]
    public class RegisterRequest
    {
        [SerializeField] private string username;
        [SerializeField] private string password;
        [SerializeField] private string nickname;

        public RegisterRequest(string username, string password, string nickname)
        {
            this.username = username;
            this.password = password;
            this.nickname = nickname;
        }

        public string Username { get => username; set => username = value; }
        public string Password { get => password; set => password = value; }
        public string Nickname { get => nickname; set => nickname = value; }
    }

    /// <summary>
    /// 登录响应体 - 包含用户信息和令牌
    /// </summary>
    [Serializable]
    public class LoginResponse
    {
        [SerializeField] private User user;
        [SerializeField] private string access_token;
        [SerializeField] private string refresh_token;

        public User User { get => user; set => user = value; }
        public string AccessToken { get => access_token; set => access_token = value; }
        public string RefreshToken { get => refresh_token; set => refresh_token = value; }

        /// <summary>
        /// 转换为 TokenData 对象以便持久化存储
        /// </summary>
        public TokenData ToTokenData()
        {
            return new TokenData
            {
                AccessToken = access_token,
                RefreshToken = refresh_token,
                ExpiresAt = DateTime.UtcNow.AddHours(24).ToString("o")
            };
        }
    }

    /// <summary>
    /// Token 数据 - 用于本地持久化存储令牌信息
    /// </summary>
    [Serializable]
    public class TokenData
    {
        [SerializeField] private string accessToken;
        [SerializeField] private string refreshToken;
        [SerializeField] private string expiresAt;

        public string AccessToken { get => accessToken; set => accessToken = value; }
        public string RefreshToken { get => refreshToken; set => refreshToken = value; }
        public string ExpiresAt { get => expiresAt; set => expiresAt = value; }

        /// <summary>
        /// 检查令牌是否已过期
        /// </summary>
        public bool IsExpired()
        {
            if (string.IsNullOrEmpty(expiresAt)) return true;
            if (DateTime.TryParse(expiresAt, out var expiry))
            {
                return DateTime.UtcNow >= expiry;
            }
            return true;
        }
    }

    /// <summary>
    /// 更新用户资料请求
    /// </summary>
    [Serializable]
    public class UpdateProfileRequest
    {
        [SerializeField] private string nickname;
        [SerializeField] private string avatar;

        public UpdateProfileRequest(string nickname, string avatar)
        {
            this.nickname = nickname;
            this.avatar = avatar;
        }

        public string Nickname { get => nickname; set => nickname = value; }
        public string Avatar { get => avatar; set => avatar = value; }
    }

    /// <summary>
    /// 修改密码请求
    /// </summary>
    [Serializable]
    public class UpdatePasswordRequest
    {
        [SerializeField] private string old_password;
        [SerializeField] private string new_password;

        public UpdatePasswordRequest(string oldPassword, string newPassword)
        {
            old_password = oldPassword;
            new_password = newPassword;
        }

        public string OldPassword { get => old_password; set => old_password = value; }
        public string NewPassword { get => new_password; set => new_password = value; }
    }
}
