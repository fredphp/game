using System;
using System.Collections;
using System.Text;
using Game.Data;

namespace Game.Core.Network.Api
{
    /// <summary>
    /// 战斗服务 API - 对应 battle-service (port 9003)
    /// 提供 PVE 战斗、战斗回放、战斗历史等功能
    /// </summary>
    public static class BattleApi
    {
        private const string BASE_URL = "/api/v1/battle";

        /// <summary>
        /// 发起 PVE 战斗
        /// POST /api/v1/battle/pve
        /// 传入卡组卡牌 ID 列表和关卡 ID
        /// </summary>
        public static IEnumerator StartPVE(
            System.Collections.Generic.List<string> deckCardIds,
            string stageId,
            Action<ApiResult<BattleStartResponse>> callback)
        {
            var body = new
            {
                deck_cards = deckCardIds.ToArray(),
                stage_id = stageId
            };

            yield return HttpClient.Instance.Post<BattleStartResponse>(
                $"{BASE_URL}/pve",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<BattleStartResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<BattleStartResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取战斗回放详情（含每一回合数据）
        /// GET /api/v1/battle/replay/:id
        /// </summary>
        public static IEnumerator GetReplay(string battleId, Action<ApiResult<BattleReplayResponse>> callback)
        {
            string url = $"{BASE_URL}/replay/{battleId}";

            yield return HttpClient.Instance.Get<BattleReplayResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<BattleReplayResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<BattleReplayResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取战斗历史记录（分页）
        /// GET /api/v1/battle/history?page=1
        /// </summary>
        public static IEnumerator GetHistory(int page, Action<ApiResult<BattleHistoryResponse>> callback)
        {
            string url = $"{BASE_URL}/history?page={page}";

            yield return HttpClient.Instance.Get<BattleHistoryResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<BattleHistoryResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<BattleHistoryResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取战斗历史记录（使用默认分页参数）
        /// GET /api/v1/battle/history
        /// </summary>
        public static IEnumerator GetHistory(Action<ApiResult<BattleHistoryResponse>> callback)
        {
            yield return GetHistory(1, callback);
        }
    }
}
