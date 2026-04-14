// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：泛型单例模式基类，所有 MonoBehaviour 单例管理器的父类。
//       采用线程安全的懒加载初始化，子类通过 Instance 属性访问唯一实例。
// =============================================================================

using UnityEngine;

namespace Jiuzhou.Core
{
    /// <summary>
    /// 泛型单例基类，用于需要持久化且全局唯一的 MonoBehaviour 管理器。
    /// <para>使用方式：public class MyManager : Singleton&lt;MyManager&gt; { }</para>
    /// <para>访问方式：MyManager.Instance.DoSomething();</para>
    /// </summary>
    /// <typeparam name="T">单例类的类型</typeparam>
    public abstract class Singleton<T> : MonoBehaviour where T : MonoBehaviour
    {
        private static readonly object _lock = new object();
        private static T _instance;

        /// <summary>
        /// 获取单例实例。如果实例不存在则自动创建并附加到场景中。
        /// 线程安全，使用双重检查锁定（Double-Check Locking）模式。
        /// </summary>
        public static T Instance
        {
            get
            {
                // 第一次检查（无锁），快速路径
                if (_instance == null)
                {
                    lock (_lock)
                    {
                        // 第二次检查（有锁），确保只有一个实例被创建
                        if (_instance == null)
                        {
                            // 在场景中查找是否已存在该类型的实例
                            _instance = FindObjectOfType<T>();

                            // 如果场景中没有，则创建一个新的 GameObject 并附加组件
                            if (_instance == null)
                            {
                                GameObject singletonObj = new GameObject(typeof(T).Name);
                                _instance = singletonObj.AddComponent<T>();
                                Debug.Log($"[Singleton] 创建单例实例: {typeof(T).Name}");
                            }
                            else
                            {
                                Debug.Log($"[Singleton] 发现已存在的单例实例: {typeof(T).Name}");
                            }
                        }
                    }
                }

                return _instance;
            }
        }

        /// <summary>
        /// 获取单例实例是否存在（不触发自动创建）。
        /// </summary>
        public static bool HasInstance => _instance != null;

        /// <summary>
        /// 虚方法，子类可重写以在初始化时执行额外逻辑。
        /// 在 Awake 中调用，此时保证 _instance 已赋值。
        /// </summary>
        protected virtual void OnInitialize()
        {
            // 子类重写此方法进行初始化
        }

        /// <summary>
        /// 虚方法，子类可重写以在单例被销毁时执行清理逻辑。
        /// </summary>
        protected virtual void OnDestroy()
        {
            // 如果被销毁的是当前实例，则清空引用
            if (_instance == this)
            {
                _instance = null;
                Debug.Log($"[Singleton] 销毁单例实例: {typeof(T).Name}");
            }
        }

        /// <summary>
        /// 当另一个场景加载时，如果设置了 DontDestroyOnLoad，
        /// 此方法会检测重复实例并自动销毁自身。
        /// </summary>
        protected virtual void Awake()
        {
            // 如果实例已存在且不是自身，说明是重复创建的，需要销毁
            if (_instance != null && _instance != this)
            {
                Debug.LogWarning($"[Singleton] 检测到重复实例 {typeof(T).Name}，自动销毁。");
                Destroy(gameObject);
                return;
            }

            // 设置实例引用
            if (_instance == null)
            {
                _instance = this as T;
            }

            // 执行子类初始化
            OnInitialize();
        }

        /// <summary>
        /// 使单例在场景切换时不被销毁。
        /// 通常在子类的 OnInitialize() 中调用。
        /// </summary>
        protected void DontDestroyOnLoad()
        {
            DontDestroyOnLoad(this.gameObject);
        }

        /// <summary>
        /// 确保单例实例存在，用于在非 Unity 主线程中使用前的预检查。
        /// </summary>
        /// <returns>实例是否存在</returns>
        public static bool EnsureInstance()
        {
            var instance = Instance;
            return instance != null;
        }
    }
}
