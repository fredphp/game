---
Task ID: 3-10
Agent: full-stack-developer
Task: Optimize map-service for 九州争鼎 SLG game with 4 reliability improvements

Work Summary:
Modified 8 Go files in map-service/ implementing march persistence, Redis sorted set queue, disconnect recovery, and city occupation lock.

Files Modified:
1. `internal/model/map_model.go` — Added 6 new types (MarchCheckpoint, CityOccupationLock, MarchRecoveryInfo, EngineStats) and 2 const groups (CheckpointStatus, LockStatus)
2. `internal/dao/map_dao.go` — Added 14 new DAO methods for checkpoints, locks, stuck marches, CAS updates, and statistics
3. `internal/engine/march_engine.go` — Complete rewrite (~1070 lines): Redis Sorted Set priority queue, ZPOPMIN workers, checkpoint heartbeat, recovery worker, city occupation lock, graceful shutdown
4. `internal/service/map_service.go` — Added 3 new service methods: RecoverMarches, GetEngineStats, GetUserMarchesWithProgress
5. `internal/handler/map_handler.go` — Added EngineStats handler
6. `internal/router/router.go` — Added `GET /api/v1/map/engine/stats` route
7. `cmd/main.go` — Added startup recovery call with context import
8. `config/config.yaml` — Added lock_ttl_seconds, heartbeat_ttl_seconds, recovery_interval_sec

Key Architecture Decisions:
- Redis Sorted Set (`map:march:queue`) replaces Redis Stream — ZPOPMIN provides atomic consumption without duplicates
- CAS pattern (Marching→Battle) ensures only one worker processes each march
- DB-level city lock via INSERT IGNORE on UNIQUE KEY prevents duplicate occupation
- Checkpoint heartbeat enables crash detection and automatic recovery
- sync.WaitGroup + context cancellation for graceful shutdown

Dependencies:
- Uses existing schema.sql tables: march_checkpoints, city_occupation_locks (already created)
- No new external dependencies required
- go-redis/v9 ZPOPMIN command used (already in go.mod)
