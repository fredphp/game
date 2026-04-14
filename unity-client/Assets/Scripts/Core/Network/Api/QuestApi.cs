// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Network API
// =============================================================================
// 描述：任务服务 API - 对应 quest-service (port 9006)
//       提供新手引导、主线任务、日常任务、成就四大模块的 API 接口封装。
//       使用协程模式（IEnumerator），回调使用 ApiResult<T> 包装。
// =============================================================================

using System;
using System.Collections;
using Game.Data;

namespace Game.Core.Network.Api
{
    /// <summary>
    /// 任务服务 API - 对应 quest-service (port 9006)
    /// 提供新手引导、主线任务、日常任务、成就等功能
    /// </summary>
    public static class QuestApi
    {
        private const string BASE_URL = "/api/v1/quest";

        // ================================================================
        // 新手引导 API (Tutorial)
        // ================================================================

        /// <summary>
        /// 获取新手引导步骤列表（定义）
        /// GET /api/v1/quest/tutorial/steps
        /// </summary>
        public static IEnumerator GetTutorialSteps(Action<ApiResult<TutorialStepsResponse>> callback)
        {
            yield return HttpClient.Instance.Get<TutorialStepsResponse>(
                $"{BASE_URL}/tutorial/steps",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<TutorialStepsResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<TutorialStepsResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取新手引导进度
        /// GET /api/v1/quest/tutorial/progress
        /// </summary>
        public static IEnumerator GetTutorialProgress(Action<ApiResult<TutorialProgressResponse>> callback)
        {
            yield return HttpClient.Instance.Get<TutorialProgressResponse>(
                $"{BASE_URL}/tutorial/progress",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<TutorialProgressResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<TutorialProgressResponse>(null, error));
                });
        }

        /// <summary>
        /// 完成新手引导步骤
        /// POST /api/v1/quest/tutorial/complete
        /// </summary>
        public static IEnumerator CompleteTutorialStep(int stepId, Action<ApiResult<object>> callback)
        {
            var body = new
            {
                step_id = stepId
            };

            yield return HttpClient.Instance.Post<object>(
                $"{BASE_URL}/tutorial/complete",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<object>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<object>(null, error));
                });
        }

        /// <summary>
        /// 跳过新手引导
        /// POST /api/v1/quest/tutorial/skip
        /// </summary>
        public static IEnumerator SkipTutorial(Action<ApiResult<object>> callback)
        {
            yield return HttpClient.Instance.Post<object>(
                $"{BASE_URL}/tutorial/skip",
                null,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<object>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<object>(null, error));
                });
        }

        // ================================================================
        // 主线任务 API (Main Quest)
        // ================================================================

        /// <summary>
        /// 获取主线章节列表
        /// GET /api/v1/quest/main/chapters
        /// </summary>
        public static IEnumerator GetChapters(Action<ApiResult<ChaptersResponse>> callback)
        {
            yield return HttpClient.Instance.Get<ChaptersResponse>(
                $"{BASE_URL}/main/chapters",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<ChaptersResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<ChaptersResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取章节详情（含任务列表）
        /// GET /api/v1/quest/main/chapters/{chapterId}
        /// </summary>
        public static IEnumerator GetChapterDetail(int chapterId, Action<ApiResult<ChapterDetailResponse>> callback)
        {
            yield return HttpClient.Instance.Get<ChapterDetailResponse>(
                $"{BASE_URL}/main/chapters/{chapterId}",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<ChapterDetailResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<ChapterDetailResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取主线任务进度
        /// GET /api/v1/quest/main/progress
        /// </summary>
        public static IEnumerator GetMainQuestProgress(Action<ApiResult<MainQuestProgressResponse>> callback)
        {
            yield return HttpClient.Instance.Get<MainQuestProgressResponse>(
                $"{BASE_URL}/main/progress",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<MainQuestProgressResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<MainQuestProgressResponse>(null, error));
                });
        }

        /// <summary>
        /// 接取/完成主线任务
        /// POST /api/v1/quest/main/complete
        /// </summary>
        public static IEnumerator CompleteMainQuest(int questId, Action<ApiResult<object>> callback)
        {
            var body = new
            {
                quest_id = questId
            };

            yield return HttpClient.Instance.Post<object>(
                $"{BASE_URL}/main/complete",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<object>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<object>(null, error));
                });
        }

        /// <summary>
        /// 领取主线任务奖励
        /// POST /api/v1/quest/main/claim
        /// </summary>
        public static IEnumerator ClaimMainQuest(int questId, Action<ApiResult<ClaimRewardResponse>> callback)
        {
            var body = new
            {
                quest_id = questId
            };

            yield return HttpClient.Instance.Post<ClaimRewardResponse>(
                $"{BASE_URL}/main/claim",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<ClaimRewardResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<ClaimRewardResponse>(null, error));
                });
        }

        // ================================================================
        // 日常任务 API (Daily Task)
        // ================================================================

        /// <summary>
        /// 获取日常任务列表及进度
        /// GET /api/v1/quest/daily/tasks
        /// </summary>
        public static IEnumerator GetDailyTasks(Action<ApiResult<DailyTasksResponse>> callback)
        {
            yield return HttpClient.Instance.Get<DailyTasksResponse>(
                $"{BASE_URL}/daily/tasks",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<DailyTasksResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<DailyTasksResponse>(null, error));
                });
        }

        /// <summary>
        /// 领取日常任务奖励
        /// POST /api/v1/quest/daily/claim
        /// </summary>
        public static IEnumerator ClaimDailyTask(int taskId, Action<ApiResult<ClaimRewardResponse>> callback)
        {
            var body = new
            {
                task_id = taskId
            };

            yield return HttpClient.Instance.Post<ClaimRewardResponse>(
                $"{BASE_URL}/daily/claim",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<ClaimRewardResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<ClaimRewardResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取活跃度信息（当前活跃度 + 奖励里程碑）
        /// GET /api/v1/quest/daily/activity
        /// </summary>
        public static IEnumerator GetActivityInfo(Action<ApiResult<ActivityInfoResponse>> callback)
        {
            yield return HttpClient.Instance.Get<ActivityInfoResponse>(
                $"{BASE_URL}/daily/activity",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<ActivityInfoResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<ActivityInfoResponse>(null, error));
                });
        }

        /// <summary>
        /// 领取活跃度奖励
        /// POST /api/v1/quest/daily/activity/claim
        /// </summary>
        public static IEnumerator ClaimActivityReward(int points, Action<ApiResult<ClaimRewardResponse>> callback)
        {
            var body = new
            {
                points = points
            };

            yield return HttpClient.Instance.Post<ClaimRewardResponse>(
                $"{BASE_URL}/daily/activity/claim",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<ClaimRewardResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<ClaimRewardResponse>(null, error));
                });
        }

        // ================================================================
        // 成就 API (Achievement)
        // ================================================================

        /// <summary>
        /// 获取成就列表（按分类筛选）
        /// GET /api/v1/quest/achievement/list?category={category}
        /// </summary>
        public static IEnumerator GetAchievements(string category, Action<ApiResult<AchievementListResponse>> callback)
        {
            string url = $"{BASE_URL}/achievement/list";
            if (!string.IsNullOrEmpty(category))
            {
                url += $"?category={category}";
            }

            yield return HttpClient.Instance.Get<AchievementListResponse>(
                url,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<AchievementListResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<AchievementListResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取单个成就详情
        /// GET /api/v1/quest/achievement/{id}
        /// </summary>
        public static IEnumerator GetAchievement(int id, Action<ApiResult<AchievementProgress>> callback)
        {
            yield return HttpClient.Instance.Get<AchievementProgress>(
                $"{BASE_URL}/achievement/{id}",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<AchievementProgress>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<AchievementProgress>(null, error));
                });
        }

        /// <summary>
        /// 领取成就奖励
        /// POST /api/v1/quest/achievement/claim
        /// </summary>
        public static IEnumerator ClaimAchievement(int id, Action<ApiResult<ClaimRewardResponse>> callback)
        {
            var body = new
            {
                achievement_id = id
            };

            yield return HttpClient.Instance.Post<ClaimRewardResponse>(
                $"{BASE_URL}/achievement/claim",
                body,
                (response) =>
                {
                    callback?.Invoke(new ApiResult<ClaimRewardResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<ClaimRewardResponse>(null, error));
                });
        }

        /// <summary>
        /// 获取成就统计信息
        /// GET /api/v1/quest/achievement/stats
        /// </summary>
        public static IEnumerator GetAchievementStats(Action<ApiResult<AchievementStatsResponse>> callback)
        {
            yield return HttpClient.Instance.Get<AchievementStatsResponse>(
                $"{BASE_URL}/achievement/stats",
                (response) =>
                {
                    callback?.Invoke(new ApiResult<AchievementStatsResponse>(response));
                },
                (error) =>
                {
                    callback?.Invoke(new ApiResult<AchievementStatsResponse>(null, error));
                });
        }
    }
}
