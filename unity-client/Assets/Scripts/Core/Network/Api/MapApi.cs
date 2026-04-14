using System;
using System.Collections;
using Game.Data;

namespace Game.Core.Network.Api
{
    /// <summary>
    /// 地图服务 API - 对应 map-service (port 9004)
    /// 提供地图总览、区域/城市查询、行军管理等功能
    /// </summary>
    public static class MapApi
    {
        private const string BASE_URL = "/api/v1/map";

        /// <summary>
        /// 获取地图总览信息（区域列表、总城市数、已占领城市数）
        /// GET /api/v1/map/overview
        /// </summary>
        public static IEnumerator GetOverview(Action<ApiResult<MapOverviewResponse>> callback)
        {
            yield return HttpClient.Instance.Get<MapOverviewResponse>(
                $"{BASE_URL}/overview",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<MapOverviewResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<MapOverviewResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取所有区域列表
        /// GET /api/v1/map/regions
        /// </summary>
        public static IEnumerator GetRegions(Action<ApiResult<RegionListResponse>> callback)
        {
            yield return HttpClient.Instance.Get<RegionListResponse>(
                $"{BASE_URL}/regions",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<RegionListResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<RegionListResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取指定区域下的所有城市
        /// GET /api/v1/map/region/:regionId/cities
        /// </summary>
        public static IEnumerator GetCitiesByRegion(int regionId, Action<ApiResult<RegionCitiesResponse>> callback)
        {
            string url = $"{BASE_URL}/region/{regionId}/cities";

            yield return HttpClient.Instance.Get<RegionCitiesResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<RegionCitiesResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<RegionCitiesResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取城市详细信息（名称、等级、资源、占领状态、邻接城市等）
        /// GET /api/v1/map/city/:id
        /// </summary>
        public static IEnumerator GetCityDetail(int cityId, Action<ApiResult<CityDetailResponse>> callback)
        {
            string url = $"{BASE_URL}/city/{cityId}";

            yield return HttpClient.Instance.Get<CityDetailResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<CityDetailResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<CityDetailResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取城市操作日志
        /// GET /api/v1/map/city/:id/logs
        /// </summary>
        public static IEnumerator GetCityLogs(int cityId, Action<ApiResult<CityLogsResponse>> callback)
        {
            string url = $"{BASE_URL}/city/{cityId}/logs";

            yield return HttpClient.Instance.Get<CityLogsResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<CityLogsResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<CityLogsResponse>(null, error));
                });
        }

        /// <summary>
        /// 发起行军（向目标城市派遣部队）
        /// POST /api/v1/map/march
        /// </summary>
        public static IEnumerator InitiateMarch(MarchRequest request, Action<ApiResult<MarchResponse>> callback)
        {
            var body = new
            {
                target_city_id = request.TargetCityId,
                troop_type = request.TroopType,
                troop_count = request.TroopCount
            };

            yield return HttpClient.Instance.Post<MarchResponse>(
                $"{BASE_URL}/march",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<MarchResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<MarchResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取当前用户的所有行军列表
        /// GET /api/v1/map/march/list
        /// </summary>
        public static IEnumerator ListMarches(Action<ApiResult<MarchListResponse>> callback)
        {
            yield return HttpClient.Instance.Get<MarchListResponse>(
                $"{BASE_URL}/march/list",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<MarchListResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<MarchListResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取行军进度（百分比、预计到达时间、当前节点）
        /// GET /api/v1/map/march/:marchId/progress
        /// </summary>
        public static IEnumerator GetMarchProgress(string marchId, Action<ApiResult<MarchProgressResponse>> callback)
        {
            string url = $"{BASE_URL}/march/{marchId}/progress";

            yield return HttpClient.Instance.Get<MarchProgressResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<MarchProgressResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<MarchProgressResponse>(null, error));
                });
        }

        /// <summary>
        /// 撤回行军（召回已出发的部队）
        /// POST /api/v1/map/march/:marchId/recall
        /// </summary>
        public static IEnumerator RecallMarch(string marchId, Action<ApiResult<MessageResponse>> callback)
        {
            string url = $"{BASE_URL}/march/{marchId}/recall";

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
        /// 获取联盟领地信息（指定公会已占领的城市列表及影响力）
        /// GET /api/v1/map/territory
        /// </summary>
        public static IEnumerator GetTerritory(int guildId, Action<ApiResult<TerritoryResponse>> callback)
        {
            string url = $"{BASE_URL}/territory?guild_id={guildId}";

            yield return HttpClient.Instance.Get<TerritoryResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<TerritoryResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<TerritoryResponse>(null, error));
                });
        }
    }

    // ============== 响应辅助类型 ==============

    /// <summary>
    /// 区域列表响应
    /// </summary>
    [Serializable]
    public class RegionListResponse
    {
        public MapRegion[] regions;
    }

    /// <summary>
    /// 领地信息响应
    /// </summary>
    [Serializable]
    public class TerritoryResponse
    {
        public AllianceTerritory territory;
    }
}
