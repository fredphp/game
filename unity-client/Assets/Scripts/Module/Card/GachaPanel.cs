using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;
using Game.Core.Network.Api;
using Game.Data;

namespace Game.Module.Card
{
    /// <summary>
    /// 抽卡面板 —— 卡池轮播、戏剧化动画、保底进度、历史筛选
    /// </summary>
    public class GachaPanel : UIBase
    {
        // ── UI引用：轮播 ──
        [Header("卡池轮播")]
        [SerializeField] private RectTransform poolBannerContainer;
        [SerializeField] private GameObject poolBannerPrefab;
        [SerializeField] private RectTransform dotsContainer;
        [SerializeField] private GameObject dotPrefab;
        [SerializeField] private Text poolNameText;
        [SerializeField] private Text poolTypeBadge;
        [SerializeField] private Button prevPoolButton;
        [SerializeField] private Button nextPoolButton;

        // ── UI引用：抽卡按钮 ──
        [Header("抽卡按钮")]
        [SerializeField] private Button singlePullButton;
        [SerializeField] private Button tenPullButton;
        [SerializeField] private Text singlePullCostText;
        [SerializeField] private Text tenPullCostText;
        [SerializeField] private Text playerDiamondText;

        // ── UI引用：动画与结果 ──
        [Header("动画与结果")]
        [SerializeField] private Image darkOverlay;
        [SerializeField] private RectTransform animationStage;
        [SerializeField] private RectTransform resultCardsContainer;
        [SerializeField] private GameObject resultCardPrefab;
        [SerializeField] private Text resultSummaryText;
        [SerializeField] private Text continueHintText;
        [SerializeField] private Button skipButton;
        [SerializeField] private Button resultConfirmButton;
        [SerializeField] private ParticleSystem rBurstParticle;
        [SerializeField] private ParticleSystem srBurstParticle;
        [SerializeField] private ParticleSystem ssrBurstParticle;

        // ── UI引用：保底进度 ──
        [Header("保底进度")]
        [SerializeField] private Image pityFillBar;
        [SerializeField] private Text pityCountText;
        [SerializeField] private Transform pityMarker50;
        [SerializeField] private Transform pityMarker80;

        // ── UI引用：历史记录 ──
        [Header("抽卡历史")]
        [SerializeField] private Button historyToggle;
        [SerializeField] private GameObject historyPanel;
        [SerializeField] private RectTransform historyContainer;
        [SerializeField] private Button historyCloseButton;
        [SerializeField] private Button filterAllBtn, filterSsrBtn, filterSrBtn, filterRBtn;

        // ── UI引用：导航 ──
        [Header("导航")]
        [SerializeField] private Button backToCollectionButton;
        [SerializeField] private Button backButton;

        // ── 常量 ──
        private const int SINGLE_COST = 150, TEN_COST = 1350, SSR_PITY = 80, SR_PITY = 10;
        private const float BANNER_SPEED = 0.35f, AUTO_SKIP = 3f;

        private static readonly Dictionary<string, (string, Color)> PoolStyles = new Dictionary<string, (string, Color)>
        {
            { "normal", ("常驻", new Color(0.3f,0.7f,0.4f,1f)) },
            { "limited", ("限定", new Color(0.9f,0.3f,0.2f,1f)) },
            { "rateup", ("UP", new Color(0.9f,0.7f,0.1f,1f)) },
            { "faction", ("阵营", new Color(0.2f,0.5f,0.9f,1f)) },
            { "newbie", ("新手", new Color(0.6f,0.4f,0.9f,1f)) }
        };

        private static readonly Dictionary<int, Color> RarityColors = new Dictionary<int, Color>
        {
            { 3, new Color(0.75f,0.75f,0.8f,0.4f) },
            { 4, new Color(1f,0.84f,0f,0.6f) },
            { 5, new Color(1f,0.4f,0.6f,0.8f) }
        };

        // ── 状态 ──
        private List<CardPool> pools = new List<CardPool>();
        private int bannerIdx;
        private CardPool selectedPool;
        private bool isPulling, isShowingResult;
        private Coroutine resultCoro, bannerCoro, autoSkipCoro;
        private GachaResponse lastResponse;
        private List<GachaHistoryRecord> historyCache = new List<GachaHistoryRecord>();
        private string historyFilter = "all";

        // ============================================================
        // 生命周期
        // ============================================================
        protected override void Awake()
        {
            base.Awake();
            singlePullButton?.onClick.AddListener(OnSinglePull);
            tenPullButton?.onClick.AddListener(OnTenPull);
            skipButton?.onClick.AddListener(OnSkip);
            resultConfirmButton?.onClick.AddListener(CloseResult);
            historyToggle?.onClick.AddListener(ToggleHistory);
            historyCloseButton?.onClick.AddListener(() => historyPanel?.SetActive(false));
            filterAllBtn?.onClick.AddListener(() => SetFilter("all"));
            filterSsrBtn?.onClick.AddListener(() => SetFilter("ssr"));
            filterSrBtn?.onClick.AddListener(() => SetFilter("sr"));
            filterRBtn?.onClick.AddListener(() => SetFilter("r"));
            prevPoolButton?.onClick.AddListener(() => ScrollBanner(-1));
            nextPoolButton?.onClick.AddListener(() => ScrollBanner(1));
            backToCollectionButton?.onClick.AddListener(() => { UIManager.Instance.ClosePanel(PanelName); UIManager.Instance.OpenPanel("CardCollectionPanel"); });
            backButton?.onClick.AddListener(() => UIManager.Instance.ClosePanel(PanelName));

            if (darkOverlay != null) { darkOverlay.gameObject.SetActive(false); darkOverlay.color = Color.clear; }
            if (historyPanel != null) historyPanel.SetActive(false);
            if (continueHintText != null) continueHintText.gameObject.SetActive(false);
            UpdateCostDisplay();
        }

        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);
            LoadPools(); UpdateDiamond(); LoadStats();
        }

        public override void OnClose()
        {
            StopCoros(); isPulling = false; isShowingResult = false;
            CloseResult(); historyPanel?.SetActive(false); base.OnClose();
        }

        public override void OnRefresh() { LoadPools(); UpdateDiamond(); LoadStats(); }

        protected override void OnDestroy()
        {
            foreach (var b in new Button[] { singlePullButton, tenPullButton, skipButton, resultConfirmButton,
                historyToggle, historyCloseButton, filterAllBtn, filterSsrBtn, filterSrBtn, filterRBtn,
                prevPoolButton, nextPoolButton, backToCollectionButton, backButton })
                b?.onClick.RemoveAllListeners();
            base.OnDestroy();
        }

        // ============================================================
        // 卡池轮播
        // ============================================================
        private void LoadPools()
        {
            StartCoroutine(CardApi.ListPools(r =>
            {
                if (r?.IsSuccess() == true && r.data != null)
                {
                    pools = new List<CardPool>(r.data.pools ?? Array.Empty<CardPool>());
                    BuildCarousel();
                    if (pools.Count > 0) SelectPool(pools[0]);
                }
            }));
        }

        private void BuildCarousel()
        {
            Clear(poolBannerContainer); Clear(dotsContainer);
            if (poolBannerPrefab == null || dotPrefab == null) return;

            for (int i = 0; i < pools.Count; i++)
            {
                var p = pools[i]; var obj = Instantiate(poolBannerPrefab, poolBannerContainer); obj.SetActive(true);
                var style = GetStyle(p.Type);
                SetText(obj, "PoolName", p.DisplayName ?? p.Name);
                SetText(obj, "TypeBadge", style.Item1)?.color = style.Item2;
                var btn = obj.GetComponent<Button>();
                if (btn != null) { int c = i; btn.onClick.RemoveAllListeners(); btn.onClick.AddListener(() => GoToBanner(c)); }
                Instantiate(dotPrefab, dotsContainer).SetActive(true);
            }
            bannerIdx = 0; RefreshBannerPos(false); UpdateDots();
        }

        private void ScrollBanner(int dir)
        {
            if (pools.Count == 0) return;
            int next = bannerIdx + dir;
            if (next < 0) next = pools.Count - 1; else if (next >= pools.Count) next = 0;
            GoToBanner(next);
        }

        private void GoToBanner(int idx)
        {
            bannerIdx = Mathf.Clamp(idx, 0, pools.Count - 1);
            SelectPool(pools[bannerIdx]); RefreshBannerPos(true); UpdateDots();
        }

        private void RefreshBannerPos(bool anim)
        {
            if (poolBannerContainer == null) return;
            if (bannerCoro != null) StopCoroutine(bannerCoro);
            float tx = -bannerIdx * 720f;
            if (!anim) { poolBannerContainer.anchoredPosition = new Vector2(tx, poolBannerContainer.anchoredPosition.y); return; }
            bannerCoro = StartCoroutine(AnimX(poolBannerContainer, tx, BANNER_SPEED));
        }

        private void UpdateDots()
        {
            if (dotsContainer == null) return;
            for (int i = 0; i < dotsContainer.childCount; i++)
            {
                var img = dotsContainer.GetChild(i).GetComponent<Image>();
                if (img != null) img.color = i == bannerIdx ? Color.white : new Color(1, 1, 1, 0.4f);
            }
        }

        private void SelectPool(CardPool pool)
        {
            selectedPool = pool;
            var s = GetStyle(pool.Type);
            if (poolNameText != null) poolNameText.text = pool.DisplayName ?? pool.Name;
            if (poolTypeBadge != null) { poolTypeBadge.text = s.Item1; poolTypeBadge.color = s.Item2; }
            UpdateCostDisplay();
        }

        // ============================================================
        // 抽卡逻辑
        // ============================================================
        private void OnSinglePull() { if (selectedPool != null) Pull(1); }
        private void OnTenPull() { if (selectedPool != null) Pull(10); }

        private void Pull(int count)
        {
            if (isPulling) return; isPulling = true; SetBtns(false);
            StartCoroutine(CardApi.Gacha(selectedPool.Id, count, r =>
            {
                isPulling = false; SetBtns(true);
                if (r?.IsSuccess() == true && r.data != null)
                {
                    lastResponse = r.data; UpdateDiamond(); LoadStats();
                    EventBus.Trigger(Constants.GameEvents.CARD_ACQUIRED, count);
                    ShowResult(r.data);
                }
            }));
        }

        // ============================================================
        // 抽卡动画系统
        // ============================================================
        private void ShowResult(GachaResponse resp)
        {
            if (resp == null) return;
            isShowingResult = true; Clear(resultCardsContainer);
            if (darkOverlay != null) { darkOverlay.gameObject.SetActive(true); darkOverlay.color = Color.clear; }
            if (animationStage != null) animationStage.gameObject.SetActive(true);
            skipButton?.gameObject.SetActive(true);
            resultConfirmButton?.gameObject.SetActive(false);
            continueHintText?.gameObject.SetActive(false);

            resultCoro = StartCoroutine(resp.results?.Length > 1
                ? PlayTenAnim(resp) : PlaySingleAnim(resp));
        }

        private IEnumerator PlaySingleAnim(GachaResponse resp)
        {
            var card = resp.results[0];
            yield return FadeOverlay(0f, 0.75f, 0.3f);
            var ct = CreateCard(card, 0);
            if (ct != null) yield return StartCoroutine(FlipAnim(ct, 0.8f));
            if (card.rarity >= 5) yield return StartCoroutine(SSRBurst());
            else if (card.rarity >= 4) yield return StartCoroutine(SRBurst());
            else yield return StartCoroutine(RBurst());
            if (ct != null) yield return BounceScale(ct, 0.4f);
            yield return FadeOverlay(0.75f, 0f, 0.3f);
            ShowSummary(resp); continueHintText?.gameObject.SetActive(true);
            autoSkipCoro = StartCoroutine(WaitAndFinish());
        }

        private IEnumerator PlayTenAnim(GachaResponse resp)
        {
            yield return FadeOverlay(0f, 0.75f, 0.3f);
            int max = 3; foreach (var c in resp.results) if (c.rarity > max) max = c.rarity;
            if (max >= 5) yield return StartCoroutine(SSRBurst());
            else if (max >= 4) yield return StartCoroutine(SRBurst());

            for (int i = 0; i < resp.results.Length; i++)
            {
                var c = resp.results[i]; var ct = CreateCard(c, i);
                if (c.rarity >= 5)
                {
                    if (ct != null) { ct.localScale = Vector3.zero; yield return new WaitForSeconds(0.2f); yield return BounceScale(ct, 0.5f); GoldGlow(ct); }
                }
                else if (ct != null) yield return StartCoroutine(AppearAnim(ct, c.rarity));
            }
            yield return new WaitForSeconds(0.3f);
            yield return FadeOverlay(0.75f, 0f, 0.3f);
            ShowSummary(resp); continueHintText?.gameObject.SetActive(true);
            autoSkipCoro = StartCoroutine(WaitAndFinish());
        }

        private IEnumerator FadeOverlay(float from, float to, float dur)
        {
            if (darkOverlay == null) yield break;
            float e = 0f; var c = darkOverlay.color;
            while (e < dur) { e += Time.deltaTime; float t = e / dur; c.a = Mathf.Lerp(from, to, t); darkOverlay.color = c; yield return null; }
            c.a = to; darkOverlay.color = c;
        }

        private IEnumerator FlipAnim(RectTransform card, float dur)
        {
            float e = 0f;
            while (e < dur)
            {
                e += Time.deltaTime; float t = Mathf.Clamp01(e / dur);
                float angle = t < 0.5f ? Mathf.Lerp(0, 90, t / 0.5f) : Mathf.Lerp(90, 0, (t - 0.5f) / 0.5f);
                float s = Mathf.Lerp(1f, 0.3f, Mathf.Sin(t * Mathf.PI));
                card.localEulerAngles = new Vector3(angle, 0, 0); card.localScale = new Vector3(s, s, 1);
                yield return null;
            }
            card.localEulerAngles = Vector3.zero; card.localScale = Vector3.one;
        }

        private IEnumerator RBurst()
        {
            yield return StartCoroutine(FlashColor(new Color(0.8f, 0.85f, 0.95f, 0.4f), 0.8f));
            rBurstParticle?.Play(); yield return new WaitForSeconds(0.5f);
        }

        private IEnumerator SRBurst()
        {
            yield return StartCoroutine(FlashColor(new Color(1f, 0.84f, 0.1f, 0.5f), 1f));
            srBurstParticle?.Play(); yield return new WaitForSeconds(0.8f);
        }

        private IEnumerator SSRBurst()
        {
            Time.timeScale = 0.3f;
            if (animationStage != null) StartCoroutine(Shake(animationStage, 0.5f, 8f));
            yield return StartCoroutine(RainbowFlash(1.5f));
            ssrBurstParticle?.Play();
            yield return new WaitForSecondsRealtime(1.2f);
            Time.timeScale = 1f;
        }

        private IEnumerator FlashColor(Color fc, float dur)
        {
            if (darkOverlay == null) yield break;
            float e = 0f;
            while (e < dur) { e += Time.deltaTime; float t = e / dur; float i = t < 0.3f ? t / 0.3f : 1 - (t - 0.3f) / 0.7f;
                darkOverlay.color = new Color(fc.r, fc.g, fc.b, fc.a * i); yield return null; }
        }

        private IEnumerator RainbowFlash(float dur)
        {
            if (darkOverlay == null) yield break;
            float e = 0f;
            while (e < dur) { e += Time.deltaTime; float t = e / dur;
                float intensity = t < 0.2f ? t / 0.2f : (t < 0.6f ? 1f : 1 - (t - 0.6f) / 0.4f);
                var c = Color.HSVToRGB(t % 1f, 0.8f, 1f);
                darkOverlay.color = new Color(c.r, c.g, c.b, 0.5f * intensity); yield return null; }
        }

        private IEnumerator Shake(RectTransform t, float dur, float mag)
        {
            Vector3 o = t.localPosition; float e = 0f;
            while (e < dur) { e += Time.deltaTime; float d = 1 - e / dur;
                t.localPosition = o + new Vector3(UnityEngine.Random.Range(-1,1)*mag*d, UnityEngine.Random.Range(-1,1)*mag*d, 0);
                yield return null; }
            t.localPosition = o;
        }

        private IEnumerator BounceScale(RectTransform t, float dur)
        {
            float e = 0f;
            while (e < dur) { e += Time.deltaTime; float t2 = Mathf.Clamp01(e / dur);
                float s = t2 < 0.6f ? Mathf.Lerp(0.8f, 1.3f, t2/0.6f) : Mathf.Lerp(1.3f, 1f, (t2-0.6f)/0.4f);
                t.localScale = new Vector3(s, s, 1); yield return null; }
            t.localScale = Vector3.one;
        }

        private IEnumerator AppearAnim(RectTransform card, int rarity)
        {
            float dur = rarity >= 5 ? 0.5f : rarity >= 4 ? 0.4f : 0.25f;
            float over = rarity >= 5 ? 1.3f : rarity >= 4 ? 1.2f : 1.1f;
            float e = 0f;
            while (e < dur) { e += Time.deltaTime; float t = Mathf.Clamp01(e / dur);
                float s = t < 0.6f ? (t/0.6f)*over : over-(over-1f)*Mathf.Sin((t-0.6f)/0.4f*(Mathf.PI/2f));
                card.localScale = new Vector3(s, s, 1); yield return null; }
            card.localScale = Vector3.one;
        }

        // ============================================================
        // 结果卡牌
        // ============================================================
        private RectTransform CreateCard(GachaResult card, int idx)
        {
            if (resultCardsContainer == null || resultCardPrefab == null) return null;
            var obj = Instantiate(resultCardPrefab, resultCardsContainer); obj.SetActive(true);
            var r = obj.GetComponent<RectTransform>();
            SetText(obj, "CardName", card.name);
            var rt = obj.transform.Find("CardRarity")?.GetComponent<Text>();
            if (rt != null) rt.text = card.rarity switch { 3=>"R", 4=>"SR", 5=>"SSR", _=>"N" };
            var nt = obj.transform.Find("NewTag")?.GetComponent<Text>();
            if (nt != null) nt.gameObject.SetActive(card.is_new);
            var cf = obj.transform.Find("CardFrame")?.GetComponent<Image>();
            if (cf != null && RarityColors.TryGetValue(card.rarity, out var col)) cf.color = col;

            int total = lastResponse?.results?.Length ?? 1;
            if (total > 1) { int row = idx/5, col2 = idx%5; r.anchoredPosition = new Vector2(col2*130f-260f, -(row*180f)+90f); }
            else r.anchoredPosition = Vector2.zero;
            return r;
        }

        private void GoldGlow(RectTransform ct)
        {
            var g = ct.Find("GlowEffect")?.GetComponent<Image>();
            if (g != null) { g.gameObject.SetActive(true); g.color = new Color(1f, 0.84f, 0f, 0.7f); }
        }

        private void ShowSummary(GachaResponse resp)
        {
            if (resultSummaryText == null || resp.results == null) return;
            int ssr=0,sr=0,r=0; foreach (var c in resp.results) { if(c.rarity>=5)ssr++; else if(c.rarity>=4)sr++; else r++; }
            var p = new List<string>();
            if(ssr>0) p.Add($"SSR×{ssr}"); if(sr>0) p.Add($"SR×{sr}"); if(r>0) p.Add($"R×{r}");
            resultSummaryText.text = $"本次获得: {string.Join(" ", p)}";
        }

        private IEnumerator WaitAndFinish() { yield return new WaitForSeconds(AUTO_SKIP); FinishResult(); }

        private void OnSkip()
        {
            StopCoros(); Time.timeScale = 1f;
            if (lastResponse?.results != null) { Clear(resultCardsContainer);
                for (int i = 0; i < lastResponse.results.Length; i++) {
                    var ct = CreateCard(lastResponse.results[i], i);
                    if (ct != null) { ct.localScale = Vector3.one; if(lastResponse.results[i].rarity>=5) GoldGlow(ct); }
                } ShowSummary(lastResponse);
            }
            if (darkOverlay != null) darkOverlay.color = Color.clear;
            FinishResult();
        }

        private void FinishResult()
        {
            isShowingResult = false;
            skipButton?.gameObject.SetActive(false); resultConfirmButton?.gameObject.SetActive(true);
            continueHintText?.gameObject.SetActive(true);
        }

        private void CloseResult()
        {
            darkOverlay?.gameObject.SetActive(false);
            if (darkOverlay != null) darkOverlay.color = Color.clear;
            animationStage?.gameObject.SetActive(false);
            continueHintText?.gameObject.SetActive(false);
            Clear(resultCardsContainer); lastResponse = null;
        }

        // ============================================================
        // 保底进度
        // ============================================================
        private void LoadStats()
        {
            StartCoroutine(CardApi.GachaStats(r =>
            {
                if (r?.IsSuccess() == true && r.data != null)
                {
                    var s = r.data;
                    if (pityCountText != null) pityCountText.text = $"距离保底: {s.ssr_pity_counter}/{SSR_PITY}";
                    if (pityFillBar != null) {
                        float f = Mathf.Clamp01((float)s.ssr_pity_counter / SSR_PITY); pityFillBar.fillAmount = f;
                        pityFillBar.color = f >= 0.75f ? new Color(0.9f,0.2f,0.2f,1f) : f >= 0.6f ? new Color(0.9f,0.6f,0.1f,1f) : new Color(0.3f,0.8f,0.4f,1f);
                    }
                    pityMarker50?.gameObject.SetActive(s.ssr_pity_counter < 50);
                    pityMarker80?.gameObject.SetActive(s.ssr_pity_counter < SSR_PITY);
                }
            }));
        }

        // ============================================================
        // 抽卡历史
        // ============================================================
        private void ToggleHistory()
        {
            if (historyPanel == null) return;
            if (historyPanel.activeSelf) { historyPanel.SetActive(false); return; }
            historyPanel.SetActive(true);
            StartCoroutine(CardApi.GachaHistory(1, r =>
            {
                if (r?.IsSuccess() == true && r.data?.records != null)
                { historyCache = new List<GachaHistoryRecord>(r.data.records); DisplayHistory(); }
            }));
        }

        private void SetFilter(string f) { historyFilter = f; DisplayHistory(); }

        private void DisplayHistory()
        {
            if (historyContainer == null) return; Clear(historyContainer);
            int cnt = 0;
            foreach (var rec in historyCache)
            {
                if (cnt >= 50) break;
                if (!MatchF(rec, historyFilter)) continue;
                var obj = new GameObject("R", typeof(RectTransform));
                obj.transform.SetParent(historyContainer, false);
                obj.GetComponent<RectTransform>().sizeDelta = new Vector2(400f, 30f);
                var txt = obj.AddComponent<Text>();
                txt.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                txt.fontSize = 14; txt.alignment = TextAnchor.MiddleLeft;
                string rn = rec.rarity switch { 5=>"SSR", 4=>"SR", 3=>"R", _=>"N" };
                string nt = rec.is_new ? " [新]" : "";
                txt.text = $"#{rec.pull_index} {rn} 卡牌ID:{rec.card_id}{nt} {rec.created_at}";
                if (RarityColors.TryGetValue(rec.rarity, out var c)) txt.color = new Color(c.r,c.g,c.b,1f);
                cnt++;
            }
            SetFilterBtn(filterAllBtn, historyFilter=="all"); SetFilterBtn(filterSsrBtn, historyFilter=="ssr");
            SetFilterBtn(filterSrBtn, historyFilter=="sr"); SetFilterBtn(filterRBtn, historyFilter=="r");
        }

        private static bool MatchF(GachaHistoryRecord r, string f) => f switch { "ssr"=>r.rarity>=5, "sr"=>r.rarity==4, "r"=>r.rarity<=3, _=>true };

        private static void SetFilterBtn(Button b, bool a) { if(b!=null){var c=b.colors; c.normalColor=a?Color.yellow:Color.white; b.colors=c;} }

        // ============================================================
        // 辅助方法
        // ============================================================
        private void UpdateCostDisplay()
        {
            if (singlePullCostText != null) singlePullCostText.text = $"单抽 ×1 ({SINGLE_COST}💎)";
            if (tenPullCostText != null) tenPullCostText.text = $"十连 ×10 ({TEN_COST}💎)";
        }
        private void UpdateDiamond() { if (playerDiamondText != null) playerDiamondText.text = "💎 ---"; }
        private void SetBtns(bool on) { if(singlePullButton!=null)singlePullButton.interactable=on; if(tenPullButton!=null)tenPullButton.interactable=on; }

        private static Text SetText(GameObject obj, string path, string txt) { var t = obj.transform.Find(path)?.GetComponent<Text>(); if(t!=null)t.text=txt; return t; }
        private static (string,Color) GetStyle(string type) => PoolStyles.ContainsKey(type)?PoolStyles[type]:("普通",Color.gray);
        private static void Clear(RectTransform c) { if(c==null)return; for(int i=c.childCount-1;i>=0;i--) Destroy(c.GetChild(i).gameObject); }

        private IEnumerator AnimX(RectTransform t, float tx, float dur)
        {
            float e=0f, sx=t.anchoredPosition.x;
            while(e<dur){e+=Time.deltaTime;float p=Mathf.Clamp01(e/dur);float s=1-Mathf.Pow(1-p,3);
                t.anchoredPosition=new Vector2(Mathf.Lerp(sx,tx,s),t.anchoredPosition.y);yield return null;}
            t.anchoredPosition=new Vector2(tx,t.anchoredPosition.y);
        }

        private void StopCoros()
        {
            if(resultCoro!=null){StopCoroutine(resultCoro);resultCoro=null;}
            if(bannerCoro!=null){StopCoroutine(bannerCoro);bannerCoro=null;}
            if(autoSkipCoro!=null){StopCoroutine(autoSkipCoro);autoSkipCoro=null;}
            Time.timeScale = 1f;
        }
    }
}
