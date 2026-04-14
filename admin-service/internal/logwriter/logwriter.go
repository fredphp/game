// Package logwriter 提供高性能异步日志写入服务。
// 基于Go channel实现缓冲写入，支持批量提交和优雅关闭。
// 适用于高并发场景下的日志写入（用户行为日志、战斗日志、GM操作日志）。
package logwriter

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"admin-service/internal/dao"
	"admin-service/internal/model"
)

// AsyncLogWriter 异步日志写入器
type AsyncLogWriter struct {
	actionCh chan *model.UserActionLog
	battleCh chan *model.BattleLog
	gmCh     chan *model.GmOperationLog
	loginCh  chan *model.LoginLog

	actionBatch []*model.UserActionLog
	battleBatch []*model.BattleLog
	gmBatch     []*model.GmOperationLog
	loginBatch  []*model.LoginLog

	batchSize     int
	flushInterval time.Duration
	stopCh        chan struct{}
	wg            sync.WaitGroup

	mu sync.Mutex
}

// Writer 全局日志写入器实例
var (
	Writer *AsyncLogWriter
	once   sync.Once
)

// Init 初始化全局日志写入器
func Init(bufferSize, batchSize int) {
	once.Do(func() {
		Writer = NewAsyncLogWriter(bufferSize, batchSize, 2*time.Second)
		go Writer.Start()
		log.Println("[LogWriter] 异步日志写入器已启动")
	})
}

// NewAsyncLogWriter 创建异步日志写入器
func NewAsyncLogWriter(bufferSize, batchSize int, flushInterval time.Duration) *AsyncLogWriter {
	return &AsyncLogWriter{
		actionCh:      make(chan *model.UserActionLog, bufferSize),
		battleCh:      make(chan *model.BattleLog, bufferSize),
		gmCh:          make(chan *model.GmOperationLog, bufferSize),
		loginCh:       make(chan *model.LoginLog, bufferSize),
		actionBatch:   make([]*model.UserActionLog, 0, batchSize),
		battleBatch:   make([]*model.BattleLog, 0, batchSize),
		gmBatch:       make([]*model.GmOperationLog, 0, batchSize),
		loginBatch:    make([]*model.LoginLog, 0, batchSize),
		batchSize:     batchSize,
		flushInterval: flushInterval,
		stopCh:        make(chan struct{}),
	}
}

// Start 启动日志写入器
func (w *AsyncLogWriter) Start() {
	w.wg.Add(4)
	go w.consumeActionLogs()
	go w.consumeBattleLogs()
	go w.consumeGmLogs()
	go w.consumeLoginLogs()
}

// WriteActionLog 异步写入用户行为日志
func (w *AsyncLogWriter) WriteActionLog(entry *model.UserActionLog) {
	select {
	case w.actionCh <- entry:
	default:
		log.Printf("[LogWriter] WARNING: action log channel full, dropping log for user %d", entry.UserID)
	}
}

// WriteBattleLog 异步写入战斗日志
func (w *AsyncLogWriter) WriteBattleLog(entry *model.BattleLog) {
	select {
	case w.battleCh <- entry:
	default:
		log.Printf("[LogWriter] WARNING: battle log channel full, dropping battle %s", entry.BattleID)
	}
}

// WriteGmLog 异步写入GM操作日志
func (w *AsyncLogWriter) WriteGmLog(entry *model.GmOperationLog) {
	select {
	case w.gmCh <- entry:
	default:
		// GM日志不能丢弃，改用同步写入
		_ = dao.CreateGmLog(entry)
	}
}

// WriteLoginLog 异步写入登录日志
func (w *AsyncLogWriter) WriteLoginLog(entry *model.LoginLog) {
	select {
	case w.loginCh <- entry:
	default:
		log.Printf("[LogWriter] WARNING: login log channel full, dropping login log for user %d", entry.UserID)
	}
}

// consumeActionLogs 消费用户行为日志
func (w *AsyncLogWriter) consumeActionLogs() {
	defer w.wg.Done()
	ticker := time.NewTicker(w.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case entry := <-w.actionCh:
			w.mu.Lock()
			w.actionBatch = append(w.actionBatch, entry)
			if len(w.actionBatch) >= w.batchSize {
				w.flushActionLogs()
			}
			w.mu.Unlock()
		case <-ticker.C:
			w.mu.Lock()
			w.flushActionLogs()
			w.mu.Unlock()
		case <-w.stopCh:
			w.mu.Lock()
			w.flushActionLogs()
			w.mu.Unlock()
			return
		}
	}
}

// consumeBattleLogs 消费战斗日志
func (w *AsyncLogWriter) consumeBattleLogs() {
	defer w.wg.Done()
	ticker := time.NewTicker(w.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case entry := <-w.battleCh:
			w.mu.Lock()
			w.battleBatch = append(w.battleBatch, entry)
			if len(w.battleBatch) >= w.batchSize {
				w.flushBattleLogs()
			}
			w.mu.Unlock()
		case <-ticker.C:
			w.mu.Lock()
			w.flushBattleLogs()
			w.mu.Unlock()
		case <-w.stopCh:
			w.mu.Lock()
			w.flushBattleLogs()
			w.mu.Unlock()
			return
		}
	}
}

// consumeGmLogs 消费GM操作日志
func (w *AsyncLogWriter) consumeGmLogs() {
	defer w.wg.Done()
	ticker := time.NewTicker(w.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case entry := <-w.gmCh:
			w.mu.Lock()
			w.gmBatch = append(w.gmBatch, entry)
			if len(w.gmBatch) >= w.batchSize {
				w.flushGmLogs()
			}
			w.mu.Unlock()
		case <-ticker.C:
			w.mu.Lock()
			w.flushGmLogs()
			w.mu.Unlock()
		case <-w.stopCh:
			w.mu.Lock()
			w.flushGmLogs()
			w.mu.Unlock()
			return
		}
	}
}

// consumeLoginLogs 消费登录日志
func (w *AsyncLogWriter) consumeLoginLogs() {
	defer w.wg.Done()
	ticker := time.NewTicker(w.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case entry := <-w.loginCh:
			w.mu.Lock()
			w.loginBatch = append(w.loginBatch, entry)
			if len(w.loginBatch) >= w.batchSize {
				w.flushLoginLogs()
			}
			w.mu.Unlock()
		case <-ticker.C:
			w.mu.Lock()
			w.flushLoginLogs()
			w.mu.Unlock()
		case <-w.stopCh:
			w.mu.Lock()
			w.flushLoginLogs()
			w.mu.Unlock()
			return
		}
	}
}

// flushActionLogs 批量写入用户行为日志
func (w *AsyncLogWriter) flushActionLogs() {
	if len(w.actionBatch) == 0 {
		return
	}
	batch := w.actionBatch
	w.actionBatch = make([]*model.UserActionLog, 0, w.batchSize)

	go func() {
		for _, l := range batch {
			if err := dao.CreateUserActionLog(l); err != nil {
				log.Printf("[LogWriter] ERROR: write action log: %v", err)
			}
		}
	}()
}

// flushBattleLogs 批量写入战斗日志
func (w *AsyncLogWriter) flushBattleLogs() {
	if len(w.battleBatch) == 0 {
		return
	}
	batch := w.battleBatch
	w.battleBatch = make([]*model.BattleLog, 0, w.batchSize)

	go func() {
		for _, l := range batch {
			if err := dao.CreateBattleLog(l); err != nil {
				log.Printf("[LogWriter] ERROR: write battle log: %v", err)
			}
		}
	}()
}

// flushGmLogs 批量写入GM操作日志
func (w *AsyncLogWriter) flushGmLogs() {
	if len(w.gmBatch) == 0 {
		return
	}
	batch := w.gmBatch
	w.gmBatch = make([]*model.GmOperationLog, 0, w.batchSize)

	go func() {
		for _, l := range batch {
			if err := dao.CreateGmLog(l); err != nil {
				log.Printf("[LogWriter] ERROR: write gm log: %v", err)
			}
		}
	}()
}

// flushLoginLogs 批量写入登录日志
func (w *AsyncLogWriter) flushLoginLogs() {
	if len(w.loginBatch) == 0 {
		return
	}
	batch := w.loginBatch
	w.loginBatch = make([]*model.LoginLog, 0, w.batchSize)

	go func() {
		for _, l := range batch {
			if err := dao.CreateLoginLog(l); err != nil {
				log.Printf("[LogWriter] ERROR: write login log: %v", err)
			}
		}
	}()
}

// Stop 优雅关闭日志写入器
func (w *AsyncLogWriter) Stop() {
	close(w.stopCh)
	w.wg.Wait()
	log.Println("[LogWriter] 异步日志写入器已关闭")
}

// GetStats 获取日志写入器统计信息
func (w *AsyncLogWriter) GetStats() map[string]interface{} {
	w.mu.Lock()
	defer w.mu.Unlock()

	return map[string]interface{}{
		"actionPending": len(w.actionCh),
		"battlePending": len(w.battleCh),
		"gmPending":     len(w.gmCh),
		"loginPending":  len(w.loginCh),
		"actionBatch":   len(w.actionBatch),
		"battleBatch":   len(w.battleBatch),
		"gmBatch":       len(w.gmBatch),
		"loginBatch":    len(w.loginBatch),
		"batchSize":     w.batchSize,
		"flushInterval": w.flushInterval.String(),
	}
}

// ==================== 便捷函数 ====================

// LogAction 写入用户行为日志
func LogAction(userID int64, uid, nickname, category, action, detail string, ip string) {
	if Writer == nil {
		return
	}
	Writer.WriteActionLog(&model.UserActionLog{
		UserID:    userID,
		UID:       uid,
		Nickname:  nickname,
		Category:  category,
		Action:    action,
		Detail:    detail,
		IP:        ip,
		CreatedAt: time.Now(),
	})
}

// LogActionWithExtra 写入用户行为日志(带扩展数据)
func LogActionWithExtra(userID int64, uid, nickname, category, action, detail string, extra interface{}, ip string) {
	if Writer == nil {
		return
	}
	extraJSON, _ := json.Marshal(extra)
	extraStr := string(extraJSON)
	Writer.WriteActionLog(&model.UserActionLog{
		UserID:    userID,
		UID:       uid,
		Nickname:  nickname,
		Category:  category,
		Action:    action,
		Detail:    detail,
		ExtraData: &extraStr,
		IP:        ip,
		CreatedAt: time.Now(),
	})
}

// LogGmOperation 写入GM操作日志
func LogGmOperation(operatorID int64, operatorName string, targetID int64, targetType, action, detail string, ip, userAgent string) {
	if Writer == nil {
		return
	}
	Writer.WriteGmLog(&model.GmOperationLog{
		OperatorID:   operatorID,
		OperatorName: operatorName,
		TargetID:     targetID,
		TargetType:   targetType,
		Action:       action,
		Detail:       detail,
		Level:        1,
		Result:       1,
		IP:           ip,
		UserAgent:    userAgent,
		CreatedAt:    time.Now(),
	})
}

// LogGmOperationRisk 写入高风险GM操作日志
func LogGmOperationRisk(operatorID int64, operatorName string, targetID int64, targetType, action, detail string, level int8, ip, userAgent string) {
	if Writer == nil {
		return
	}
	Writer.WriteGmLog(&model.GmOperationLog{
		OperatorID:   operatorID,
		OperatorName: operatorName,
		TargetID:     targetID,
		TargetType:   targetType,
		Action:       action,
		Detail:       detail,
		Level:        level,
		Result:       1,
		IP:           ip,
		UserAgent:    userAgent,
		CreatedAt:    time.Now(),
	})
}

// LogLogin 写入登录日志
func LogLogin(userID int64, nickname, ip, device, channel, appVersion string, status int8, failReason string) {
	if Writer == nil {
		return
	}
	Writer.WriteLoginLog(&model.LoginLog{
		UserID:     userID,
		Nickname:   nickname,
		IP:         ip,
		Device:     device,
		Channel:    channel,
		AppVersion: appVersion,
		Status:     status,
		FailReason: failReason,
		CreatedAt:  time.Now(),
	})
}
