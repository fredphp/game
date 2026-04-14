# Task ID: 5 - login-city-card-agent

## Task
Create Unity Login, MainCity, and Card Module UI panels for 九州争鼎 (Jiuzhou Zhengding) SLG card game.

## Context
- Base framework already created by Task ID 2 (core-framework-agent): UIBase, UIManager, EventBus, TokenHolder, Constants, ApiResult, HttpClient
- API services already created by Task ID 3 (api-models-agent): UserApi, CardApi with coroutine-based callbacks
- Data models exist: UserModel.cs, CardModel.cs (extended by this agent)
- Battle/Map panels already created by Task ID 6 (battle-map-agent)

## Key Architecture Decisions

### Namespace Mapping
- **UIBase / UIManager**: `Jiuzhou.Core` (not `Game.Core.UI`)
- **EventBus**: `Jiuzhou.Core` (static class, not singleton instance)
- **Constants**: `Jiuzhou.Core` with `Constants.GameEvents.*` and `Constants.PanelNames.*`
- **UserApi / CardApi**: `Game.Core.Network.Api` (static classes, not singleton)
- **Data Models**: `Game.Data`
- **TokenHolder**: `Jiuzhou.Core` (static class for JWT management)

### API Callback Pattern
```csharp
// Callback uses ApiResult<T> wrapper
StartCoroutine(UserApi.Login(request, (ApiResult<LoginResponse> apiResult) => {
    if (apiResult != null && apiResult.IsSuccess() && apiResult.data != null) {
        // Success
    } else {
        // apiResult.message has error string
    }
}));
```

### OnOpen Signature
```csharp
public override void OnOpen(params object[] args)
```

### PanelName
Set via `_panelName` field or `PanelName` property (already defined in UIBase)

## Files Created

1. **LoginPanel.cs** - Login with validation, auto-login, token persistence
2. **RegisterPanel.cs** - Registration with validation, auto-login after register
3. **MainCityPanel.cs** - Main hub with resources, navigation, stamina timer
4. **BuildingInfoPanel.cs** - Building detail with 6 building types, upgrade system
5. **CardCollectionPanel.cs** - Card inventory with grid, filtering, sorting, pagination
6. **GachaPanel.cs** - Gacha/summoning with pools, pulls, rarity animations
7. **DeckEditPanel.cs** - Deck building with click-to-add, validation, auto-fill, faction synergy

## Files Modified
- **CardApi.cs** - Added missing response types: GachaResult, CardPageResult, GachaHistoryResult, GachaHistoryRecord, GachaStats
- **CardModel.cs** - Was extended with DeckData, DeckSlotData, CardSortType, PlayerBuilding, PlayerGuildInfo
