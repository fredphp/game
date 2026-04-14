---
Task ID: 1
Agent: Main Developer
Task: Unity客户端UI优化 - Web版游戏客户端UI系统

Work Log:
- 分析了现有Unity客户端代码（MainCityPanel.cs, GachaPanel.cs, TutorialManager.cs, ShopPanel.cs）
- 创建了游戏数据Store（Zustand）包含玩家数据、建筑、卡池、武将、商店、新手引导等完整状态管理
- 构建了主城UI：顶部资源栏（金币/钻石/体力/战力）、滚动公告、城池场景Banner、建筑队列、6个可交互建筑、快捷操作栏
- 实现了抽卡动画系统：卡池轮播Banner、单抽/十连按钮、SSR保底进度条（80抽）、翻牌动画（旋转/缩放/粒子）、结果展示（SSR金色光效、SR紫色、R蓝色）、抽卡历史筛选
- 构建了新手引导系统：6步骤引导流程、SVG遮罩高亮目标区域、NPC对话气泡（诸葛亮）、进度条、必做/可跳过步骤、奖励展示
- 实现了商业化入口：5个Tab（充值/月卡/礼包/战令/基金）、横幅轮播、10个商品、限时倒计时、购买确认弹窗、购买闪光动画
- 额外创建了武将图鉴面板（搜索/筛选/网格/列表视图）和战斗面板（6个关卡/战斗动画/HP条）
- 创建了4个API路由：/api/game/profile、/api/game/gacha、/api/game/tutorial、/api/game/shop
- 生成了3张AI图片资源：城池Banner、武将头像、抽卡卡背
- ESLint检查全部通过（0错误0警告）

Stage Summary:
- 产出文件：
  - src/stores/game-store.ts（游戏状态管理）
  - src/app/page.tsx（主页面Shell + 底部导航 + 更多面板）
  - src/components/game/MainCity.tsx（主城面板）
  - src/components/game/GachaPanel.tsx（抽卡面板）
  - src/components/game/TutorialOverlay.tsx（新手引导遮罩）
  - src/components/game/ShopPanel.tsx（商城面板）
  - src/components/game/HeroesPanel.tsx（武将图鉴）
  - src/components/game/BattlePanel.tsx（战斗面板）
  - src/app/api/game/profile/route.ts
  - src/app/api/game/gacha/route.ts
  - src/app/api/game/tutorial/route.ts
  - src/app/api/game/shop/route.ts
  - public/game-city-banner.png, public/game-hero-portrait.png, public/game-card-back.png
- 技术栈：Next.js 16 + TypeScript + Tailwind CSS 4 + Framer Motion + Zustand + shadcn/ui
- 设计风格：暗色中国古风游戏UI，以红金色为主色调
