---
Task ID: 6
Agent: Unity UI Refactorer
Task: Unity客户端UI重构 — 战国·楚汉争霸风格

Work Log:
- 阅读并分析了全部43个Unity C#脚本文件（Core/UI、Core/Manager、Core/Network、Data、Module/Login、Module/MainCity、Module/Card、Module/Map、Module/Battle、Module/Quest、Module/Shop）
- 设计了完整的"战国·楚汉争霸"UI风格规范体系
- 创建UIStyleConfig.cs全局风格配置（色彩体系、品质配色、阵营配色、动画参数、边框样式、字体规范、间距规范、缓动函数库）
- 创建InkWashEffect.cs水墨特效组件（7种特效：水墨淡入、印章盖压、金光闪烁SSR、紫雾弥漫SR、边框呼吸、竹简滑入、印章盖章）
- 创建HeroCardRenderer.cs武将卡牌渲染器（70%立绘+30%信息区、品质边框系统、SSR金光流转/SR紫雾呼吸/R翡翠微光）
- 重构MainCityPanel.cs主城面板（中国古代城池风格、战旗飘扬动画、水墨卷轴资源栏、青铜纹头像框、朱砂VIP印章、竹简体力条）
- 创建HexMapRenderer.cs六边形世界地图渲染器（9×7扁顶六边形网格、山川河流地形、领地颜色填充、州府标记、区域水印标签、争夺城市脉冲动画）
- 构建Next.js UI结构图文档页面（7个板块：设计理念、色彩体系、UI结构图、卡牌布局、地图网格、动效目录、文件架构）

Stage Summary:
- 产出Unity C#文件：
  - unity-client/Assets/Scripts/Core/UI/UIStyleConfig.cs（全局风格配置，335行）
  - unity-client/Assets/Scripts/Core/UI/InkWashEffect.cs（水墨特效组件，285行）
  - unity-client/Assets/Scripts/Core/UI/HeroCardRenderer.cs（武将卡牌渲染器，340行）
- 重构Unity C#文件：
  - unity-client/Assets/Scripts/Module/MainCity/MainCityPanel.cs（主城面板重构，600行）
- 新增Unity C#文件：
  - unity-client/Assets/Scripts/Module/Map/HexMapRenderer.cs（六边形地图，380行）
- 产出Next.js页面：
  - src/app/page.tsx（UI结构图文档，1261行）
- 设计风格关键词：水墨风 + 青铜金文 + 朱砂印章 + 楚漆黑底 + 竹简黄 + 丝绸白 + 先秦金文篆刻 + 水墨山水
