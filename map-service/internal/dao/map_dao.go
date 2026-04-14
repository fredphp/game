package dao

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"map-service/internal/model"
)

var (
	ErrRegionNotFound    = errors.New("region not found")
	ErrCityNotFound      = errors.New("city not found")
	ErrOccupationNotFound = errors.New("occupation not found")
	ErrMarchNotFound     = errors.New("march not found")
	ErrMarchDupID        = errors.New("march id duplicate")
	ErrAllianceNotFound  = errors.New("alliance territory not found")
)

// MapDAO 地图数据访问层
type MapDAO struct {
	db *sql.DB
}

func NewMapDAO(db *sql.DB) *MapDAO {
	return &MapDAO{db: db}
}

// ================================================================
// 地图区域
// ================================================================

// ListRegions 获取所有区域
func (d *MapDAO) ListRegions(ctx context.Context) ([]*model.MapRegion, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, name, display_name, description, center_x, center_y,
		        terrain_type, resource_bonus, sort_order, created_at
		 FROM map_regions ORDER BY sort_order ASC`)
	if err != nil {
		return nil, fmt.Errorf("list regions: %w", err)
	}
	defer rows.Close()

	regions := make([]*model.MapRegion, 0)
	for rows.Next() {
		r := &model.MapRegion{}
		err := rows.Scan(&r.ID, &r.Name, &r.DisplayName, &r.Description,
			&r.CenterX, &r.CenterY, &r.TerrainType,
			&r.ResourceBonus, &r.SortOrder, &r.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan region: %w", err)
		}
		regions = append(regions, r)
	}
	return regions, nil
}

// GetRegionByID 获取区域详情
func (d *MapDAO) GetRegionByID(ctx context.Context, id int) (*model.MapRegion, error) {
	r := &model.MapRegion{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, name, display_name, description, center_x, center_y,
		        terrain_type, resource_bonus, sort_order, created_at
		 FROM map_regions WHERE id = ?`, id,
	).Scan(&r.ID, &r.Name, &r.DisplayName, &r.Description,
		&r.CenterX, &r.CenterY, &r.TerrainType,
		&r.ResourceBonus, &r.SortOrder, &r.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrRegionNotFound
		}
		return nil, fmt.Errorf("get region: %w", err)
	}
	return r, nil
}

// ================================================================
// 城池定义
// ================================================================

// ListAllCities 获取所有城池
func (d *MapDAO) ListAllCities(ctx context.Context) ([]*model.MapCity, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, name, region_id, pos_x, pos_y, level, terrain,
		        defense_base, food_output, wood_output, iron_output, gold_output,
		        is_capital, description, connections, created_at
		 FROM map_cities ORDER BY region_id, level DESC, id ASC`)
	if err != nil {
		return nil, fmt.Errorf("list cities: %w", err)
	}
	defer rows.Close()

	cities := make([]*model.MapCity, 0)
	for rows.Next() {
		c := &model.MapCity{}
		err := rows.Scan(&c.ID, &c.Name, &c.RegionID, &c.PosX, &c.PosY,
			&c.Level, &c.Terrain, &c.DefenseBase,
			&c.FoodOutput, &c.WoodOutput, &c.IronOutput, &c.GoldOutput,
			&c.IsCapital, &c.Description, &c.Connections, &c.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan city: %w", err)
		}
		cities = append(cities, c)
	}
	return cities, nil
}

// GetCityByID 获取城池
func (d *MapDAO) GetCityByID(ctx context.Context, id int64) (*model.MapCity, error) {
	c := &model.MapCity{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, name, region_id, pos_x, pos_y, level, terrain,
		        defense_base, food_output, wood_output, iron_output, gold_output,
		        is_capital, description, connections, created_at
		 FROM map_cities WHERE id = ?`, id,
	).Scan(&c.ID, &c.Name, &c.RegionID, &c.PosX, &c.PosY,
		&c.Level, &c.Terrain, &c.DefenseBase,
		&c.FoodOutput, &c.WoodOutput, &c.IronOutput, &c.GoldOutput,
		&c.IsCapital, &c.Description, &c.Connections, &c.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrCityNotFound
		}
		return nil, fmt.Errorf("get city: %w", err)
	}
	return c, nil
}

// ListCitiesByRegion 按区域获取城池
func (d *MapDAO) ListCitiesByRegion(ctx context.Context, regionID int) ([]*model.MapCity, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, name, region_id, pos_x, pos_y, level, terrain,
		        defense_base, food_output, wood_output, iron_output, gold_output,
		        is_capital, description, connections, created_at
		 FROM map_cities WHERE region_id = ? ORDER BY level DESC, id ASC`, regionID)
	if err != nil {
		return nil, fmt.Errorf("list cities by region: %w", err)
	}
	defer rows.Close()

	cities := make([]*model.MapCity, 0)
	for rows.Next() {
		c := &model.MapCity{}
		err := rows.Scan(&c.ID, &c.Name, &c.RegionID, &c.PosX, &c.PosY,
			&c.Level, &c.Terrain, &c.DefenseBase,
			&c.FoodOutput, &c.WoodOutput, &c.IronOutput, &c.GoldOutput,
			&c.IsCapital, &c.Description, &c.Connections, &c.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan city: %w", err)
		}
		cities = append(cities, c)
	}
	return cities, nil
}

// BatchGetCities 批量获取城池
func (d *MapDAO) BatchGetCities(ctx context.Context, ids []int64) (map[int64]*model.MapCity, error) {
	if len(ids) == 0 {
		return make(map[int64]*model.MapCity), nil
	}
	placeholders := strings.Repeat("?,", len(ids))
	placeholders = placeholders[:len(placeholders)-1]
	args := make([]interface{}, 0, len(ids))
	for _, id := range ids {
		args = append(args, id)
	}

	query := fmt.Sprintf(
		`SELECT id, name, region_id, pos_x, pos_y, level, terrain,
		        defense_base, food_output, wood_output, iron_output, gold_output,
		        is_capital, description, connections, created_at
		 FROM map_cities WHERE id IN (%s)`, placeholders)

	rows, err := d.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("batch get cities: %w", err)
	}
	defer rows.Close()

	result := make(map[int64]*model.MapCity)
	for rows.Next() {
		c := &model.MapCity{}
		err := rows.Scan(&c.ID, &c.Name, &c.RegionID, &c.PosX, &c.PosY,
			&c.Level, &c.Terrain, &c.DefenseBase,
			&c.FoodOutput, &c.WoodOutput, &c.IronOutput, &c.GoldOutput,
			&c.IsCapital, &c.Description, &c.Connections, &c.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan city: %w", err)
		}
		result[c.ID] = c
	}
	return result, nil
}

// ================================================================
// 城池占领
// ================================================================

// GetOccupation 获取城池占领状态
func (d *MapDAO) GetOccupation(ctx context.Context, cityID int64) (*model.CityOccupation, error) {
	o := &model.CityOccupation{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, city_id, owner_type, owner_id, alliance_id,
		        garrison_power, occupy_time, defense_walls,
		        resource_stored, updated_at, created_at
		 FROM city_occupations WHERE city_id = ?`, cityID,
	).Scan(&o.ID, &o.CityID, &o.OwnerType, &o.OwnerID, &o.AllianceID,
		&o.GarrisonPower, &o.OccupyTime, &o.DefenseWalls,
		&o.ResourceStored, &o.UpdatedAt, &o.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrOccupationNotFound
		}
		return nil, fmt.Errorf("get occupation: %w", err)
	}
	return o, nil
}

// UpsertOccupation 创建或更新城池占领
func (d *MapDAO) UpsertOccupation(ctx context.Context, o *model.CityOccupation) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO city_occupations
		    (city_id, owner_type, owner_id, alliance_id, garrison_power,
		     occupy_time, defense_walls, updated_at, created_at)
		 VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())
		 ON DUPLICATE KEY UPDATE
		   owner_type = VALUES(owner_type),
		   owner_id = VALUES(owner_id),
		   alliance_id = VALUES(alliance_id),
		   garrison_power = VALUES(garrison_power),
		   occupy_time = VALUES(occupy_time),
		   defense_walls = VALUES(defense_walls),
		   updated_at = NOW()`,
		o.CityID, o.OwnerType, o.OwnerID, o.AllianceID, o.GarrisonPower, o.DefenseWalls)
	if err != nil {
		return fmt.Errorf("upsert occupation: %w", err)
	}
	return nil
}

// ListOccupationsByOwner 获取玩家/联盟占领的城池
func (d *MapDAO) ListOccupationsByOwner(ctx context.Context, ownerType int8, ownerID int64) ([]*model.CityOccupation, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, city_id, owner_type, owner_id, alliance_id,
		        garrison_power, occupy_time, defense_walls,
		        resource_stored, updated_at, created_at
		 FROM city_occupations
		 WHERE owner_type = ? AND owner_id = ? ORDER BY occupy_time ASC`, ownerType, ownerID)
	if err != nil {
		return nil, fmt.Errorf("list occupations: %w", err)
	}
	defer rows.Close()

	occupations := make([]*model.CityOccupation, 0)
	for rows.Next() {
		o := &model.CityOccupation{}
		err := rows.Scan(&o.ID, &o.CityID, &o.OwnerType, &o.OwnerID, &o.AllianceID,
			&o.GarrisonPower, &o.OccupyTime, &o.DefenseWalls,
			&o.ResourceStored, &o.UpdatedAt, &o.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan occupation: %w", err)
		}
		occupations = append(occupations, o)
	}
	return occupations, nil
}

// UpdateGarrison 更新城池驻军
func (d *MapDAO) UpdateGarrison(ctx context.Context, cityID int64, garrisonPower int) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE city_occupations SET garrison_power = ?, updated_at = NOW()
		 WHERE city_id = ?`, garrisonPower, cityID)
	if err != nil {
		return fmt.Errorf("update garrison: %w", err)
	}
	return nil
}

// ================================================================
// 行军令
// ================================================================

// CreateMarch 创建行军令
func (d *MapDAO) CreateMarch(ctx context.Context, m *model.MarchOrder) (int64, error) {
	pathJSON, _ := json.Marshal(m.Path)
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO march_orders
		    (march_id, user_id, alliance_id, source_city_id, target_city_id,
		     march_type, army_power, army_info, path, total_distance,
		     march_speed, status, start_time, arrive_time, progress, consume_food, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, 0, ?, NOW())`,
		m.MarchID, m.UserID, m.AllianceID, m.SourceCityID, m.TargetCityID,
		m.MarchType, m.ArmyPower, m.ArmyInfo, pathJSON,
		m.TotalDistance, m.MarchSpeed, m.Status,
		m.ArriveTime, m.ConsumeFood)
	if err != nil {
		return 0, fmt.Errorf("create march: %w", err)
	}
	return d.getLastInsertID(ctx)
}

func (d *MapDAO) getLastInsertID(ctx context.Context) (int64, error) {
	var id int64
	err := d.db.QueryRowContext(ctx, "SELECT LAST_INSERT_ID()").Scan(&id)
	return id, err
}

// GetMarchByMarchID 根据UUID获取行军令
func (d *MapDAO) GetMarchByMarchID(ctx context.Context, marchID string) (*model.MarchOrder, error) {
	m := &model.MarchOrder{}
	var pathJSON []byte
	err := d.db.QueryRowContext(ctx,
		`SELECT id, march_id, user_id, alliance_id, source_city_id, target_city_id,
		        march_type, army_power, army_info, path, total_distance,
		        march_speed, status, start_time, arrive_time, actual_arrive,
		        progress, battle_result, consume_food, created_at
		 FROM march_orders WHERE march_id = ?`, marchID,
	).Scan(&m.ID, &m.MarchID, &m.UserID, &m.AllianceID,
		&m.SourceCityID, &m.TargetCityID, &m.MarchType, &m.ArmyPower,
		&m.ArmyInfo, &pathJSON, &m.TotalDistance, &m.MarchSpeed,
		&m.Status, &m.StartTime, &m.ArriveTime, &m.ActualArrive,
		&m.Progress, &m.BattleResult, &m.ConsumeFood, &m.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrMarchNotFound
		}
		return nil, fmt.Errorf("get march: %w", err)
	}
	_ = json.Unmarshal(pathJSON, &m.Path)
	return m, nil
}

// UpdateMarchStatus 更新行军状态
func (d *MapDAO) UpdateMarchStatus(ctx context.Context, marchID string, status int8, battleResult json.RawMessage) error {
	if battleResult != nil {
		_, err := d.db.ExecContext(ctx,
			`UPDATE march_orders SET status = ?, actual_arrive = NOW(),
			 battle_result = ?, progress = 100
			 WHERE march_id = ? AND status IN (1, 3)`,
			status, battleResult, marchID)
		if err != nil {
			return fmt.Errorf("update march status: %w", err)
		}
	} else {
		_, err := d.db.ExecContext(ctx,
			`UPDATE march_orders SET status = ?, actual_arrive = NOW(), progress = 100
			 WHERE march_id = ? AND status IN (1, 3)`, status, marchID)
		if err != nil {
			return fmt.Errorf("update march status: %w", err)
		}
	}
	return nil
}

// UpdateMarchProgress 更新行军进度
func (d *MapDAO) UpdateMarchProgress(ctx context.Context, marchID string, progress int) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE march_orders SET progress = ? WHERE march_id = ? AND status = 1`,
		progress, marchID)
	if err != nil {
		return fmt.Errorf("update march progress: %w", err)
	}
	return nil
}

// ListActiveMarches 获取所有活跃行军（行军中/战斗中）
func (d *MapDAO) ListActiveMarches(ctx context.Context) ([]*model.MarchOrder, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, march_id, user_id, alliance_id, source_city_id, target_city_id,
		        march_type, army_power, army_info, path, total_distance,
		        march_speed, status, start_time, arrive_time, actual_arrive,
		        progress, battle_result, consume_food, created_at
		 FROM march_orders WHERE status IN (1, 3) ORDER BY arrive_time ASC`)
	if err != nil {
		return nil, fmt.Errorf("list active marches: %w", err)
	}
	defer rows.Close()

	return d.scanMarchRows(rows)
}

// ListUserMarches 获取用户行军列表
func (d *MapDAO) ListUserMarches(ctx context.Context, userID int64, status int8, limit int) ([]*model.MarchOrder, error) {
	query := `SELECT id, march_id, user_id, alliance_id, source_city_id, target_city_id,
		        march_type, army_power, army_info, path, total_distance,
		        march_speed, status, start_time, arrive_time, actual_arrive,
		        progress, battle_result, consume_food, created_at
		 FROM march_orders WHERE user_id = ?`
	args := []interface{}{userID}

	if status > 0 {
		query += " AND status = ?"
		args = append(args, status)
	}
	query += " ORDER BY created_at DESC LIMIT ?"
	args = append(args, limit)

	rows, err := d.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list user marches: %w", err)
	}
	defer rows.Close()

	return d.scanMarchRows(rows)
}

// CountUserActiveMarches 统计用户活跃行军数
func (d *MapDAO) CountUserActiveMarches(ctx context.Context, userID int64) (int, error) {
	var count int
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM march_orders WHERE user_id = ? AND status IN (1, 3)`, userID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count active marches: %w", err)
	}
	return count, nil
}

// ListArrivedMarches 获取已到达的行军（按到达时间排序）
func (d *MapDAO) ListArrivedMarches(ctx context.Context, limit int) ([]*model.MarchOrder, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, march_id, user_id, alliance_id, source_city_id, target_city_id,
		        march_type, army_power, army_info, path, total_distance,
		        march_speed, status, start_time, arrive_time, actual_arrive,
		        progress, battle_result, consume_food, created_at
		 FROM march_orders WHERE status = 1 AND arrive_time <= NOW()
		 ORDER BY arrive_time ASC LIMIT ?`, limit)
	if err != nil {
		return nil, fmt.Errorf("list arrived marches: %w", err)
	}
	defer rows.Close()

	return d.scanMarchRows(rows)
}

func (d *MapDAO) scanMarchRows(rows *sql.Rows) ([]*model.MarchOrder, error) {
	marches := make([]*model.MarchOrder, 0)
	for rows.Next() {
		m := &model.MarchOrder{}
		var pathJSON []byte
		err := rows.Scan(&m.ID, &m.MarchID, &m.UserID, &m.AllianceID,
			&m.SourceCityID, &m.TargetCityID, &m.MarchType, &m.ArmyPower,
			&m.ArmyInfo, &pathJSON, &m.TotalDistance, &m.MarchSpeed,
			&m.Status, &m.StartTime, &m.ArriveTime, &m.ActualArrive,
			&m.Progress, &m.BattleResult, &m.ConsumeFood, &m.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan march: %w", err)
		}
		_ = json.Unmarshal(pathJSON, &m.Path)
		marches = append(marches, m)
	}
	return marches, nil
}

// ================================================================
// 联盟领土
// ================================================================

// GetAllianceTerritory 获取联盟领土
func (d *MapDAO) GetAllianceTerritory(ctx context.Context, allianceID int64) (*model.AllianceTerritory, error) {
	t := &model.AllianceTerritory{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, alliance_id, city_count, capital_count,
		        total_food, total_wood, total_iron, total_gold,
		        territory_level, buff_config, updated_at, created_at
		 FROM alliance_territories WHERE alliance_id = ?`, allianceID,
	).Scan(&t.ID, &t.AllianceID, &t.CityCount, &t.CapitalCount,
		&t.TotalFood, &t.TotalWood, &t.TotalIron, &t.TotalGold,
		&t.TerritoryLevel, &t.BuffConfig, &t.UpdatedAt, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrAllianceNotFound
		}
		return nil, fmt.Errorf("get alliance territory: %w", err)
	}
	return t, nil
}

// UpsertAllianceTerritory 更新联盟领土
func (d *MapDAO) UpsertAllianceTerritory(ctx context.Context, t *model.AllianceTerritory) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO alliance_territories
		    (alliance_id, city_count, capital_count,
		     total_food, total_wood, total_iron, total_gold,
		     territory_level, buff_config, updated_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		 ON DUPLICATE KEY UPDATE
		   city_count = VALUES(city_count),
		   capital_count = VALUES(capital_count),
		   total_food = VALUES(total_food),
		   total_wood = VALUES(total_wood),
		   total_iron = VALUES(total_iron),
		   total_gold = VALUES(total_gold),
		   territory_level = VALUES(territory_level),
		   buff_config = VALUES(buff_config),
		   updated_at = NOW()`,
		t.AllianceID, t.CityCount, t.CapitalCount,
		t.TotalFood, t.TotalWood, t.TotalIron, t.TotalGold,
		t.TerritoryLevel, t.BuffConfig)
	if err != nil {
		return fmt.Errorf("upsert alliance territory: %w", err)
	}
	return nil
}

// ================================================================
// 城池战斗日志
// ================================================================

// CreateBattleLog 创建战斗日志
func (d *MapDAO) CreateBattleLog(ctx context.Context, log *model.CityBattleLog) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO city_battle_logs
		    (city_id, march_id, attacker_id, attacker_name,
		     defender_id, defender_name, attacker_power, defender_power,
		     attacker_win, result_detail, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
		log.CityID, log.MarchID, log.AttackerID, log.AttackerName,
		log.DefenderID, log.DefenderName, log.AttackerPower, log.DefenderPower,
		log.AttackerWin, log.ResultDetail)
	if err != nil {
		return fmt.Errorf("create battle log: %w", err)
	}
	return nil
}

// ListCityBattleLogs 获取城池战斗日志
func (d *MapDAO) ListCityBattleLogs(ctx context.Context, cityID int64, limit int) ([]*model.CityBattleLog, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, city_id, march_id, attacker_id, attacker_name,
		        defender_id, defender_name, attacker_power, defender_power,
		        attacker_win, result_detail, created_at
		 FROM city_battle_logs WHERE city_id = ?
		 ORDER BY created_at DESC LIMIT ?`, cityID, limit)
	if err != nil {
		return nil, fmt.Errorf("list battle logs: %w", err)
	}
	defer rows.Close()

	logs := make([]*model.CityBattleLog, 0)
	for rows.Next() {
		l := &model.CityBattleLog{}
		err := rows.Scan(&l.ID, &l.CityID, &l.MarchID, &l.AttackerID, &l.AttackerName,
			&l.DefenderID, &l.DefenderName, &l.AttackerPower, &l.DefenderPower,
			&l.AttackerWin, &l.ResultDetail, &l.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan battle log: %w", err)
		}
		logs = append(logs, l)
	}
	return logs, nil
}

// ================================================================
// 统计
// ================================================================

// CountOccupations 统计各类型城池数量
func (d *MapDAO) CountOccupations(ctx context.Context) (neutral, player, alliance int, err error) {
	err = d.db.QueryRowContext(ctx,
		`SELECT
		   COALESCE(SUM(CASE WHEN owner_type = 0 THEN 1 ELSE 0 END), 0),
		   COALESCE(SUM(CASE WHEN owner_type = 1 THEN 1 ELSE 0 END), 0),
		   COALESCE(SUM(CASE WHEN owner_type = 2 THEN 1 ELSE 0 END), 0)
		 FROM city_occupations`).Scan(&neutral, &player, &alliance)
	return
}
