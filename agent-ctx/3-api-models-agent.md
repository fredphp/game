---
Task ID: 3
Agent: api-models-agent
Task: Create Unity Network API Services and Data Models

Work Log:
- Created 5 data model files under Assets/Scripts/Data/
  - UserModel.cs: User, LoginRequest, RegisterRequest, LoginResponse, TokenData, UpdateProfileRequest, UpdatePasswordRequest
  - CardModel.cs: Card, CardPool, GachaRequest, GachaResult, GachaStats, CardPageResult, GachaHistoryResult, GachaRecord, LockCardRequest
  - BattleModel.cs: BattleRecord, BattleRound, BattleUnit, BattleDetail, PVERequest, BattleStartResponse, Battle, BattleReplayResponse, BattleHistoryResponse, RewardItem
  - MapModel.cs: MapRegion, CityResources, MapCity, CityOccupation, MarchOrder, MarchRequest, MarchProgress, TerritoryCity, AllianceTerritory, and 7 response types
  - GuildModel.cs: Guild, GuildMember, GuildApplication, GuildWar, CoopBattle, CoopParticipant, 5 request types, 8 response types, MessageResponse, and 4 enums
- Created 5 API service files under Assets/Scripts/Core/Network/Api/
  - UserApi.cs: 6 endpoints (Register, Login, GetProfile, UpdateProfile, UpdatePassword, Logout) with token management
  - CardApi.cs: 6 endpoints (ListPools, Gacha/GachaSingle/GachaTen, ListUserCards, ToggleLock, GachaHistory, GachaStats)
  - BattleApi.cs: 3 endpoints (StartPVE, GetReplay, GetHistory)
  - MapApi.cs: 10 endpoints (GetOverview, GetRegions, GetCitiesByRegion, GetCityDetail, GetCityLogs, InitiateMarch, ListMarches, GetMarchProgress, RecallMarch, GetTerritory)
  - GuildApi.cs: 20 endpoints covering guild CRUD, member management, applications, wars, and coop battles
- All models are [Serializable] with { get; set; } properties and [SerializeField] fields
- Enums include: CardRarity, BattleResult, MarchStatus, GuildRole, ApplicationStatus, GuildWarStatus, CoopBattleStatus
- All API methods are Coroutine-based with Action<ApiResult<T>> callbacks
- UserApi.Login/Register include automatic token persistence (TokenHolder + PlayerPrefs)
- Chinese comments added to key methods explaining functionality

Stage Summary:
- 10 files created across Data/ and Core/Network/Api/ directories
- Data models: 5 files with ~50 model classes total
- API services: 5 files covering 45 API endpoint wrappers
- Total endpoint count: UserApi(6) + CardApi(6) + BattleApi(3) + MapApi(10) + GuildApi(20) = 45
- Dependencies assumed: HttpClient.Instance, TokenHolder.Instance, ApiResult<T>, Constants
