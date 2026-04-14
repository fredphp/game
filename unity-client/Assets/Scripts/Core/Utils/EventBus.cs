// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：全局事件总线（Event Bus），基于委托的事件发布/订阅系统。
//       使用 ConcurrentDictionary 保证线程安全，支持泛型数据传递。
//       采用静态类设计，无需 MonoBehaviour 实例。
// =============================================================================

using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

namespace Jiuzhou.Core
{
    /// <summary>
    /// 全局事件总线 —— 观察者模式的实现。
    /// <para>注册事件：EventBus.Register("事件名", 回调方法)</para>
    /// <para>触发事件：EventBus.Trigger("事件名", 参数)</para>
    /// <para>注销事件：EventBus.Unregister("事件名", 回调方法)</para>
    /// </summary>
    public static class EventBus
    {
        // =====================================================================
        // 私有字段
        // =====================================================================

        /// <summary>
        /// 无参数事件字典 —— 事件名 -> 回调委托列表。
        /// 使用 ConcurrentDictionary 确保多线程安全。
        /// </summary>
        private static readonly ConcurrentDictionary<string, List<Delegate>> _eventHandlers =
            new ConcurrentDictionary<string, List<Delegate>>();

        /// <summary>
        /// 带参数事件字典 —— 事件名 -> 泛型回调委托列表。
        /// Key 的格式为 "{事件名}_{类型全名}" 以区分相同事件名不同参数类型的情况。
        /// </summary>
        private static readonly ConcurrentDictionary<string, List<Delegate>> _genericEventHandlers =
            new ConcurrentDictionary<string, List<Delegate>>();

        /// <summary>
        /// 锁对象，用于保护回调列表的遍历和修改操作。
        /// </summary>
        private static readonly object _lock = new object();

        // =====================================================================
        // 注册事件 —— 无参数版本
        // =====================================================================

        /// <summary>
        /// 注册无参数事件回调。
        /// </summary>
        /// <param name="eventName">事件名称（建议使用 Constants.GameEvents 中的常量）</param>
        /// <param name="handler">回调委托</param>
        public static void Register(string eventName, Action handler)
        {
            if (string.IsNullOrEmpty(eventName))
            {
                UnityEngine.Debug.LogError("[EventBus] 注册失败：事件名不能为空。");
                return;
            }

            if (handler == null)
            {
                UnityEngine.Debug.LogError($"[EventBus] 注册失败：事件 '{eventName}' 的回调不能为 null。");
                return;
            }

            lock (_lock)
            {
                if (!_eventHandlers.ContainsKey(eventName))
                {
                    _eventHandlers[eventName] = new List<Delegate>();
                }

                // 防止重复注册同一个回调
                if (!_eventHandlers[eventName].Contains(handler))
                {
                    _eventHandlers[eventName].Add(handler);
                }
            }
        }

        // =====================================================================
        // 注册事件 —— 带一个泛型参数版本
        // =====================================================================

        /// <summary>
        /// 注册带泛型参数的事件回调。
        /// </summary>
        /// <typeparam name="T">事件数据类型</typeparam>
        /// <param name="eventName">事件名称</param>
        /// <param name="handler">回调委托</param>
        public static void Register<T>(string eventName, Action<T> handler)
        {
            if (string.IsNullOrEmpty(eventName))
            {
                UnityEngine.Debug.LogError("[EventBus] 注册失败：事件名不能为空。");
                return;
            }

            if (handler == null)
            {
                UnityEngine.Debug.LogError($"[EventBus] 注册失败：事件 '{eventName}' 的回调不能为 null。");
                return;
            }

            string compositeKey = GetGenericKey<T>(eventName);

            lock (_lock)
            {
                if (!_genericEventHandlers.ContainsKey(compositeKey))
                {
                    _genericEventHandlers[compositeKey] = new List<Delegate>();
                }

                // 防止重复注册
                if (!_genericEventHandlers[compositeKey].Contains(handler))
                {
                    _genericEventHandlers[compositeKey].Add(handler);
                }
            }
        }

        // =====================================================================
        // 注销事件 —— 无参数版本
        // =====================================================================

        /// <summary>
        /// 注销无参数事件回调。
        /// </summary>
        /// <param name="eventName">事件名称</param>
        /// <param name="handler">要移除的回调委托</param>
        public static void Unregister(string eventName, Action handler)
        {
            if (string.IsNullOrEmpty(eventName) || handler == null) return;

            lock (_lock)
            {
                if (_eventHandlers.TryGetValue(eventName, out var handlers))
                {
                    handlers.Remove(handler);
                    // 如果该事件已无任何回调，移除整个条目以释放内存
                    if (handlers.Count == 0)
                    {
                        _eventHandlers.TryRemove(eventName, out _);
                    }
                }
            }
        }

        // =====================================================================
        // 注销事件 —— 带泛型参数版本
        // =====================================================================

        /// <summary>
        /// 注销带泛型参数的事件回调。
        /// </summary>
        /// <typeparam name="T">事件数据类型</typeparam>
        /// <param name="eventName">事件名称</param>
        /// <param name="handler">要移除的回调委托</param>
        public static void Unregister<T>(string eventName, Action<T> handler)
        {
            if (string.IsNullOrEmpty(eventName) || handler == null) return;

            string compositeKey = GetGenericKey<T>(eventName);

            lock (_lock)
            {
                if (_genericEventHandlers.TryGetValue(compositeKey, out var handlers))
                {
                    handlers.Remove(handler);
                    if (handlers.Count == 0)
                    {
                        _genericEventHandlers.TryRemove(compositeKey, out _);
                    }
                }
            }
        }

        // =====================================================================
        // 触发事件 —— 无参数版本
        // =====================================================================

        /// <summary>
        /// 触发无参数事件，依次调用所有已注册的回调。
        /// </summary>
        /// <param name="eventName">事件名称</param>
        public static void Trigger(string eventName)
        {
            if (string.IsNullOrEmpty(eventName)) return;

            List<Delegate> handlersCopy;
            lock (_lock)
            {
                if (!_eventHandlers.TryGetValue(eventName, out var handlers))
                {
                    return;
                }
                // 复制一份回调列表，避免在回调执行过程中修改列表导致异常
                handlersCopy = new List<Delegate>(handlers);
            }

            for (int i = 0; i < handlersCopy.Count; i++)
            {
                try
                {
                    (handlersCopy[i] as Action)?.Invoke();
                }
                catch (Exception ex)
                {
                    UnityEngine.Debug.LogError($"[EventBus] 事件 '{eventName}' 的回调 #{i} 执行异常: {ex.Message}\n{ex.StackTrace}");
                }
            }
        }

        // =====================================================================
        // 触发事件 —— 带泛型参数版本
        // =====================================================================

        /// <summary>
        /// 触发带泛型参数的事件，依次调用所有匹配类型的回调。
        /// </summary>
        /// <typeparam name="T">事件数据类型</typeparam>
        /// <param name="eventName">事件名称</param>
        /// <param name="data">传递给回调的数据</param>
        public static void Trigger<T>(string eventName, T data)
        {
            if (string.IsNullOrEmpty(eventName)) return;

            string compositeKey = GetGenericKey<T>(eventName);

            List<Delegate> handlersCopy;
            lock (_lock)
            {
                if (!_genericEventHandlers.TryGetValue(compositeKey, out var handlers))
                {
                    return;
                }
                handlersCopy = new List<Delegate>(handlers);
            }

            for (int i = 0; i < handlersCopy.Count; i++)
            {
                try
                {
                    (handlersCopy[i] as Action<T>)?.Invoke(data);
                }
                catch (Exception ex)
                {
                    UnityEngine.Debug.LogError($"[EventBus] 事件 '{eventName}' (类型: {typeof(T).Name}) 的回调 #{i} 执行异常: {ex.Message}\n{ex.StackTrace}");
                }
            }
        }

        // =====================================================================
        // 清理方法
        // =====================================================================

        /// <summary>
        /// 清除指定事件的所有回调（无参数和带参数的全部清除）。
        /// </summary>
        /// <param name="eventName">事件名称</param>
        public static void ClearEvent(string eventName)
        {
            if (string.IsNullOrEmpty(eventName)) return;

            lock (_lock)
            {
                _eventHandlers.TryRemove(eventName, out _);

                // 同时移除所有以该事件名为前缀的泛型事件
                var keysToRemove = new List<string>();
                foreach (var kvp in _genericEventHandlers)
                {
                    // compositeKey 格式: "{eventName}_{TypeName}"
                    if (kvp.Key.StartsWith(eventName + "_"))
                    {
                        keysToRemove.Add(kvp.Key);
                    }
                }

                foreach (var key in keysToRemove)
                {
                    _genericEventHandlers.TryRemove(key, out _);
                }
            }
        }

        /// <summary>
        /// 清除所有已注册的事件回调。
        /// 通常在场景切换或游戏退出时调用。
        /// </summary>
        public static void ClearAll()
        {
            lock (_lock)
            {
                _eventHandlers.Clear();
                _genericEventHandlers.Clear();
            }

            UnityEngine.Debug.Log("[EventBus] 已清除所有事件注册。");
        }

        // =====================================================================
        // 辅助方法
        // =====================================================================

        /// <summary>
        /// 生成泛型事件的复合键，格式为 "{eventName}_{TypeName}"。
        /// </summary>
        /// <typeparam name="T">事件数据类型</typeparam>
        /// <param name="eventName">事件名称</param>
        /// <returns>复合键字符串</returns>
        private static string GetGenericKey<T>(string eventName)
        {
            return $"{eventName}_{typeof(T).FullName}";
        }

        /// <summary>
        /// 获取指定事件的已注册回调数量（调试用）。
        /// </summary>
        /// <param name="eventName">事件名称</param>
        /// <returns>已注册的回调数量</returns>
        public static int GetHandlerCount(string eventName)
        {
            lock (_lock)
            {
                int count = 0;
                if (_eventHandlers.TryGetValue(eventName, out var handlers))
                {
                    count += handlers.Count;
                }

                foreach (var kvp in _genericEventHandlers)
                {
                    if (kvp.Key.StartsWith(eventName + "_"))
                    {
                        count += kvp.Value.Count;
                    }
                }

                return count;
            }
        }
    }
}
