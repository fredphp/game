package engine

import (
        "crypto/rand"
        "encoding/json"
        "errors"
        "fmt"
        "math"
        "math/big"
        "sync"

        "card-service/internal/model"
)

var (
        ErrInvalidPoolConfig = errors.New("invalid pool config")
        ErrEmptyPool         = errors.New("card pool is empty")
)

// GachaEngine 抽卡引擎（线程安全，无状态）
type GachaEngine struct{}

func NewGachaEngine() *GachaEngine {
        return &GachaEngine{}
}

// PullResult 单次抽卡结果
type PullResult struct {
        CardID  int64
        Rarity  int
        IsPity  bool   // 是否触发了保底
        PityType string // "ssr" / "sr" / ""
        IsUp    bool   // 是否为UP卡
}

// Pull 执行单次抽卡
// 参数:
//   - config: 卡池配置
//   - ssrPity: 距上次SSR已抽数
//   - srPity:  距上次SR已抽数
func (e *GachaEngine) Pull(config *model.PoolConfig, ssrPity, srPity int) (*PullResult, error) {
        if config == nil {
                return nil, ErrInvalidPoolConfig
        }

        // ──────────────────────────────────────
        // 第1步: 检查硬保底
        // ──────────────────────────────────────
        if ssrPity+1 >= config.PitySSR {
                return e.pullFromPool(config.SSRPool, 5, "ssr", true, config.UpCards)
        }
        if srPity+1 >= config.PitySR {
                result, err := e.pullFromPool(config.SRPool, 4, "sr", true, nil)
                if err != nil {
                        // SR池异常，回退到R池
                        return e.pullFromPool(config.RPool, 3, "r", false, nil)
                }
                return result, nil
        }

        // ──────────────────────────────────────
        // 第2步: 计算实际概率（含软保底）
        // ──────────────────────────────────────
        actualSSRRate := calcSoftPityRate(config.SSRRate, ssrPity, config.PitySSR)
        actualSRRate := config.SRRate

        // ──────────────────────────────────────
        // 第3步: 概率抽取
        // ──────────────────────────────────────
        roll, _ := rand.Int(rand.Reader, big.NewInt(10000))
        rollVal := roll.Int64() // 0 ~ 9999

        ssrThreshold := int64(actualSSRRate * 10000)
        srThreshold := ssrThreshold + int64(actualSRRate*10000)

        switch {
        case rollVal < ssrThreshold:
                // 🌟 SSR!
                return e.pullFromPool(config.SSRPool, 5, "ssr", false, config.UpCards)
        case rollVal < srThreshold:
                // ⭐ SR
                return e.pullFromPool(config.SRPool, 4, "sr", false, nil)
        default:
                // ○ R
                return e.pullFromPool(config.RPool, 3, "r", false, nil)
        }
}

// PullBatch 批量抽卡（十连）
func (e *GachaEngine) PullBatch(config *model.PoolConfig, count int, ssrPity, srPity int) ([]*PullResult, error) {
        results := make([]*PullResult, 0, count)
        curSSRPity := ssrPity
        curSRPity := srPity

        for i := 0; i < count; i++ {
                result, err := e.Pull(config, curSSRPity, curSRPity)
                if err != nil {
                        return nil, fmt.Errorf("pull #%d failed: %w", i+1, err)
                }
                results = append(results, result)

                // 更新保底计数
                switch result.Rarity {
                case 5:
                        curSSRPity = 0
                        curSRPity = 0
                case 4:
                        curSRPity = 0
                        curSSRPity++
                default:
                        curSSRPity++
                        curSRPity++
                }
        }

        return results, nil
}

// pullFromPool 从指定卡池随机抽取一张
func (e *GachaEngine) pullFromPool(pool []int64, rarity int, pityType string, isPity bool, upCards []int64) (*PullResult, error) {
        if len(pool) == 0 {
                return nil, fmt.Errorf("%w: rarity=%d", ErrEmptyPool, rarity)
        }

        // 如果有UP卡且有概率命中UP
        if len(upCards) > 0 && isPity {
                // 保底不强制UP，正常随机（可选策略：保底必出UP）
        }

        // 随机选卡
        idx, _ := rand.Int(rand.Reader, big.NewInt(int64(len(pool))))
        cardID := pool[idx.Int64()]

        // 检查是否为UP卡
        isUp := false
        for _, upID := range upCards {
                if upID == cardID {
                        isUp = true
                        break
                }
        }

        return &PullResult{
                CardID:   cardID,
                Rarity:   rarity,
                IsPity:   isPity,
                PityType: pityType,
                IsUp:     isUp,
        }, nil
}

// ──────────────────────────────────────────
// 软保底概率计算
// ──────────────────────────────────────────
// 规则: 距离硬保底越近，SSR概率越高
// 典型曲线: 60抽后开始提升, 75抽后大幅提升
//
//   pullCount=0:   baseRate  (如 2%)
//   pullCount=60:  baseRate * 1.5
//   pullCount=70:  baseRate * 3
//   pullCount=75:  baseRate * 6
//   pullCount=79:  baseRate * 20
func calcSoftPityRate(baseRate float64, pullCount, pityThreshold int) float64 {
        if pullCount < 60 {
                return baseRate
        }

        // 60~74抽: 线性提升到6倍
        // 75~阈值-1: 指数加速提升到几乎100%
        if pullCount < 75 {
                progress := float64(pullCount-59) / 15.0 // 0.0 ~ 1.0
                multiplier := 1.0 + 5.0*progress           // 1.0 ~ 6.0
                return baseRate * multiplier
        }

        // 75抽以后: 指数增长
        remaining := pityThreshold - pullCount
        if remaining <= 0 {
                remaining = 1
        }
        // 每多一抽翻3倍概率，模拟极高的SSR概率
        boost := math.Pow(3.0, float64(75-pullCount)/5.0)
        if boost < 1 {
                boost = 1
        }
        rate := baseRate * 6.0 * boost
        if rate > 1.0 {
                rate = 1.0
        }
        return rate
}

// ParsePoolConfig 解析卡池JSON配置
func ParsePoolConfig(jsonStr string) (*model.PoolConfig, error) {
        var cfg model.PoolConfig
        if err := json.Unmarshal([]byte(jsonStr), &cfg); err != nil {
                return nil, fmt.Errorf("parse pool config: %w", err)
        }
        if cfg.PitySSR <= 0 || cfg.PitySR <= 0 {
                return nil, ErrInvalidPoolConfig
        }
        if len(cfg.SSRPool)+len(cfg.SRPool)+len(cfg.RPool) == 0 {
                return nil, ErrEmptyPool
        }
        return &cfg, nil
}
