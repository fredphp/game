---
Task ID: 3
Agent: unity-quest-client
Task: Implement Unity client scripts for quest system

Files Created:
1. `/home/z/my-project/unity-client/Assets/Scripts/Data/QuestModel.cs` (~500 lines)
   - 22 [Serializable] data model classes matching Go backend quest-service
   - TutorialStep, TutorialProgress, TutorialStepsResponse, TutorialProgressResponse
   - MainChapter, MainQuest, MainQuestProgress, ChaptersResponse, ChapterDetailResponse, MainQuestProgressResponse
   - DailyTask, DailyTaskProgress, ActivityReward, DailyTasksResponse, ActivityInfoResponse
   - Achievement, AchievementProgress, AchievementListResponse, AchievementStatsResponse
   - RewardItem, CompleteStepRequest, ClaimRewardResponse
   - All JSON field names use snake_case for Go backend compatibility
   - Helper methods: ProgressPercent, GetStatusName, GetTypeName, GetRarityColor, GetDisplayText

2. `/home/z/my-project/unity-client/Assets/Scripts/Core/Network/Api/QuestApi.cs` (~210 lines)
   - 16 static API methods using coroutine (IEnumerator) pattern
   - Tutorial: GetTutorialSteps, GetTutorialProgress, CompleteTutorialStep, SkipTutorial
   - Main Quest: GetChapters, GetChapterDetail, GetMainQuestProgress, CompleteMainQuest, ClaimMainQuest
   - Daily Task: GetDailyTasks, ClaimDailyTask, GetActivityInfo, ClaimActivityReward
   - Achievement: GetAchievements, GetAchievement, ClaimAchievement, GetAchievementStats
   - Follows existing UserApi/CardApi pattern exactly

3. `/home/z/my-project/unity-client/Assets/Scripts/Module/Quest/QuestPanel.cs` (~530 lines)
   - Extends UIBase with 3-tab interface (主线/日常/成就)
   - Tab switching with highlight indicators, red dot notifications
   - Main Quest: scrollable chapter cards → quest list with progress/claim
   - Daily Task: progress bars, reward preview, activity milestone bar
   - Achievement: category filter (6 categories), rarity-colored grid
   - Reward preview popup, EventBus RESOURCE_CHANGED on claim
   - Parallel data loading pattern

4. `/home/z/my-project/unity-client/Assets/Scripts/Module/Quest/TutorialPanel.cs` (~480 lines)
   - Overlay panel on Guide layer
   - Semi-transparent mask with dynamic highlight frame targeting
   - Dialog box with speaker avatar, typewriter effect
   - Arrow bounce animation, tap pulse animation
   - Step progress indicator (text + colored dots)
   - Skip confirmation dialog
   - Callback-driven: SetCallbacks(stepComplete, onSkip, onFinish)

5. `/home/z/my-project/unity-client/Assets/Scripts/Module/Quest/TutorialManager.cs` (~420 lines)
   - Singleton<TutorialManager> state machine
   - States: Idle → Loading → Waiting → Running → Completed/Skipped
   - Auto-start for new players, auto-resume from last step
   - TriggerGameEvent for condition-based advancement
   - Pause/Resume support, PlayerPrefs persistence
   - EventBus integration, TutorialPanel coordination

Key Design Decisions:
- Used [SerializeField] private + public properties (matching CardModel.cs pattern)
- All API calls follow existing HttpClient.Instance.Get<T>/Post<T> coroutine pattern
- JSON field names use snake_case for Go backend compatibility
- TutorialPanel uses callback pattern (not direct API calls) driven by TutorialManager
- Red dot indicators check claimable status across all quest types
- Debug.Log prefixed with [TutorialManager]/[QuestPanel]/[TutorialPanel]
