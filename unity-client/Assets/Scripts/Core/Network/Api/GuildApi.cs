using System;
using System.Collections;
using Game.Data;

namespace Game.Core.Network.Api
{
    /// <summary>
    /// 公会服务 API - 对应 guild-service (port 9005)
    /// 提供公会创建/管理、成员管理、申请审批、公会战、协作战斗等全部功能
    /// </summary>
    public static class GuildApi
    {
        private const string BASE_URL = "/api/v1/guild";

        // ==================== 查询接口 ====================

        /// <summary>
        /// 搜索公会列表（分页）
        /// GET /api/v1/guild/list?page=1&search=
        /// </summary>
        public static IEnumerator ListGuilds(int page, string search, Action<ApiResult<GuildListResponse>> callback)
        {
            string url = $"{BASE_URL}/list?page={page}";
            if (!string.IsNullOrEmpty(search))
            {
                url += $"&search={UnityEngine.Networking.UnityWebRequest.EscapeURL(search)}";
            }

            yield return HttpClient.Instance.Get<GuildListResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildListResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildListResponse>(null, error));
                });
        }

        /// <summary>
        /// 搜索公会列表（无搜索关键词）
        /// GET /api/v1/guild/list?page=1
        /// </summary>
        public static IEnumerator ListGuilds(int page, Action<ApiResult<GuildListResponse>> callback)
        {
            yield return ListGuilds(page, null, callback);
        }

        /// <summary>
        /// 获取公会详细信息
        /// GET /api/v1/guild/:id
        /// </summary>
        public static IEnumerator GetGuild(int guildId, Action<ApiResult<GuildDetailResponse>> callback)
        {
            string url = $"{BASE_URL}/{guildId}";

            yield return HttpClient.Instance.Get<GuildDetailResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildDetailResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildDetailResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取公会成员列表
        /// GET /api/v1/guild/:id/members
        /// </summary>
        public static IEnumerator GetGuildMembers(int guildId, Action<ApiResult<GuildMemberListResponse>> callback)
        {
            string url = $"{BASE_URL}/{guildId}/members";

            yield return HttpClient.Instance.Get<GuildMemberListResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildMemberListResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildMemberListResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取公会操作日志
        /// GET /api/v1/guild/:id/logs
        /// </summary>
        public static IEnumerator GetGuildLogs(int guildId, Action<ApiResult<GuildLogsResponse>> callback)
        {
            string url = $"{BASE_URL}/{guildId}/logs";

            yield return HttpClient.Instance.Get<GuildLogsResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildLogsResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildLogsResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取公会战详情
        /// GET /api/v1/guild/war/:warId
        /// </summary>
        public static IEnumerator GetWarDetail(string warId, Action<ApiResult<GuildWarDetailResponse>> callback)
        {
            string url = $"{BASE_URL}/war/{warId}";

            yield return HttpClient.Instance.Get<GuildWarDetailResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildWarDetailResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildWarDetailResponse>(null, error));
                });
        }

        // ==================== 公会创建/加入/退出 ====================

        /// <summary>
        /// 创建公会
        /// POST /api/v1/guild/create
        /// </summary>
        public static IEnumerator CreateGuild(CreateGuildRequest request, Action<ApiResult<GuildDetailResponse>> callback)
        {
            var body = new
            {
                name = request.Name,
                announcement = request.Announcement
            };

            yield return HttpClient.Instance.Post<GuildDetailResponse>(
                $"{BASE_URL}/create",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildDetailResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildDetailResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取当前用户所在的公会信息
        /// GET /api/v1/guild/my
        /// </summary>
        public static IEnumerator GetMyGuild(Action<ApiResult<GuildDetailResponse>> callback)
        {
            yield return HttpClient.Instance.Get<GuildDetailResponse>(
                $"{BASE_URL}/my",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildDetailResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildDetailResponse>(null, error));
                });
        }

        /// <summary>
        /// 申请加入公会
        /// POST /api/v1/guild/join
        /// </summary>
        public static IEnumerator JoinGuild(int guildId, Action<ApiResult<MessageResponse>> callback)
        {
            var body = new
            {
                guild_id = guildId
            };

            yield return HttpClient.Instance.Post<MessageResponse>(
                $"{BASE_URL}/join",
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
        /// 退出公会
        /// POST /api/v1/guild/leave
        /// </summary>
        public static IEnumerator LeaveGuild(int guildId, Action<ApiResult<MessageResponse>> callback)
        {
            var body = new
            {
                guild_id = guildId
            };

            yield return HttpClient.Instance.Post<MessageResponse>(
                $"{BASE_URL}/leave",
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

        // ==================== 公会管理 ====================

        /// <summary>
        /// 更新公会信息（名称、公告、图标）
        /// PUT /api/v1/guild/:id
        /// </summary>
        public static IEnumerator UpdateGuild(int guildId, UpdateGuildRequest request, Action<ApiResult<GuildDetailResponse>> callback)
        {
            var body = new
            {
                name = request.Name,
                announcement = request.Announcement,
                icon = request.Icon
            };

            yield return HttpClient.Instance.Put<GuildDetailResponse>(
                $"{BASE_URL}/{guildId}",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildDetailResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildDetailResponse>(null, error));
                });
        }

        /// <summary>
        /// 解散公会（仅会长可操作）
        /// POST /api/v1/guild/:id/disband
        /// </summary>
        public static IEnumerator DisbandGuild(int guildId, Action<ApiResult<MessageResponse>> callback)
        {
            yield return HttpClient.Instance.Post<MessageResponse>(
                $"{BASE_URL}/{guildId}/disband",
                null,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<MessageResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<MessageResponse>(null, error));
                });
        }

        // ==================== 成员管理 ====================

        /// <summary>
        /// 踢出公会成员（仅会长/副会长可操作）
        /// POST /api/v1/guild/:id/kick/:userId
        /// </summary>
        public static IEnumerator KickMember(int guildId, int userId, Action<ApiResult<MessageResponse>> callback)
        {
            string url = $"{BASE_URL}/{guildId}/kick/{userId}";

            yield return HttpClient.Instance.Post<MessageResponse>(
                url,
                null,
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
        /// 修改公会成员角色（晋升/降职）
        /// PUT /api/v1/guild/:id/role/:userId/:role
        /// </summary>
        public static IEnumerator PromoteMember(int guildId, int userId, string role, Action<ApiResult<MessageResponse>> callback)
        {
            string url = $"{BASE_URL}/{guildId}/role/{userId}/{role}";

            yield return HttpClient.Instance.Put<MessageResponse>(
                url,
                null,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<MessageResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<MessageResponse>(null, error));
                });
        }

        // ==================== 申请审批 ====================

        /// <summary>
        /// 获取公会入会申请列表
        /// GET /api/v1/guild/:id/applications
        /// </summary>
        public static IEnumerator ListApplications(int guildId, Action<ApiResult<GuildApplicationListResponse>> callback)
        {
            string url = $"{BASE_URL}/{guildId}/applications";

            yield return HttpClient.Instance.Get<GuildApplicationListResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildApplicationListResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildApplicationListResponse>(null, error));
                });
        }

        /// <summary>
        /// 审批入会申请（通过或拒绝）
        /// POST /api/v1/guild/:id/approve/:appId
        /// </summary>
        public static IEnumerator ApproveApplication(int guildId, string applicationId, bool approved, Action<ApiResult<MessageResponse>> callback)
        {
            var body = new
            {
                approved = approved
            };

            string url = $"{BASE_URL}/{guildId}/approve/{applicationId}";

            yield return HttpClient.Instance.Post<MessageResponse>(
                url,
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

        // ==================== 公会战 ====================

        /// <summary>
        /// 向目标公会宣战
        /// POST /api/v1/guild/war/declare
        /// </summary>
        public static IEnumerator DeclareWar(int targetGuildId, Action<ApiResult<GuildWarDetailResponse>> callback)
        {
            var body = new
            {
                target_guild_id = targetGuildId
            };

            yield return HttpClient.Instance.Post<GuildWarDetailResponse>(
                $"{BASE_URL}/war/declare",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildWarDetailResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildWarDetailResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取公会战争列表
        /// GET /api/v1/guild/:id/wars
        /// </summary>
        public static IEnumerator ListWars(int guildId, Action<ApiResult<GuildWarListResponse>> callback)
        {
            string url = $"{BASE_URL}/{guildId}/wars";

            yield return HttpClient.Instance.Get<GuildWarListResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GuildWarListResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GuildWarListResponse>(null, error));
                });
        }

        /// <summary>
        /// 投降认输（仅会长/副会长可操作）
        /// POST /api/v1/guild/:id/war/:warId/surrender
        /// </summary>
        public static IEnumerator SurrenderWar(int guildId, string warId, Action<ApiResult<MessageResponse>> callback)
        {
            string url = $"{BASE_URL}/{guildId}/war/{warId}/surrender";

            yield return HttpClient.Instance.Post<MessageResponse>(
                url,
                null,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<MessageResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<MessageResponse>(null, error));
                });
        }

        // ==================== 协作战斗 ====================

        /// <summary>
        /// 发起协作战斗（公会战中对城市发起联合进攻）
        /// POST /api/v1/guild/war/coop/initiate
        /// </summary>
        public static IEnumerator InitiateCoopBattle(int cityId, int troopCount, Action<ApiResult<CoopBattleResponse>> callback)
        {
            var body = new
            {
                city_id = cityId,
                troop_count = troopCount
            };

            yield return HttpClient.Instance.Post<CoopBattleResponse>(
                $"{BASE_URL}/war/coop/initiate",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<CoopBattleResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<CoopBattleResponse>(null, error));
                });
        }

        /// <summary>
        /// 加入协作战斗
        /// POST /api/v1/guild/war/coop/join
        /// </summary>
        public static IEnumerator JoinCoopBattle(string battleId, int troopCount, Action<ApiResult<MessageResponse>> callback)
        {
            var body = new
            {
                battle_id = battleId,
                troop_count = troopCount
            };

            yield return HttpClient.Instance.Post<MessageResponse>(
                $"{BASE_URL}/war/coop/join",
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
        /// 强制开始协作战斗（发起者可提前开战）
        /// POST /api/v1/guild/war/coop/:battleId/start
        /// </summary>
        public static IEnumerator ForceStartBattle(string battleId, Action<ApiResult<CoopBattleResponse>> callback)
        {
            string url = $"{BASE_URL}/war/coop/{battleId}/start";

            yield return HttpClient.Instance.Post<CoopBattleResponse>(
                url,
                null,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<CoopBattleResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<CoopBattleResponse>(null, error));
                });
        }
    }

    // ============== 响应辅助类型 ==============

    /// <summary>
    /// 协作战斗响应
    /// </summary>
    [Serializable]
    public class CoopBattleResponse
    {
        public CoopBattle coop_battle;
    }
}
