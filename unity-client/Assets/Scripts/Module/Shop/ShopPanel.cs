using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;

namespace Game.Module.Shop
{
    /// <summary>
    /// 商城面板 —— 充值、月卡、礼包、战令、基金
    /// </summary>
    public class ShopPanel : UIBase
    {
        // ── 顶栏 ──
        [Header("顶栏")]
        [SerializeField] private Text diamondCountText;
        [SerializeField] private Button backButton;

        // ── Tab栏 ──
        [Header("Tab栏")]
        [SerializeField] private RectTransform tabContainer;
        [SerializeField] private GameObject tabPrefab;
        [SerializeField] private Color tabActive, tabInactive;

        // ── 横幅 ──
        [Header("横幅轮播")]
        [SerializeField] private RectTransform bannerContainer;
        [SerializeField] private GameObject bannerItemPrefab;
        [SerializeField] private RectTransform bannerDots;
        [SerializeField] private GameObject bannerDotPrefab;

        // ── 内容区 ──
        [Header("内容区")]
        [SerializeField] private GameObject rechargeContent, monthlyCardContent, giftPackContent, battlePassContent, fundContent;

        // ── 热门商品 ──
        [Header("热门商品")]
        [SerializeField] private RectTransform hotGrid;
        [SerializeField] private GameObject shopItemPrefab;

        // ── 限时特惠 ──
        [Header("限时特惠")]
        [SerializeField] private GameObject limitedSection;
        [SerializeField] private RectTransform limitedGrid;
        [SerializeField] private GameObject limitedItemPrefab;

        // ── 购买确认 ──
        [Header("购买确认")]
        [SerializeField] private GameObject confirmDialog;
        [SerializeField] private Text confirmName, confirmCost, confirmDesc;
        [SerializeField] private Button confirmBuyBtn, confirmCancelBtn;

        // ── 购买动画 ──
        [Header("购买动画")]
        [SerializeField] private Image successFlash;
        [SerializeField] private ParticleSystem purchaseParticle;

        // ── 底栏 ──
        [Header("底栏")]
        [SerializeField] private Button helpBtn, redeemBtn;

        // ── Tab定义 ──
        private static readonly string[] Tabs = { "充值", "月卡", "礼包", "战令", "基金" };
        private GameObject[] TabContents => new[] { rechargeContent, monthlyCardContent, giftPackContent, battlePassContent, fundContent };

        // ── 商品数据 ──
        private static readonly HotItemData[] Hots = new HotItemData[]
        {
            new(201,"6元首充",600,"HOT",new Color(0.9f,0.2f,0.2f,1f)),
            new(202,"30元月卡",3000,"推荐",new Color(0.2f,0.7f,0.3f,1f)),
            new(203,"68元成长基金",6800,"限时",new Color(0.9f,0.6f,0.1f,1f)),
            new(204,"128元至尊礼包",12800,"SSR自选",new Color(1f,0.84f,0f,1f)),
            new(205,"648元创世礼包",64800,"",Color.clear)
        };

        private static readonly LimitedData[] Limiteds = new LimitedData[]
        {
            new(301,"新手超值礼包",60,"30钻石+经验药水×5",7200),
            new(302,"七日登录礼",0,"每日登录领钻石",604800),
            new(303,"阵营礼包·魏",6800,"随机魏国SR卡×1",86400),
            new(304,"超值资源包",3000,"金币×50000+体力×50",43200)
        };

        private static readonly string[] BannerTexts = { "新版本庆典·累充送SSR", "月卡限时特惠·双倍返还", "新手七日礼包·限时开放" };

        // ── 状态 ──
        private int currentTab, bannerIdx;
        private float bannerTimer;
        private Coroutine bannerCoro, countdownCoro, confirmCoro;
        private int pendingProductId;

        // ============================================================
        // 生命周期
        // ============================================================
        protected override void Awake()
        {
            base.Awake();
            backButton?.onClick.AddListener(() => UIManager.Instance.ClosePanel(PanelName));
            confirmBuyBtn?.onClick.AddListener(OnBuy);
            confirmCancelBtn?.onClick.AddListener(CloseConfirm);
            helpBtn?.onClick.AddListener(() => { Debug.Log("[Shop] 充值帮助"); EventBus.Trigger("shop:help","充值问题"); });
            redeemBtn?.onClick.AddListener(() => { Debug.Log("[Shop] 兑换码"); EventBus.Trigger("shop:redeem",""); });
            confirmDialog?.SetActive(false);
            successFlash?.gameObject.SetActive(false);
            BuildTabs(); BuildBanners();
        }

        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);
            UpdateDiamond(); BuildHotItems(); BuildLimited();
            SwitchTab("充值"); bannerTimer = 0f;
        }

        public override void OnClose()
        {
            bannerTimer = -1f;
            if (countdownCoro != null) { StopCoroutine(countdownCoro); countdownCoro = null; }
            if (confirmCoro != null) { StopCoroutine(confirmCoro); confirmCoro = null; }
            CloseConfirm(); base.OnClose();
        }

        protected override void OnDestroy()
        {
            foreach (var b in new Button[]{backButton,confirmBuyBtn,confirmCancelBtn,helpBtn,redeemBtn}) b?.onClick.RemoveAllListeners();
            base.OnDestroy();
        }

        // ============================================================
        // Tab 切换
        // ============================================================
        private void BuildTabs()
        {
            if (tabContainer == null || tabPrefab == null) return;
            Clear(tabContainer);
            for (int i = 0; i < Tabs.Length; i++)
            {
                var obj = Instantiate(tabPrefab, tabContainer); obj.SetActive(true);
                var t = obj.GetComponentInChildren<Text>(); if (t != null) t.text = Tabs[i];
                var b = obj.GetComponent<Button>(); if (b != null) { int c = i; b.onClick.RemoveAllListeners(); b.onClick.AddListener(() => SwitchTab(Tabs[c])); }
            }
        }

        private void SwitchTab(string name)
        {
            int idx = Array.IndexOf(Tabs, name); if (idx < 0) idx = 0; currentTab = idx;
            for (int i = 0; i < tabContainer.childCount; i++)
            {
                var b = tabContainer.GetChild(i).GetComponent<Button>(); if (b == null) continue;
                var c = b.colors; c.normalColor = i == idx ? tabActive : tabInactive; b.colors = c;
            }
            var contents = TabContents;
            for (int i = 0; i < contents.Length; i++) if (contents[i] != null) contents[i].SetActive(i == idx);
            if (limitedSection != null) limitedSection.SetActive(name == "礼包");
        }

        // ============================================================
        // 横幅轮播
        // ============================================================
        private void BuildBanners()
        {
            if (bannerContainer == null || bannerItemPrefab == null) return;
            Clear(bannerContainer); Clear(bannerDots);
            foreach (var txt in BannerTexts)
            {
                var obj = Instantiate(bannerItemPrefab, bannerContainer); obj.SetActive(true);
                var t = obj.GetComponentInChildren<Text>(); if (t != null) t.text = txt;
                if (bannerDotPrefab != null && bannerDots != null) Instantiate(bannerDotPrefab, bannerDots).SetActive(true);
            }
            bannerIdx = 0;
        }

        private void TickBanner()
        {
            if (bannerTimer < 0 || bannerContainer == null) return;
            bannerTimer += Time.deltaTime;
            if (bannerTimer < 5f) return;
            bannerTimer = 0f;
            int total = bannerContainer.childCount; if (total == 0) return;
            bannerIdx = (bannerIdx + 1) % total;
            if (bannerCoro != null) StopCoroutine(bannerCoro);
            bannerCoro = StartCoroutine(AnimX(bannerContainer, -bannerIdx * 720f, 0.35f));
            for (int i = 0; i < bannerDots.childCount; i++)
            {
                var img = bannerDots.GetChild(i).GetComponent<Image>();
                if (img != null) img.color = i == bannerIdx ? Color.white : new Color(1, 1, 1, 0.4f);
            }
        }

        // ============================================================
        // 热门商品
        // ============================================================
        private void BuildHotItems()
        {
            if (hotGrid == null || shopItemPrefab == null) return; Clear(hotGrid);
            for (int i = 0; i < Hots.Length; i++)
            {
                var item = Hots[i]; var obj = Instantiate(shopItemPrefab, hotGrid); obj.SetActive(true);
                SetText(obj,"ItemName",item.Name); SetText(obj,"ItemPrice",$"¥{item.Price/100f:F0}");
                var badge = obj.transform.Find("Badge")?.GetComponent<Text>();
                if (badge != null) { badge.text = item.Badge; badge.gameObject.SetActive(!string.IsNullOrEmpty(item.Badge)); badge.color = item.BadgeColor; }
                var btn = obj.transform.Find("BuyButton")?.GetComponent<Button>();
                if (btn != null) { int id=item.Id;string n=item.Name;int p=item.Price; btn.onClick.RemoveAllListeners();
                    btn.onClick.AddListener(()=>ShowConfirm(id,n,p)); }
                int row=i/2, col=i%2; obj.GetComponent<RectTransform>().anchoredPosition = new Vector2(col*320f-160f, -row*140f);
            }
        }

        // ============================================================
        // 限时特惠
        // ============================================================
        private void BuildLimited()
        {
            if (limitedGrid == null || limitedItemPrefab == null) return; Clear(limitedGrid);
            for (int i = 0; i < Limiteds.Length; i++)
            {
                var of = Limiteds[i]; var obj = Instantiate(limitedItemPrefab, limitedGrid); obj.SetActive(true);
                SetText(obj,"OfferName",of.Name);
                SetText(obj,"OfferPrice",of.Price>0?$"¥{of.Price/100f:F0}":"免费");
                SetText(obj,"OfferDesc",of.Desc);
                var btn = obj.transform.Find("BuyButton")?.GetComponent<Button>();
                if (btn != null) { int id=of.Id;string n=of.Name;int p=of.Price; btn.onClick.RemoveAllListeners();
                    btn.onClick.AddListener(()=>ShowConfirm(id,n,p)); }
                int row=i/2, col=i%2; obj.GetComponent<RectTransform>().anchoredPosition = new Vector2(col*320f-160f, -row*120f);
            }
            if (countdownCoro != null) StopCoroutine(countdownCoro);
            countdownCoro = StartCoroutine(TickCountdowns());
        }

        private IEnumerator TickCountdowns()
        {
            while (true)
            {
                for (int i = 0; i < limitedGrid.childCount && i < Limiteds.Length; i++)
                {
                    var ct = limitedGrid.GetChild(i).Find("Countdown")?.GetComponent<Text>();
                    if (ct != null && Limiteds[i].Duration > 0)
                    {
                        string key = $"shop_rem_{Limiteds[i].Id}";
                        if (!PlayerPrefs.HasKey(key)) PlayerPrefs.SetFloat(key, Limiteds[i].Duration);
                        float rem = PlayerPrefs.GetFloat(key) - 1f;
                        if (rem < 0) rem = 3600f;
                        PlayerPrefs.SetFloat(key, rem);
                        ct.text = rem / 86400 >= 1 ? $"{(int)rem/86400}天{((int)rem%86400)/3600:00}:{((int)rem%3600)/60:00}:{(int)rem%60:00}"
                            : $"{((int)rem)/3600:00}:{((int)rem%3600)/60:00}:{(int)rem%60:00}";
                    }
                }
                yield return new WaitForSeconds(1f);
            }
        }

        // ============================================================
        // 购买流程
        // ============================================================
        private void ShowConfirm(int id, string name, int price)
        {
            pendingProductId = id;
            if (confirmName != null) confirmName.text = name;
            if (confirmCost != null) confirmCost.text = price > 0 ? $"¥{price/100f:F0}" : "免费";
            if (confirmDesc != null) confirmDesc.text = $"确认购买 {name}？";
            confirmDialog?.SetActive(true);
        }

        private void OnBuy()
        {
            confirmDialog?.SetActive(false);
            Debug.Log($"[ShopPanel] 购买确认: {confirmName?.text} (ID:{pendingProductId})");
            EventBus.Trigger("shop:purchase", pendingProductId);
            if (confirmCoro != null) StopCoroutine(confirmCoro);
            confirmCoro = StartCoroutine(PurchaseSuccessAnim());
        }

        private void CloseConfirm() { confirmDialog?.SetActive(false); }

        private IEnumerator PurchaseSuccessAnim()
        {
            // 闪光
            if (successFlash != null)
            {
                successFlash.gameObject.SetActive(true); float e = 0f;
                while (e < 0.6f) { e += Time.deltaTime; float t = e/0.6f;
                    successFlash.color = new Color(1f,0.95f,0.8f,(t<0.3f?t/0.3f:1-(t-0.3f)/0.7f)*0.4f); yield return null; }
                successFlash.gameObject.SetActive(false);
            }
            purchaseParticle?.Play();
            yield return new WaitForSeconds(0.8f);
            UpdateDiamond();
            // 钻石数字弹跳
            if (diamondCountText != null)
            {
                var r = diamondCountText.GetComponent<RectTransform>();
                if (r != null) { float e=0f; while(e<0.3f){e+=Time.deltaTime;float t=Mathf.Clamp01(e/0.3f);
                    float s=t<0.5f?Mathf.Lerp(1f,1.4f,t/0.5f):Mathf.Lerp(1.4f,1f,(t-0.5f)/0.5f);
                    r.localScale=new Vector3(s,s,1);yield return null;} r.localScale=Vector3.one; }
            }
        }

        // ============================================================
        // 辅助方法
        // ============================================================
        private void UpdateDiamond() { if (diamondCountText != null) diamondCountText.text = "💎 ---"; }
        private static Text SetText(GameObject obj, string path, string txt) { var t=obj.transform.Find(path)?.GetComponent<Text>(); if(t!=null)t.text=txt; return t; }
        private static void Clear(RectTransform c) { if(c==null)return; for(int i=c.childCount-1;i>=0;i--) Destroy(c.GetChild(i).gameObject); }

        private IEnumerator AnimX(RectTransform t, float tx, float dur)
        {
            float e=0f, sx=t.anchoredPosition.x;
            while(e<dur){e+=Time.deltaTime;float p=Mathf.Clamp01(e/dur);float s=1-Mathf.Pow(1-p,3);
                t.anchoredPosition=new Vector2(Mathf.Lerp(sx,tx,s),t.anchoredPosition.y);yield return null;}
            t.anchoredPosition=new Vector2(tx,t.anchoredPosition.y);
        }
    }

    // ── 商城数据结构 ──

    /// <summary>热门商品</summary>
    public readonly struct HotItemData
    {
        public readonly int Id, Price; public readonly string Name, Badge; public readonly Color BadgeColor;
        public HotItemData(int id, string name, int price, string badge, Color color)
        { Id=id; Name=name; Price=price; Badge=badge; BadgeColor=color; }
    }

    /// <summary>限时特惠</summary>
    public readonly struct LimitedData
    {
        public readonly int Id, Price, Duration; public readonly string Name, Desc;
        public LimitedData(int id, string name, int price, string desc, int dur)
        { Id=id; Name=name; Price=price; Desc=desc; Duration=dur; }
    }
}
