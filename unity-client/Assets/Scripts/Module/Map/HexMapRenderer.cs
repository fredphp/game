// =============================================================================
// 九州争鼎 - 战国·楚汉争霸 六边形世界地图渲染器
// =============================================================================
// 描述：六边形网格地图渲染组件 —— 将矩形城市布局转换为六边形蜂巢结构，
//       支持山川河流可视化、领地颜色填充、行军路线动画。
//       地图数据从 WorldMapPanel 获取，此组件仅负责渲染。
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Jiuzhou.Core.UI;

namespace Jiuzhou.Zhengding.Module.Map
{
    /// <summary>
    /// 六边形地图格子数据
    /// </summary>
    [Serializable]
    public struct HexCell
    {
        public int Col, Row;
        public float CenterX, CenterY;
        public int CityId;
        public string CityName;
        public int Level;
        public int OccupationStatus;  // 0=中立, 1=己方, 2=同盟, 3=敌方, 4=争夺中
        public bool IsContested;
        public bool IsMountain;
        public bool IsRiver;
        public bool IsCapital;         // 州府（大格子）

        /// <summary>六边形6个顶点（从顶部顺时针）</summary>
        public Vector2[] GetVertices(float size)
        {
            Vector2[] verts = new Vector2[6];
            float angleOffset = 30f; // 扁顶六边形
            for (int i = 0; i < 6; i++)
            {
                float angle = (angleOffset + 60f * i) * Mathf.Deg2Rad;
                verts[i] = new Vector2(
                    CenterX + size * Mathf.Cos(angle),
                    CenterY + size * Mathf.Sin(angle)
                );
            }
            return verts;
        }

        /// <summary>获取占领颜色</summary>
        public Color GetColor()
        {
            if (IsMountain) return new Color(0.45f, 0.40f, 0.35f, 1f);   // 山地灰褐
            if (IsRiver) return new Color(0.35f, 0.55f, 0.75f, 0.6f);   // 河流水蓝

            return OccupationStatus switch
            {
                0 => new Color(0.75f, 0.72f, 0.65f, 1f),  // 中立（原野黄褐）
                1 => new Color(0.25f, 0.60f, 0.35f, 1f),  // 己方（翠绿）
                2 => new Color(0.30f, 0.50f, 0.80f, 1f),  // 同盟（蔚蓝）
                3 => new Color(0.75f, 0.20f, 0.15f, 1f),  // 敌方（赤红）
                4 => new Color(0.85f, 0.55f, 0.10f, 1f),  // 争夺中（橙金）
                _ => new Color(0.75f, 0.72f, 0.65f, 1f)
            };
        }

        /// <summary>获取边框颜色</summary>
        public Color GetBorderColor()
        {
            return IsMountain ? new Color(0.35f, 0.30f, 0.25f, 1f)
                 : IsRiver ? new Color(0.25f, 0.45f, 0.65f, 0.8f)
                 : IsCapital ? UIStyleConfig.BronzeGold
                 : new Color(0.40f, 0.38f, 0.35f, 0.6f);
        }
    }

    /// <summary>
    /// 六边形世界地图渲染器 —— 挂载到地图面板上。
    /// <para>功能：六边形网格生成、山川河流装饰、领地颜色填充、行军路线动画</para>
    /// </summary>
    public class HexMapRenderer : MonoBehaviour
    {
        // ── 配置 ──

        [Header("六边形网格配置")]
        [SerializeField] private float hexSize = 80f;             // 六边形半径
        [SerializeField] private float hexGap = 6f;               // 格子间距
        [SerializeField] private int gridCols = 9;                // 列数
        [SerializeField] private int gridRows = 7;                // 行数
        [SerializeField] private float capitalScale = 1.3f;       // 州府缩放

        [Header("渲染目标")]
        [SerializeField] private RectTransform mapContent;        // 地图内容容器
        [SerializeField] private GameObject hexCellPrefab;        // 六边形格子预制体
        [SerializeField] private Image connectionLinePrefab;      // 连接线预制体
        [SerializeField] private GameObject marchArrowPrefab;     // 行军箭头预制体

        [Header("地形装饰")]
        [SerializeField] private Sprite mountainSprite;           // 山地图标
        [SerializeField] private Sprite riverSprite;              // 河流图标
        [SerializeField] private Sprite capitalSprite;            // 州府图标

        [Header("区域标签")]
        [SerializeField] private GameObject regionLabelPrefab;    // 区域名称标签预制体

        [Header("动效")]
        [SerializeField] private float contestedPulseSpeed = 2f; // 争夺城市闪烁速度

        // ── 运行时数据 ──

        private HexCell[,] _grid;
        private Dictionary<int, GameObject> _cellObjects = new Dictionary<int, GameObject>();
        private List<GameObject> _connectionObjects = new List<GameObject>();
        private List<GameObject> _marchArrowObjects = new List<GameObject>();
        private Coroutine _contestedAnimCoroutine;
        private CanvasGroup _mapCanvasGroup;

        /// <summary>六边形网格宽度（扁顶）</summary>
        private float HexWidth => hexSize * 2f;
        /// <summary>六边形网格高度（扁顶）</summary>
        private float HexHeight => Mathf.Sqrt(3f) * hexSize;
        /// <summary>水平间距（扁顶六边形）</summary>
        private float HorizSpacing => HexWidth * 0.75f + hexGap;
        /// <summary>垂直间距</summary>
        private float VertSpacing => HexHeight + hexGap;

        // ============================================================
        // 生命周期
        // ============================================================

        private void Awake()
        {
            _mapCanvasGroup = mapContent?.GetComponent<CanvasGroup>();
            if (_mapCanvasGroup == null && mapContent != null)
                _mapCanvasGroup = mapContent.gameObject.AddComponent<CanvasGroup>();
        }

        private void OnDestroy()
        {
            StopContestedAnimation();
        }

        // ============================================================
        // 公开方法 —— 地图生成
        // ============================================================

        /// <summary>
        /// 从 WorldMapData 生成六边形地图
        /// </summary>
        public void GenerateMap(WorldMapData mapData)
        {
            if (mapData == null || mapContent == null) return;

            Cleanup();
            _grid = new HexCell[gridCols, gridRows];

            // 创建网格
            for (int row = 0; row < gridRows; row++)
            {
                for (int col = 0; col < gridCols; col++)
                {
                    Vector2 center = HexToPixel(col, row);
                    _grid[col, row] = new HexCell
                    {
                        Col = col,
                        Row = row,
                        CenterX = center.x,
                        CenterY = center.y,
                        CityId = -1,
                        IsMountain = false,
                        IsRiver = false,
                        IsCapital = false,
                        OccupationStatus = 0
                    };
                }
            }

            // 填充城市数据
            if (mapData.Cities != null)
            {
                foreach (var city in mapData.Cities)
                {
                    int col = Mathf.RoundToInt(city.PositionX * (gridCols - 1));
                    int row = Mathf.RoundToInt(city.PositionY * (gridRows - 1));
                    col = Mathf.Clamp(col, 0, gridCols - 1);
                    row = Mathf.Clamp(row, 0, gridRows - 1);

                    _grid[col, row] = new HexCell
                    {
                        Col = col,
                        Row = row,
                        CenterX = HexToPixel(col, row).x,
                        CenterY = HexToPixel(col, row).y,
                        CityId = city.CityId,
                        CityName = city.CityName,
                        Level = city.Level,
                        OccupationStatus = city.OccupationStatus,
                        IsContested = city.IsContested,
                        IsCapital = city.Level >= 5  // Lv.5+为州府
                    };
                }
            }

            // 添加地形装饰（山川河流）
            AddTerrainFeatures();

            // 渲染六边形格子
            RenderHexCells();

            // 渲染连接线
            if (mapData.Connections != null)
                RenderConnections(mapData.Connections, mapData.Cities);

            // 渲染区域标签
            if (mapData.Regions != null)
                RenderRegionLabels(mapData.Regions);

            // 调整内容大小
            float totalWidth = gridCols * HorizSpacing + hexSize * 2f;
            float totalHeight = gridRows * VertSpacing + HexHeight;
            mapContent.sizeDelta = new Vector2(totalWidth, totalHeight);

            // 启动争夺城市动画
            StartContestedAnimation();
        }

        // ============================================================
        // 坐标转换
        // ============================================================

        /// <summary>
        /// 六边形网格坐标 → 像素坐标（扁顶六边形）
        /// </summary>
        private Vector2 HexToPixel(int col, int row)
        {
            float x = col * HorizSpacing;
            float y = row * VertSpacing + (col % 2 == 1 ? VertSpacing * 0.5f : 0f);
            return new Vector2(x, y);
        }

        // ============================================================
        // 地形生成
        // ============================================================

        /// <summary>
        /// 添加山川河流地形特征（九州区划对应）
        /// </summary>
        private void AddTerrainFeatures()
        {
            // 定义山地区域（模拟中国地理）
            int[][] mountainCells = new int[][]
            {
                // 凉州西部山区
                new int[] { 0, 2 }, new int[] { 0, 3 },
                // 益州西部山区
                new int[] { 1, 5 }, new int[] { 1, 6 },
                // 冀州北部
                new int[] { 0, 0 }, new int[] { 1, 0 },
            };

            foreach (var mc in mountainCells)
            {
                int col = mc[0], row = mc[1];
                if (col < gridCols && row < gridRows)
                    _grid[col, row].IsMountain = true;
            }

            // 定义河流（模拟黄河、长江）
            int[][] riverCells = new int[][]
            {
                // 黄河（东西走向）
                new int[] { 2, 1 }, new int[] { 3, 1 }, new int[] { 4, 2 },
                // 长江（东西走向偏南）
                new int[] { 3, 5 }, new int[] { 4, 5 }, new int[] { 5, 4 },
                new int[] { 6, 5 }, new int[] { 7, 5 },
            };

            foreach (var rc in riverCells)
            {
                int col = rc[0], row = rc[1];
                if (col < gridCols && row < gridRows)
                    _grid[col, row].IsRiver = true;
            }
        }

        // ============================================================
        // 六边形格子渲染
        // ============================================================

        private void RenderHexCells()
        {
            if (hexCellPrefab == null) return;

            for (int row = 0; row < gridRows; row++)
            {
                for (int col = 0; col < gridCols; col++)
                {
                    HexCell cell = _grid[col, row];
                    GameObject cellObj = Instantiate(hexCellPrefab, mapContent);
                    _cellObjects[cell.CityId] = cellObj;

                    RectTransform rect = cellObj.GetComponent<RectTransform>();
                    float scale = cell.IsCapital ? capitalScale : 1f;
                    rect.localPosition = new Vector2(cell.CenterX, cell.CenterY);
                    rect.sizeDelta = new Vector2(HexWidth * scale, HexHeight * scale);
                    rect.localScale = Vector3.one;

                    // 设置颜色
                    Image bgImage = cellObj.GetComponent<Image>();
                    if (bgImage != null) bgImage.color = cell.GetColor();

                    // 边框
                    Outline outline = cellObj.GetComponent<Outline>();
                    if (outline != null)
                    {
                        outline.effectColor = cell.GetBorderColor();
                        outline.effectDistance = cell.IsCapital ? new Vector2(3f, 3f) : new Vector2(1f, 1f);
                    }

                    // 城市名称
                    var texts = cellObj.GetComponentsInChildren<TextMeshProUGUI>();
                    if (texts.Length > 0 && cell.CityId > 0)
                        texts[0].text = cell.CityName;
                    if (texts.Length > 1 && cell.CityId > 0)
                        texts[1].text = cell.IsCapital ? $"州府 Lv.{cell.Level}" : $"Lv.{cell.Level}";

                    // 地形装饰图标
                    if (cell.IsMountain && mountainSprite != null)
                    {
                        Image decor = cellObj.transform.Find("TerrainDecor")?.GetComponent<Image>();
                        if (decor != null) { decor.sprite = mountainSprite; decor.gameObject.SetActive(true); }
                    }
                    else if (cell.IsRiver && riverSprite != null)
                    {
                        Image decor = cellObj.transform.Find("TerrainDecor")?.GetComponent<Image>();
                        if (decor != null) { decor.sprite = riverSprite; decor.gameObject.SetActive(true); }
                    }

                    // 注册点击
                    Button btn = cellObj.GetComponent<Button>();
                    if (btn == null) btn = cellObj.AddComponent<Button>();
                    if (cell.CityId > 0)
                    {
                        int capturedId = cell.CityId;
                        btn.onClick.AddListener(() => OnCellClick(capturedId));
                    }
                    else
                    {
                        btn.interactable = false;
                    }
                }
            }
        }

        // ============================================================
        // 连接线渲染
        // ============================================================

        private void RenderConnections(List<MapConnection> connections, List<MapCity> cities)
        {
            if (connectionLinePrefab == null || cities == null) return;

            foreach (var conn in connections)
            {
                var from = cities.Find(c => c.CityId == conn.FromCityId);
                var to = cities.Find(c => c.CityId == conn.ToCityId);
                if (from == null || to == null) continue;

                // 查找对应的格子
                int fromCol = Mathf.RoundToInt(from.PositionX * (gridCols - 1));
                int fromRow = Mathf.RoundToInt(from.PositionY * (gridRows - 1));
                int toCol = Mathf.RoundToInt(to.PositionX * (gridCols - 1));
                int toRow = Mathf.RoundToInt(to.PositionY * (gridRows - 1));

                Vector2 fromPos = HexToPixel(
                    Mathf.Clamp(fromCol, 0, gridCols - 1),
                    Mathf.Clamp(fromRow, 0, gridRows - 1));
                Vector2 toPos = HexToPixel(
                    Mathf.Clamp(toCol, 0, gridCols - 1),
                    Mathf.Clamp(toRow, 0, gridRows - 1));

                // 创建连接线
                GameObject lineObj = Instantiate(connectionLinePrefab, mapContent);
                _connectionObjects.Add(lineObj);

                Image lineImage = lineObj.GetComponent<Image>();
                if (lineImage != null)
                    lineImage.color = new Color(0.50f, 0.45f, 0.35f, 0.4f); // 水墨淡色

                RectTransform lineRect = lineObj.GetComponent<RectTransform>();
                float distance = Vector2.Distance(fromPos, toPos);
                float angle = Mathf.Atan2(toPos.y - fromPos.y, toPos.x - fromPos.x) * Mathf.Rad2Deg;

                lineRect.localPosition = (fromPos + toPos) / 2f;
                lineRect.sizeDelta = new Vector2(distance, 2f);
                lineRect.localEulerAngles = new Vector3(0f, 0f, angle);
            }
        }

        // ============================================================
        // 区域标签渲染
        // ============================================================

        private void RenderRegionLabels(List<MapRegion> regions)
        {
            if (regionLabelPrefab == null || regions == null) return;

            foreach (var region in regions)
            {
                Vector2 labelPos = new Vector2(region.CenterX * (gridCols - 1) * HorizSpacing,
                                              region.CenterY * (gridRows - 1) * VertSpacing);

                GameObject labelObj = Instantiate(regionLabelPrefab, mapContent);
                RectTransform labelRect = labelObj.GetComponent<RectTransform>();
                labelRect.localPosition = labelPos;

                TextMeshProUGUI labelTxt = labelObj.GetComponentInChildren<TextMeshProUGUI>();
                if (labelTxt != null)
                {
                    labelTxt.text = region.RegionName;
                    labelTxt.color = new Color(0.25f, 0.20f, 0.15f, 0.5f); // 淡墨水印色
                    labelTxt.fontSize = 28;
                    labelTxt.fontStyle = FontStyles.Bold;
                }
            }
        }

        // ============================================================
        // 行军路线动画
        // ============================================================

        /// <summary>
        /// 显示行军路线动画
        /// </summary>
        public void ShowMarchRoute(Vector2 from, Vector2 to, float progress)
        {
            // 实现行军箭头动画
            Vector2 currentPos = Vector2.Lerp(from, to, progress);
            // 在实际实现中，这里创建沿路径移动的箭头对象
        }

        // ============================================================
        // 争夺城市闪烁动画
        // ============================================================

        private void StartContestedAnimation()
        {
            StopContestedAnimation();
            _contestedAnimCoroutine = StartCoroutine(ContestedPulseRoutine());
        }

        private void StopContestedAnimation()
        {
            if (_contestedAnimCoroutine != null)
            {
                StopCoroutine(_contestedAnimCoroutine);
                _contestedAnimCoroutine = null;
            }
        }

        private IEnumerator ContestedPulseRoutine()
        {
            float time = 0f;
            while (true)
            {
                time += Time.deltaTime * contestedPulseSpeed;
                float pulse = (Mathf.Sin(time) + 1f) / 2f;

                // 遍历所有格子，更新争夺中城市的闪烁
                for (int col = 0; col < gridCols; col++)
                {
                    for (int row = 0; row < gridRows; row++)
                    {
                        if (!_grid[col, row].IsContested) continue;
                        int cityId = _grid[col, row].CityId;
                        if (cityId < 0 || !_cellObjects.ContainsKey(cityId)) continue;

                        GameObject cellObj = _cellObjects[cityId];
                        if (cellObj == null) continue;

                        Image bgImage = cellObj.GetComponent<Image>();
                        if (bgImage != null)
                        {
                            Color contestedColor = Color.Lerp(
                                new Color(0.85f, 0.55f, 0.10f, 1f),  // 橙金
                                new Color(0.95f, 0.75f, 0.20f, 1f),  // 亮金
                                pulse);
                            bgImage.color = contestedColor;
                        }

                        Outline outline = cellObj.GetComponent<Outline>();
                        if (outline != null)
                        {
                            outline.effectColor = new Color(1f, 0.85f, 0.3f, pulse * 0.8f);
                        }
                    }
                }

                yield return null;
            }
        }

        // ============================================================
        // 事件处理
        // ============================================================

        private void OnCellClick(int cityId)
        {
            Debug.Log($"[HexMapRenderer] 点击六边形格子: 城市ID={cityId}");
            // 通知 WorldMapPanel 打开城市详情
            if (mapContent != null)
                mapContent.GetComponentInParent<WorldMapPanel>()?.OnCityClick(cityId);
        }

        /// <summary>
        /// 聚焦到指定城市
        /// </summary>
        public void FocusOnCity(int cityId)
        {
            // 实现滚动到目标城市的位置
            for (int col = 0; col < gridCols; col++)
            {
                for (int row = 0; row < gridRows; row++)
                {
                    if (_grid[col, row].CityId == cityId)
                    {
                        Vector2 targetPos = new Vector2(_grid[col, row].CenterX, _grid[col, row].CenterY);
                        Debug.Log($"[HexMapRenderer] 聚焦到城市 {cityId}: ({targetPos.x}, {targetPos.y})");
                        return;
                    }
                }
            }
        }

        // ============================================================
        // 清理
        // ============================================================

        private void Cleanup()
        {
            foreach (var kvp in _cellObjects)
                if (kvp.Value != null) Destroy(kvp.Value);
            _cellObjects.Clear();

            foreach (var obj in _connectionObjects)
                if (obj != null) Destroy(obj);
            _connectionObjects.Clear();

            foreach (var obj in _marchArrowObjects)
                if (obj != null) Destroy(obj);
            _marchArrowObjects.Clear();
        }
    }
}
