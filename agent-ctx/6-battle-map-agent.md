# Task 6 - Battle and Map Module UI Panels

## Agent: battle-map-agent

## Files Created

### Battle Module (3 files)
1. **BattleManager.cs** (`Module/Battle/BattleManager.cs`)
   - Singleton MonoBehaviour, core battle simulation
   - BattleState enum: Idle, Preparing, InProgress, Animating, Victory, Defeat, Paused
   - BattleCard runtime data class with HP, attack, defense, speed, faction, skill, cooldowns
   - Faction counter system: 魏>蜀>吴>群>魏, 20% damage bonus
   - Damage formula: base_atk * (1 + skill_mult) * random(0.9,1.1) - base_def * 0.5
   - Critical hit: 10% chance, 1.5x damage
   - Turn order by speed, 50% skill use when cooldown ready
   - Star rating: 3 stars (all alive), 2 stars (60%+), 1 star (any alive)
   - Stage difficulty config (levels 1-10) with HP/ATK multipliers and rewards
   - Enemy team generation from templates based on stage level
   - Events: OnRoundStart, OnAttack, OnSkillUse, OnCardDeath, OnBattleEnd, OnStateChanged, OnActionLog

2. **BattlePanel.cs** (`Module/Battle/BattlePanel.cs`)
   - UIBase panel with player/enemy card slots (5 each)
   - CardSlotUI component: name, HP bar (green/yellow/red), faction color, skill cooldown
   - Attack animation: smoothstep position lerp (forward thrust + return)
   - Damage number: floating text with fade-out, critical hit yellow highlight
   - Skill effect: scale pulse + optional particle prefab
   - Battle log: scrolling text area with auto-scroll, action history
   - Speed control: 1x/2x toggle, pause/resume
   - Battle timer: MM:SS display
   - Team power calculation
   - Death animation: gray overlay + fade + scale down

3. **BattleResultPanel.cs** (`Module/Battle/BattleResultPanel.cs`)
   - Result display: victory/defeat title with icon and effects
   - Star rating: sequential pop-in animation (elastic scale)
   - Battle stats: rounds, survival rate, total damage
   - Rewards: gold/exp counter animation, card reward items
   - New card reveal: flip animation, rarity color borders (Common/Rare/Epic/Legendary)
   - Action buttons: next stage, replay, back to main city
   - CardRewardItem component for reward list items

### Map Module (3 files)
4. **WorldMapPanel.cs** (`Module/Map/WorldMapPanel.cs`)
   - Full world map with 9 regions (九州) and 36 cities
   - City nodes: clickable with name, level, occupation color
   - Connection lines between adjacent cities
   - Territory colors: neutral(gray), own(green), alliance(blue), enemy(red), contested(flashing orange)
   - Contested city flashing animation (sine wave color interpolation)
   - Region filter buttons, status filter toggles
   - City search with auto-focus (smooth scroll)
   - Zoom control: slider + buttons, min 0.5x max 2.0x
   - Active march list with progress tracking (auto-refresh every 5s)
   - CityNodeUI component: name, level, occupation color, guild banner
   - MarchItemUI component: route, troops, ETA, progress bar
   - Mock data generation: 36 cities, 40+ connections, march orders

5. **CityInfoPanel.cs** (`Module/Map/CityInfoPanel.cs`)
   - City detail popup with full information display
   - Basic info: name, level, region, owner with occupation color
   - Resources: gold/food/iron/wood production per hour
   - Defense: strength bar (green/yellow/red), garrison count/type
   - Connected cities list with status colors and click navigation
   - Battle history: recent 5 logs with result, timestamp, troop counts
   - Distance calculation and march time/cost estimation
   - Attack validation (can't attack own cities)
   - Actions: attack, scout, reinforce, close
   - ConnectionCityItem and BattleLogItem UI components

6. **MarchPanel.cs** (`Module/Map/MarchPanel.cs`)
   - March order creation: target city, source city selection
   - 4 troop types: Infantry(balanced), Cavalry(fast), Archer(ranged), Siege(slow+city bonus)
   - Troop count slider with +/- buttons, step of 50
   - March time calculation: base_time * distance / troop_speed
   - Food cost calculation: troops * distance * food_per_unit * factor
   - Arrival time display
   - Attack/Reinforce mode toggle
   - Active marches list with real-time progress updates (3s interval)
   - Recall functionality (returns 50% troops)
   - Max 5 simultaneous marches
   - ActiveMarchItemUI component: route, progress bar, ETA, recall button
   - TroopConfig data for all 4 troop types with stats
