using System;
using System.Collections;
using Game.Data;

namespace Game.Core.Network.Api
{
    /// <summary>
    /// 卡牌服务 API - 对应 card-service (port 9002)
    /// 提供卡池浏览、抽卡、卡牌管理等功能
    /// </summary>
    public static class CardApi
    {
        private const string BASE_URL = "/api/v1/card";

        /// <summary>
        /// 获取所有卡池列表
        /// GET /api/v1/card/pools
        /// </summary>
        public static IEnumerator ListPools(Action<ApiResult<CardPoolListResponse>> callback)
        {
            yield return HttpClient.Instance.Get<CardPoolListResponse>(
                $"{BASE_URL}/pools",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<CardPoolListResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<CardPoolListResponse>(null, error));
                });
        }

        /// <summary>
        /// 单次抽卡（单抽）
        /// POST /api/v1/card/gacha
        /// </summary>
        public static IEnumerator GachaSingle(int poolId, Action<ApiResult<GachaResponse>> callback)
        {
            yield return Gacha(poolId, 1, callback);
        }

        /// <summary>
        /// 十连抽卡
        /// POST /api/v1/card/gacha
        /// </summary>
        public static IEnumerator GachaTen(int poolId, Action<ApiResult<GachaResponse>> callback)
        {
            yield return Gacha(poolId, 10, callback);
        }

        /// <summary>
        /// 抽卡（通用方法，支持单抽和十连）
        /// POST /api/v1/card/gacha
        /// </summary>
        public static IEnumerator Gacha(int poolId, int count, Action<ApiResult<GachaResponse>> callback)
        {
            var request = new GachaRequest(poolId, count);
            var body = new
            {
                pool_id = request.PoolId,
                count = request.Count
            };

            yield return HttpClient.Instance.Post<GachaResponse>(
                $"{BASE_URL}/gacha",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GachaResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GachaResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取用户卡牌列表（分页）
        /// GET /api/v1/card/list?page=1&pageSize=20
        /// </summary>
        public static IEnumerator ListUserCards(int page, int pageSize, Action<ApiResult<CardPageResult>> callback)
        {
            string url = $"{BASE_URL}/list?page={page}&pageSize={pageSize}";

            yield return HttpClient.Instance.Get<CardPageResult>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<CardPageResult>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<CardPageResult>(null, error));
                });
        }

        /// <summary>
        /// 获取用户卡牌列表（使用默认分页参数）
        /// GET /api/v1/card/list
        /// </summary>
        public static IEnumerator ListUserCards(Action<ApiResult<CardPageResult>> callback)
        {
            yield return ListUserCards(1, 20, callback);
        }

        /// <summary>
        /// 锁定/解锁卡牌（防止误操作分解）
        /// PUT /api/v1/card/:id/lock
        /// </summary>
        public static IEnumerator ToggleLock(string cardId, bool locked, Action<ApiResult<LockCardResponse>> callback)
        {
            var body = new
            {
                locked = locked
            };

            yield return HttpClient.Instance.Put<LockCardResponse>(
                $"{BASE_URL}/{cardId}/lock",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<LockCardResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<LockCardResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取抽卡历史记录（分页）
        /// GET /api/v1/card/gacha/history?page=1
        /// </summary>
        public static IEnumerator GachaHistory(int page, Action<ApiResult<GachaHistoryResult>> callback)
        {
            string url = $"{BASE_URL}/gacha/history?page={page}";

            yield return HttpClient.Instance.Get<GachaHistoryResult>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GachaHistoryResult>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GachaHistoryResult>(null, error));
                });
        }

        /// <summary>
        /// 获取抽卡历史记录（使用默认分页参数）
        /// GET /api/v1/card/gacha/history
        /// </summary>
        public static IEnumerator GachaHistory(Action<ApiResult<GachaHistoryResult>> callback)
        {
            yield return GachaHistory(1, callback);
        }

        /// <summary>
        /// 获取抽卡统计数据（总抽数、各稀有度计数、保底计数等）
        /// GET /api/v1/card/gacha/stats
        /// </summary>
        public static IEnumerator GachaStats(Action<ApiResult<GachaStats>> callback)
        {
            yield return HttpClient.Instance.Get<GachaStats>(
                $"{BASE_URL}/gacha/stats",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<GachaStats>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<GachaStats>(null, error));
                });
        }
    }

    // ============== 响应辅助类型 ==============

    /// <summary>
    /// 卡池列表响应
    /// </summary>
    [Serializable]
    public class CardPoolListResponse
    {
        public CardPool[] pools;
    }

    /// <summary>
    /// 抽卡结果响应
    /// </summary>
    [Serializable]
    public class GachaResponse
    {
        public GachaResult[] results;
    }

    /// <summary>
    /// 锁定卡牌响应
    /// </summary>
    [Serializable]
    public class LockCardResponse
    {
        public Card card;
    }

    /// <summary>
    /// 单张抽卡结果
    /// </summary>
    [Serializable]
    public class GachaResult
    {
        public int card_id;           // 卡牌定义ID
        public string name;           // 卡牌名称
        public int rarity;            // 稀有度: 3=R, 4=SR, 5=SSR
        public bool is_new;           // 是否首次获得
        public bool is_pity;          // 是否保底
        public bool is_up;            // 是否UP卡
        public int user_card_id;       // 用户卡牌实例ID
        public int pull_index;         // 第几抽
    }

    /// <summary>
    /// 用户卡牌列表分页响应
    /// </summary>
    [Serializable]
    public class CardPageResult
    {
        public UserCard[] cards;       // 当前页卡牌列表
        public int total;              // 总数量
        public int page;                // 当前页码
        public int page_size;           // 每页数量
        public int total_pages;         // 总页数
    }

    /// <summary>
    /// 抽卡历史响应
    /// </summary>
    [Serializable]
    public class GachaHistoryResult
    {
        public GachaHistoryRecord[] records;   // 历史记录列表
    }

    /// <summary>
    /// 单条抽卡历史记录
    /// </summary>
    [Serializable]
    public class GachaHistoryRecord
    {
        public int card_id;           // 卡牌ID
        public int rarity;            // 稀有度
        public bool is_new;           // 是否新卡
        public int pull_index;         // 第几抽
        public string created_at;      // 抽取时间
    }

    /// <summary>
    /// 抽卡统计数据
    /// </summary>
    [Serializable]
    public class GachaStats
    {
        public int total_pulls;           // 总抽数
        public int ssr_pity_counter;     // SSR保底计数
        public int sr_pity_counter;      // SR保底计数
        public int ssr_count;            // SSR总获得数
        public int sr_count;             // SR总获得数
        public int r_count;              // R总获得数
    }
}
