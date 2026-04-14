// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：UI 层级枚举定义，用于 Canvas 的 sortingOrder 分层管理。
//       层级从低到高：Background(0) < Scene(100) < Main(200) < Popup(300) < Top(400) < Guide(500)
// =============================================================================

namespace Jiuzhou.Core
{
    /// <summary>
    /// UI 层级枚举。
    /// <para>每个层级对应一个独立的 Canvas，通过 sortingOrder 控制显示层级。</para>
    /// <para>SortingOrder 值越大，显示越靠前（在最上层）。</para>
    /// </summary>
    public enum UILayer
    {
        /// <summary>
        /// 背景层 —— 最底层。
        /// 用于场景背景、天气特效、装饰元素等。
        /// SortingOrder: 0
        /// </summary>
        Background = 0,

        /// <summary>
        /// 场景层 —— 游戏场景中的 3D/2D 元素。
        /// 用于地图、角色、特效等游戏场景内容。
        /// SortingOrder: 100
        /// </summary>
        Scene = 100,

        /// <summary>
        /// 主界面层 —— 游戏常驻 UI 面板。
        /// 用于主城界面、背包、任务、卡组等非模态面板。
        /// SortingOrder: 200
        /// </summary>
        Main = 200,

        /// <summary>
        /// 弹窗层 —— 模态对话框和弹窗。
        /// 用于确认对话框、设置面板、卡牌详情等模态面板。
        /// 同一时间只允许一个弹窗打开。
        /// SortingOrder: 300
        /// </summary>
        Popup = 300,

        /// <summary>
        /// 顶层 —— 系统级 UI 元素，始终在最上方。
        /// 用于 Toast 提示、网络状态指示器、错误弹窗等。
        /// SortingOrder: 400
        /// </summary>
        Top = 400,

        /// <summary>
        /// 引导层 —— 新手引导相关元素。
        /// 用于新手引导的高亮遮罩、引导箭头、提示文本等。
        /// SortingOrder: 500
        /// </summary>
        Guide = 500
    }

    /// <summary>
    /// UILayer 枚举的扩展方法。
    /// </summary>
    public static class UILayerExtensions
    {
        /// <summary>
        /// 获取层级的 sortingOrder 数值。
        /// </summary>
        /// <param name="layer">UI 层级</param>
        /// <returns>对应的 sortingOrder 值</returns>
        public static int GetSortingOrder(this UILayer layer)
        {
            return (int)layer;
        }

        /// <summary>
        /// 获取层级的名称字符串。
        /// </summary>
        /// <param name="layer">UI 层级</param>
        /// <returns>层级名称</returns>
        public static string GetName(this UILayer layer)
        {
            switch (layer)
            {
                case UILayer.Background: return Constants.LAYER_BACKGROUND;
                case UILayer.Scene: return Constants.LAYER_SCENE;
                case UILayer.Main: return Constants.LAYER_MAIN;
                case UILayer.Popup: return Constants.LAYER_POPUP;
                case UILayer.Top: return Constants.LAYER_TOP;
                case UILayer.Guide: return Constants.LAYER_GUIDE;
                default: return "Unknown";
            }
        }
    }
}
