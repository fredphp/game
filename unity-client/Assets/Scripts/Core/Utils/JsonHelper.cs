// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：JSON 序列化/反序列化工具类。
//       基于 UnityEngine.JsonUtility 的封装，额外支持集合类型（List、Array）
//       的序列化和反序列化，解决 JsonUtility 不支持直接处理集合的限制。
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace Jiuzhou.Core
{
    /// <summary>
    /// JSON 序列化/反序列化工具类。
    /// <para>ToJson: 将对象序列化为 JSON 字符串</para>
    /// <para>FromJson: 将 JSON 字符串反序列化为对象</para>
    /// <para>ToJsonArray: 将 List 序列化为 JSON 数组</para>
    /// <para>FromJsonArray: 将 JSON 数组反序列化为 List</para>
    /// </summary>
    public static class JsonHelper
    {
        // =====================================================================
        // 内部包装类 —— 用于解决 JsonUtility 不支持顶层集合的问题
        // =====================================================================

        /// <summary>
        /// 内部包装类，将 List 包装在一个对象中以便 JsonUtility 序列化。
        /// JSON 输出格式: {"items":[...]}
        /// </summary>
        [Serializable]
        private class JsonArrayWrapper<T>
        {
            /// <summary>被包装的数组元素列表</summary>
            public T[] items;
        }

        // =====================================================================
        // 基础序列化 / 反序列化
        // =====================================================================

        /// <summary>
        /// 将对象序列化为格式化的 JSON 字符串。
        /// </summary>
        /// <typeparam name="T">要序列化的对象类型</typeparam>
        /// <param name="obj">要序列化的对象</param>
        /// <param name="prettyPrint">是否格式化输出（带缩进）</param>
        /// <returns>JSON 字符串</returns>
        public static string ToJson<T>(T obj, bool prettyPrint = false)
        {
            if (obj == null)
            {
                Debug.LogWarning("[JsonHelper] ToJson: 尝试序列化 null 对象，返回空字符串。");
                return "{}";
            }

            try
            {
                return JsonUtility.ToJson(obj, prettyPrint);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[JsonHelper] ToJson 异常: {ex.Message}\n{ex.StackTrace}");
                return "{}";
            }
        }

        /// <summary>
        /// 将 JSON 字符串反序列化为对象。
        /// </summary>
        /// <typeparam name="T">目标对象类型</typeparam>
        /// <param name="json">JSON 字符串</param>
        /// <returns>反序列化后的对象，失败时返回 default(T)</returns>
        public static T FromJson<T>(string json)
        {
            if (string.IsNullOrEmpty(json))
            {
                Debug.LogWarning("[JsonHelper] FromJson: JSON 字符串为空或 null。");
                return default(T);
            }

            try
            {
                return JsonUtility.FromJson<T>(json);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[JsonHelper] FromJson<{typeof(T).Name}> 异常: {ex.Message}\nJSON内容: {json}");
                return default(T);
            }
        }

        // =====================================================================
        // 集合序列化 / 反序列化（List / Array）
        // =====================================================================

        /// <summary>
        /// 将 List 序列化为 JSON 数组字符串。
        /// 内部使用包装类实现：输出格式为 {"items":[item1, item2, ...]}。
        /// </summary>
        /// <typeparam name="T">列表元素类型</typeparam>
        /// <param name="list">要序列化的列表</param>
        /// <param name="prettyPrint">是否格式化输出</param>
        /// <returns>JSON 字符串</returns>
        public static string ToJsonArray<T>(List<T> list, bool prettyPrint = false)
        {
            if (list == null)
            {
                Debug.LogWarning("[JsonHelper] ToJsonArray: 列表为 null，返回空数组。");
                return "{\"items\":[]}";
            }

            try
            {
                var wrapper = new JsonArrayWrapper<T>
                {
                    items = list.ToArray()
                };
                return JsonUtility.ToJson(wrapper, prettyPrint);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[JsonHelper] ToJsonArray 异常: {ex.Message}\n{ex.StackTrace}");
                return "{\"items\":[]}";
            }
        }

        /// <summary>
        /// 将 JSON 数组字符串反序列化为 List。
        /// 需要输入格式为 {"items":[...]} 的包装格式（由 ToJsonArray 生成）。
        /// </summary>
        /// <typeparam name="T">列表元素类型</typeparam>
        /// <param name="json">JSON 字符串（包装格式）</param>
        /// <returns>反序列化后的列表，失败时返回空列表</returns>
        public static List<T> FromJsonArray<T>(string json)
        {
            if (string.IsNullOrEmpty(json))
            {
                Debug.LogWarning("[JsonHelper] FromJsonArray: JSON 字符串为空。");
                return new List<T>();
            }

            try
            {
                var wrapper = JsonUtility.FromJson<JsonArrayWrapper<T>>(json);
                if (wrapper?.items != null)
                {
                    return wrapper.items.ToList();
                }
                return new List<T>();
            }
            catch (Exception ex)
            {
                Debug.LogError($"[JsonHelper] FromJsonArray<{typeof(T).Name}> 异常: {ex.Message}\nJSON内容: {json}");
                return new List<T>();
            }
        }

        /// <summary>
        /// 将 JSON 数组字符串（原生数组格式 [...], item1, item2, ...]）反序列化为 List。
        /// 通过在外部包装一层实现 JsonUtility 对数组的支持。
        /// </summary>
        /// <typeparam name="T">数组元素类型</typeparam>
        /// <param name="jsonArray">原生 JSON 数组字符串，如 "[{...},{...}]"</param>
        /// <returns>反序列化后的列表</returns>
        public static List<T> FromJsonRawArray<T>(string jsonArray)
        {
            if (string.IsNullOrEmpty(jsonArray))
            {
                return new List<T>();
            }

            // 如果已经是包装格式，直接使用 FromJsonArray
            if (jsonArray.TrimStart().StartsWith("{\""))
            {
                return FromJsonArray<T>(jsonArray);
            }

            // 原生数组格式，包装后反序列化
            string wrapped = "{\"items\":" + jsonArray + "}";
            return FromJsonArray<T>(wrapped);
        }

        // =====================================================================
        // 便捷方法
        // =====================================================================

        /// <summary>
        /// 将对象序列化为字节数组（UTF-8编码）。
        /// 用于 HTTP 请求的 body 数据。
        /// </summary>
        /// <typeparam name="T">对象类型</typeparam>
        /// <param name="obj">要序列化的对象</param>
        /// <returns>UTF-8 编码的字节数组</returns>
        public static byte[] ToJsonBytes<T>(T obj)
        {
            string json = ToJson(obj);
            return System.Text.Encoding.UTF8.GetBytes(json);
        }

        /// <summary>
        /// 获取 JSON 中指定字段（key）对应的子对象，并反序列化为指定类型。
        /// 用于从嵌套 JSON 中提取部分数据。
        /// </summary>
        /// <typeparam name="T">目标类型</typeparam>
        /// <param name="json">完整 JSON 字符串</param>
        /// <param name="fieldName">要提取的字段名</param>
        /// <returns>反序列化后的对象</returns>
        public static T ExtractField<T>(string json, string fieldName)
        {
            if (string.IsNullOrEmpty(json) || string.IsNullOrEmpty(fieldName))
            {
                return default(T);
            }

            try
            {
                // 简单的 JSON 字段提取：查找 "fieldName": 后的内容
                string searchKey = $"\"{fieldName}\":";
                int keyIndex = json.IndexOf(searchKey, StringComparison.Ordinal);
                if (keyIndex < 0)
                {
                    Debug.LogWarning($"[JsonHelper] ExtractField: 在 JSON 中未找到字段 '{fieldName}'。");
                    return default(T);
                }

                int valueStart = keyIndex + searchKey.Length;
                string remaining = json.Substring(valueStart).TrimStart();

                // 判断值的起始类型
                if (remaining.StartsWith("{") || remaining.StartsWith("["))
                {
                    // 对象或数组类型 —— 需要找到匹配的结束括号
                    char openChar = remaining[0];
                    char closeChar = (openChar == '{') ? '}' : ']';
                    int depth = 0;
                    int endIndex = 0;

                    for (int i = 0; i < remaining.Length; i++)
                    {
                        if (remaining[i] == openChar) depth++;
                        else if (remaining[i] == closeChar) depth--;

                        if (depth == 0)
                        {
                            endIndex = i + 1;
                            break;
                        }
                    }

                    if (endIndex > 0)
                    {
                        string extracted = remaining.Substring(0, endIndex);
                        return FromJson<T>(extracted);
                    }
                }
                else
                {
                    // 简单值类型（字符串、数字、布尔值）—— 找到逗号或结尾
                    int endIndex = remaining.IndexOf(',');
                    if (endIndex < 0) endIndex = remaining.Length;

                    string valueStr = remaining.Substring(0, endIndex).Trim();
                    // 对于简单值，用包装类方式反序列化
                    string wrapped = $"{{\"value\":{valueStr}}}";
                    var wrapper = FromJson<ValueWrapper<T>>(wrapped);
                    return wrapper.value;
                }
            }
            catch (Exception ex)
            {
                Debug.LogError($"[JsonHelper] ExtractField<{typeof(T).Name}> 异常: {ex.Message}");
            }

            return default(T);
        }

        /// <summary>
        /// 通用值包装类，用于 ExtractField 中提取简单值。
        /// </summary>
        [Serializable]
        private class ValueWrapper<T>
        {
            public T value;
        }

        /// <summary>
        /// 安全地克隆一个对象（通过 JSON 序列化/反序列化实现深拷贝）。
        /// 注意：要求对象的类型标记为 [Serializable]。
        /// </summary>
        /// <typeparam name="T">要克隆的对象类型</typeparam>
        /// <param name="source">源对象</param>
        /// <returns>深拷贝后的新对象</returns>
        public static T DeepCopy<T>(T source)
        {
            if (source == null) return default(T);

            try
            {
                string json = JsonUtility.ToJson(source);
                return JsonUtility.FromJson<T>(json);
            }
            catch (Exception ex)
            {
                Debug.LogError($"[JsonHelper] DeepCopy<{typeof(T).Name}> 异常: {ex.Message}");
                return default(T);
            }
        }

        /// <summary>
        /// 尝试将 JSON 字符串反序列化为对象。
        /// 不会抛出异常，失败时返回 false。
        /// </summary>
        /// <typeparam name="T">目标类型</typeparam>
        /// <param name="json">JSON 字符串</param>
        /// <param name="result">反序列化结果</param>
        /// <returns>是否反序列化成功</returns>
        public static bool TryFromJson<T>(string json, out T result)
        {
            result = default(T);

            if (string.IsNullOrEmpty(json))
            {
                return false;
            }

            try
            {
                result = JsonUtility.FromJson<T>(json);
                return result != null;
            }
            catch
            {
                return false;
            }
        }
    }
}
