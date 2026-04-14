# Task 2 - Core Framework Agent Work Record

## Task: Create Unity Core Framework (Singleton, Managers, Network, UI, Utils)

## Files Created (14 total):

### Core/Base/
1. **Singleton.cs** - Generic MonoBehaviour singleton with double-check locking, thread-safe lazy init, protected constructor

### Core/Utils/
2. **Constants.cs** - All game constants: service ports (9001-9005), API endpoints for all 5 services, UI layer names, panel names, PlayerPrefs keys, game events, config values
3. **EventBus.cs** - Thread-safe event system using ConcurrentDictionary, supports generic data passing, register/unregister/trigger pattern
4. **JsonHelper.cs** - JSON utility wrapping UnityEngine.JsonUtility, adds List/Array support via wrapper pattern, ExtractField, DeepCopy, TryFromJson helpers

### Core/Network/
5. **ApiResult.cs** - Generic API response wrapper (code/message/data), static Parse method, response code constants, TokenHolder static class for JWT management
6. **HttpClient.cs** - UnityWebRequest-based HTTP client, GET/POST/PUT/DELETE with generic callbacks, auto JWT Bearer token, retry logic, timeout config
7. **WebSocketClient.cs** - HTTP long-polling based real-time client, connection state management, auto-reconnect with exponential backoff, heartbeat mechanism

### Core/UI/
8. **UILayer.cs** - Enum with 6 layers (Background=0, Scene=100, Main=200, Popup=300, Top=400, Guide=500), extension methods
9. **UIBase.cs** - Abstract base class for all panels, lifecycle (OnOpen/OnClose/OnRefresh), data binding, animation system (Fade/Scale/Slide/EaseOutCubic), close button auto-binding

### Core/Manager/
10. **AudioManager.cs** - BGM (single loop) and SFX (pool of 8 sources) management, volume control, fade transitions, PlayerPrefs persistence
11. **UIManager.cs** - 6-layer Canvas system, panel prefab loading from Resources/UI/Panels, panel cache dictionary, single-popup constraint, loading panel management
12. **NetworkManager.cs** - HTTP + WebSocket orchestration, network status monitoring (Application.internetReachability), token auto-refresh (30s interval), service URL config, convenience API methods
13. **GameManager.cs** - Top-level state machine (Login/MainCity/Battle/Map/Loading), player data cache, scene loading, sub-manager initialization, global event handlers

### Root:
14. **GameEntry.cs** - Unity MonoBehaviour entry point, Awake creates GameManager, Start checks Token and routes to login/main city, app lifecycle handlers, editor debug tools

## Architecture:
- All managers inherit Singleton<T> pattern
- EventBus is a static class (no MonoBehaviour)
- UI uses 6-layer Canvas with sortingOrder
- Network uses UnityWebRequest (coroutine-based)
- All API calls go through HttpClient singleton with auto JWT
- Token stored in PlayerPrefs (access_token, refresh_token)
- Services: user(9001), card(9002), battle(9003), map(9004), guild(9005)
