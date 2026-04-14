---
Task ID: economy-design-system
Agent: main
Task: Create SLG Economy Design System admin page for 九州争鼎

Work Log:
- Created `/src/components/admin/economy-page.tsx` — comprehensive economy design system with 5 tabs
- Tab 1 (资源产出): Base production formula with editable 6-resource parameter table, interactive calculator with City/Tech/VIP sliders, LineChart showing gold production curve across city levels 1-25 with VIP0/5/10 comparison lines
- Tab 2 (资源消耗): Building upgrade formula table (8 buildings), ComposedChart with bars (single cost) + line (cumulative cost) for Castle 1-25, hero upgrade cost calculator (R/SR/SSR) with LineChart, march/siege cost calculator with troops+distance sliders
- Tab 3 (抽卡货币控制): Gacha pricing table (5 types), diamond income sources table with free/paid summaries, pity mechanism with editable soft/hard pity + AreaChart probability curve with reference lines, diamond economy balance summary cards (6 key metrics)
- Tab 4 (通胀控制): Resource sink table (8 drains with daily estimates), horizontal BarChart production vs consumption with ratio badges, soft cap mechanism with VIP-scaled grid, time-gating table (daily/weekly/monthly)
- Tab 5 (公式计算器): Select-based formula picker (9 formulas), dynamic parameter inputs per formula type, real-time formula display, large result display card, quick reference values
- Updated `/src/app/page.tsx` — added EconomyPage import and route
- Updated `/src/lib/admin-data.ts` — added economy menu item (id: economy, icon: ArrowDownUp)
- ESLint passes with zero errors
- Dev server compiles and serves successfully

Stage Summary:
- 1 file created: `src/components/admin/economy-page.tsx` (~680 lines)
- 2 files updated: `src/app/page.tsx`, `src/lib/admin-data.ts`
- All formulas are interactive with real-time calculation via useMemo
- 5 Recharts visualizations: LineChart (production curve), ComposedChart (building costs), LineChart (hero costs), AreaChart (pity probability), BarChart (production vs consumption)
- Color scheme: amber (gold/production), emerald (food/growth), rose (consumption/sinks), violet (gacha/premium), sky (generic) — no indigo/blue
- Responsive design with mobile-first sliders, collapsible tables (max-h-96), grid layouts
- All parameters editable with immediate visual feedback
- Formula text displayed in monospace font with amber-accented code blocks
- Number formatting via toLocaleString('zh-CN') throughout
