'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Copy, Check, ChevronDown, Database, Server, Shield,
  Zap, ArrowRight, Clock, FileCode,
  CreditCard, Lock, Wallet, Gift, Crown, X, AlertTriangle,
  Timer, RefreshCw, type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

function CodeBlock({ code, lang = 'go', filename }: { code: string; lang: string; filename: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="relative rounded-lg overflow-hidden border">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/80" /><div className="w-3 h-3 rounded-full bg-yellow-500/80" /><div className="w-3 h-3 rounded-full bg-green-500/80" /></div>
          <span className="text-xs text-zinc-400 font-mono ml-2">{filename}</span>
        </div>
        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-400 hover:text-zinc-200" onClick={handleCopy}>{copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}</Button></TooltipTrigger><TooltipContent>{copied ? '已复制' : '复制'}</TooltipContent></Tooltip></TooltipProvider>
      </div>
      <SyntaxHighlighter language={lang} style={oneDark} customStyle={{ margin: 0, padding: '16px', fontSize: '12px', lineHeight: '1.6', background: '#1e1e2e' }} showLineNumbers lineNumberStyle={{ color: '#585b70', fontSize: '11px', minWidth: '3em' }}>{code}</SyntaxHighlighter>
    </div>
  )
}

// ===== Section 2: 订单状态机 =====
const orderStates = [
  { code: 0, name: 'Pending', zh: '待支付', icon: Clock, color: 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/10', iconColor: 'text-amber-500', desc: '订单已创建，等待用户支付', transitions: ['Paid → 已支付', 'Closed → 超时关闭'] },
  { code: 1, name: 'Paid', zh: '已支付', icon: CreditCard, color: 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10', iconColor: 'text-emerald-500', desc: '支付成功，等待发货', transitions: ['Delivered → 已发货', 'Refunded → 已退款'] },
  { code: 2, name: 'Delivered', zh: '已发货', icon: Check, color: 'border-sky-300 bg-sky-50/40 dark:bg-sky-950/10', iconColor: 'text-sky-500', desc: '商品已发放到用户账户', transitions: ['Refunded → 已退款'] },
  { code: 3, name: 'Refunded', zh: '已退款', icon: RefreshCw, color: 'border-purple-300 bg-purple-50/40 dark:bg-purple-950/10', iconColor: 'text-purple-500', desc: '订单已退款，钻石已回收', transitions: ['终态，无后续转换'] },
  { code: 4, name: 'Closed', zh: '已关闭', icon: X, color: 'border-stone-300 bg-stone-50/40 dark:bg-stone-950/10', iconColor: 'text-stone-500', desc: '超时未支付或用户取消', transitions: ['终态，无后续转换'] },
]

// ===== Section 3: 防重复支付机制 =====
const antiDuplicate = [
  { title: 'Redis 幂等锁', sub: '3s TTL', icon: Lock, color: 'border-red-300 bg-red-50/40 dark:bg-red-950/10', iconColor: 'text-red-500', desc: '同用户同商品3秒内不允许重复下单', detail: 'Key: pay:idempotent:{userID}:{productID}\nTTL: 3秒\n重复请求直接返回已有订单' },
  { title: '回调去重表', sub: '唯一索引', icon: Database, color: 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10', iconColor: 'text-emerald-500', desc: 'callback_id 唯一索引，重复回调直接返回成功', detail: 'payment_callbacks 表 callback_id UNIQUE KEY\nINSERT 失败 → 已处理 → 返回成功\n保证支付平台多次重试的幂等性' },
  { title: '分布式锁', sub: 'SETNX 30s', icon: Shield, color: 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/10', iconColor: 'text-amber-500', desc: 'Redis SETNX 30s 锁，防止并发回调处理', detail: 'Key: pay:lock:{orderNo}\nTTL: 30 秒\n防止同一订单并发处理导致重复发货' },
  { title: '状态机校验', sub: 'Pending→Paid', icon: AlertTriangle, color: 'border-sky-300 bg-sky-50/40 dark:bg-sky-950/10', iconColor: 'text-sky-500', desc: '只有 Pending→Paid 合法，非 Pending 静默成功返回', detail: '非 Pending 状态 → 不执行业务\n静默返回成功（幂等设计）\n避免回调报错触发支付平台告警' },
]

// ===== Section 4: 充值档位 =====
const rechargeTiers = [
  { yuan: 6, diamond: 60, bonus: 0, tag: '首充', color: 'border-stone-300 bg-stone-50/40 dark:bg-stone-950/10', tagColor: 'bg-stone-500/10 text-stone-600 border-stone-300' },
  { yuan: 30, diamond: 330, bonus: 30, tag: '+30', color: 'border-green-300 bg-green-50/40 dark:bg-green-950/10', tagColor: 'bg-green-500/10 text-green-600 border-green-300' },
  { yuan: 68, diamond: 760, bonus: 60, tag: '+60', color: 'border-sky-300 bg-sky-50/40 dark:bg-sky-950/10', tagColor: 'bg-sky-500/10 text-sky-600 border-sky-300' },
  { yuan: 128, diamond: 1460, bonus: 180, tag: '+180', color: 'border-purple-300 bg-purple-50/40 dark:bg-purple-950/10', tagColor: 'bg-purple-500/10 text-purple-600 border-purple-300' },
  { yuan: 328, diamond: 3800, bonus: 680, tag: '+680', color: 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/10', tagColor: 'bg-amber-500/10 text-amber-600 border-amber-300' },
  { yuan: 648, diamond: 7680, bonus: 1680, tag: '超值', color: 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10', tagColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-300' },
]

// ===== Section 5: 商品类型 =====
const productTypes = [
  { name: '钻石充值', en: 'Diamond Recharge', icon: CreditCard, color: 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/10', iconColor: 'text-emerald-500', desc: '即时到账', detail: '6 档充值金额，即时到账\n首次充值双倍钻石奖励\n支持支付宝/微信支付' },
  { name: '月卡', en: 'Monthly Card (30元)', icon: Gift, color: 'border-sky-300 bg-sky-50/40 dark:bg-sky-950/10', iconColor: 'text-sky-500', desc: '30天每日100💎', detail: '30元购买，立即获得 300💎\n后续 30 天每日可领取 100💎\n累计获得 3300💎，超高性价比' },
  { name: '礼包', en: 'Gift Packs', icon: Wallet, color: 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/10', iconColor: 'text-amber-500', desc: '新手/成长/每周', detail: '新手礼包：一次性购买\n成长礼包：按等级解锁\n每周礼包：每周重置购买' },
  { name: 'VIP礼包', en: 'VIP Packages', icon: Crown, color: 'border-purple-300 bg-purple-50/40 dark:bg-purple-950/10', iconColor: 'text-purple-500', desc: '经验值+每日奖励', detail: '5 级 VIP 体系\n充值累积 VIP 经验值\n每日可领取 VIP 专属奖励' },
]

// ===== Section 6: REST API =====
const apiList = [
  { method: 'GET', path: '/api/v1/pay/tiers', auth: false, desc: '充值档位列表', color: 'bg-sky-500',
    res: `{\n  "code": 0,\n  "data": {\n    "tiers": [\n      {"tier_id": 1, "yuan": 6, "diamond": 60, "bonus": 0, "tag": "首充"},\n      {"tier_id": 2, "yuan": 30, "diamond": 330, "bonus": 30, "tag": "+30"},\n      {"tier_id": 3, "yuan": 68, "diamond": 760, "bonus": 60, "tag": "+60"},\n      {"tier_id": 4, "yuan": 128, "diamond": 1460, "bonus": 180, "tag": "+180"},\n      {"tier_id": 5, "yuan": 328, "diamond": 3800, "bonus": 680, "tag": "+680"},\n      {"tier_id": 6, "yuan": 648, "diamond": 7680, "bonus": 1680, "tag": "超值"}\n    ]\n  }\n}` },
  { method: 'POST', path: '/api/v1/pay/recharge', auth: true, desc: '创建充值订单', color: 'bg-emerald-500',
    req: `{\n  "tier_id": 3,\n  "product_type": "diamond"\n}`,
    res: `{\n  "code": 0,\n  "data": {\n    "order_no": "PAY20250115100300001",\n    "user_id": 5001,\n    "product_type": "diamond",\n    "tier_id": 3,\n    "yuan": 68,\n    "diamond": 760,\n    "bonus": 60,\n    "status": 0,\n    "pay_url": "https://pay.example.com/checkout/PAY2025...",\n    "expire_at": "2025-01-15T10:18:00Z",\n    "created_at": "2025-01-15T10:03:00Z"\n  }\n}` },
  { method: 'POST', path: '/api/v1/pay/callback', auth: false, desc: '支付回调(无JWT)', color: 'bg-amber-500',
    req: `{\n  "callback_id": "CB_20250115_001",\n  "order_no": "PAY20250115100300001",\n  "trade_no": "WX_20250115000450001",\n  "status": "success",\n  "paid_at": "2025-01-15T10:04:32Z",\n  "sign": "a1b2c3d4e5..."}\n}`,
    res: `{\n  "code": 0,\n  "message": "success"\n}` },
  { method: 'GET', path: '/api/v1/pay/order/:orderNo', auth: true, desc: '订单详情', color: 'bg-purple-500',
    res: `{\n  "code": 0,\n  "data": {\n    "order_no": "PAY20250115100300001",\n    "user_id": 5001,\n    "product_type": "diamond",\n    "tier_id": 3,\n    "yuan": 68,\n    "diamond": 760,\n    "bonus": 60,\n    "status": 1,\n    "status_text": "已支付",\n    "trade_no": "WX_20250115000450001",\n    "paid_at": "2025-01-15T10:04:32Z",\n    "delivered_at": "2025-01-15T10:04:33Z",\n    "created_at": "2025-01-15T10:03:00Z"\n  }\n}` },
  { method: 'POST', path: '/api/v1/pay/refund', auth: true, desc: '申请退款', color: 'bg-red-500',
    req: `{\n  "order_no": "PAY20250115100300001",\n  "reason": "误操作充值"\n}`,
    res: `{\n  "code": 0,\n  "data": {\n    "refund_no": "REF20250115100500001",\n    "order_no": "PAY20250115100300001",\n    "refund_amount": 68,\n    "diamond_deducted": 820,\n    "status": 0,\n    "created_at": "2025-01-15T10:05:00Z"\n  }\n}` },
  { method: 'GET', path: '/api/v1/pay/monthly', auth: true, desc: '月卡信息', color: 'bg-sky-500',
    res: `{\n  "code": 0,\n  "data": {\n    "is_active": true,\n    "expire_at": "2025-02-14T10:00:00Z",\n    "total_days": 30,\n    "claimed_days": 15,\n    "remaining_days": 15,\n    "daily_diamond": 100,\n    "today_claimed": true\n  }\n}` },
  { method: 'POST', path: '/api/v1/pay/monthly/claim', auth: true, desc: '月卡领取', color: 'bg-green-500',
    res: `{\n  "code": 0,\n  "data": {\n    "diamond_gained": 100,\n    "total_diamond": 1500,\n    "claimed_days": 16,\n    "remaining_days": 14\n  }\n}` },
  { method: 'GET', path: '/api/v1/pay/vip', auth: true, desc: 'VIP信息', color: 'bg-amber-500',
    res: `{\n  "code": 0,\n  "data": {\n    "vip_level": 3,\n    "vip_exp": 4200,\n    "next_level_exp": 5000,\n    "total_recharge": 520,\n    "daily_reward_claimed": false,\n    "daily_reward": {\n      "diamond": 50,\n      "resource_bonus": 0.15\n    },\n    "benefits": [\n      {"type": "diamond", "value": 50, "desc": "每日50钻石"},\n      {"type": "resource_bonus", "value": "15%", "desc": "资源产出+15%"}\n    ]\n  }\n}` },
  { method: 'GET', path: '/api/v1/pay/wallet/logs', auth: true, desc: '钱包流水', color: 'bg-stone-500',
    res: `{\n  "code": 0,\n  "data": {\n    "current_diamond": 1500,\n    "logs": [\n      {\n        "id": 9001,\n        "type": "recharge",\n        "amount": 820,\n        "balance": 1500,\n        "desc": "充值68元 760+60钻石",\n        "created_at": "2025-01-15T10:04:33Z"\n      },\n      {\n        "id": 9002,\n        "type": "monthly_claim",\n        "amount": 100,\n        "balance": 1680,\n        "desc": "月卡每日领取",\n        "created_at": "2025-01-15T08:00:00Z"\n      }\n    ],\n    "total": 128,\n    "page": 1,\n    "page_size": 20\n  }\n}` },
  { method: 'GET', path: '/api/v1/pay/milestones', auth: true, desc: '成长基金', color: 'bg-emerald-500',
    res: `{\n  "code": 0,\n  "data": {\n    "milestones": [\n      {"level": 1, "recharge": 50, "reward": 100, "claimed": true},\n      {"level": 2, "recharge": 200, "reward": 500, "claimed": true},\n      {"level": 3, "recharge": 500, "reward": 1500, "claimed": false},\n      {"level": 4, "recharge": 1000, "reward": 3500, "claimed": false},\n      {"level": 5, "recharge": 3000, "reward": 12000, "claimed": false}\n    ],\n    "total_recharge": 520\n  }\n}` },
]

// ===== Section 7: 数据库 =====
const dbTables = [
  { name: 'payment_orders', desc: '订单表', fields: ['order_no (唯一订单号)', 'user_id (用户)', 'product_type (diamond/monthly/gift/vip)', 'tier_id (充值档位)', 'yuan (金额分)', 'diamond (钻石)', 'bonus (赠送)', 'status (0待付1已付2已发3退4关)', 'trade_no (第三方流水号)', 'paid_at / delivered_at', 'expire_at (超时时间)'] },
  { name: 'payment_callbacks', desc: '回调日志(防重放)', fields: ['id (主键)', 'callback_id (唯一·防重放)', 'order_no → payment_orders', 'trade_no (第三方)', 'raw_body (原始请求JSON)', 'sign (签名)', 'processed TINYINT', 'created_at', 'UNIQUE KEY uk_callback (callback_id)'] },
  { name: 'user_monthly_cards', desc: '月卡', fields: ['id (主键)', 'user_id (用户)', 'is_active (是否激活)', 'start_date / expire_date', 'total_days (30)', 'claimed_days (已领天数)', 'daily_diamond (100)', 'purchased_at'] },
  { name: 'user_gift_purchases', desc: '礼包购买', fields: ['id (主键)', 'user_id (用户)', 'gift_key (礼包标识)', 'gift_name (名称)', 'price_yuan (价格)', 'contents_json (内容JSON)', 'purchase_time'] },
  { name: 'user_vip_records', desc: 'VIP记录', fields: ['id (主键)', 'user_id (用户)', 'vip_level (1~5)', 'vip_exp (经验值)', 'total_recharge (累计充值)', 'last_claim_date', 'updated_at'] },
  { name: 'user_wallet_logs', desc: '钱包流水', fields: ['id (主键)', 'user_id (用户)', 'type (recharge/claim/spend/refund)', 'amount (变动数量)', 'balance (变动后余额)', 'desc (描述)', 'ref_order_no (关联订单)', 'created_at'] },
  { name: 'growth_fund_milestones', desc: '成长基金', fields: ['id (主键)', 'user_id (用户)', 'level (里程碑等级)', 'recharge_required (所需累计)', 'reward_diamond (奖励)', 'claimed (是否已领)', 'claimed_at'] },
  { name: 'refund_records', desc: '退款记录', fields: ['refund_no (退款单号)', 'order_no → payment_orders', 'user_id (用户)', 'refund_amount (退款金额)', 'diamond_deducted (回收钻石)', 'status (0处理中1已退2已拒)', 'reason (退款原因)', 'created_at / processed_at'] },
]

// ===== Section 8: 核心源码 =====
const sourceFiles = [
  { name: 'main.go', desc: '服务入口 + 路由注册' },
  { name: 'payment_engine.go', desc: '支付引擎核心 (订单状态机 + 回调处理)' },
  { name: 'payment_model.go', desc: '数据模型 (12个结构体)' },
  { name: 'payment_dao.go', desc: '数据访问层 (35+方法)' },
  { name: 'payment_service.go', desc: '业务逻辑 (充值/月卡/VIP)' },
  { name: 'payment_handler.go', desc: 'HTTP处理器 (10个接口)' },
  { name: 'router.go', desc: '路由注册 + JWT中间件' },
  { name: 'idempotent.go', desc: '幂等锁 (Redis)' },
  { name: 'callback_guard.go', desc: '回调防护 (去重+分布式锁)' },
  { name: 'order_state.go', desc: '订单状态机' },
  { name: 'delivery.go', desc: '异步发货引擎' },
  { name: 'schema.sql', desc: '数据库建表 (8张)' },
  { name: 'config.yaml', desc: '服务配置' },
  { name: 'response.go', desc: '统一响应' },
]

const stateMachineCode = `// 订单状态常量
const (
    OrderPending   int8 = 0 // 待支付
    OrderPaid      int8 = 1 // 已支付
    OrderDelivered int8 = 2 // 已发货
    OrderRefunded  int8 = 3 // 已退款
    OrderClosed    int8 = 4 // 已关闭
)

// ValidTransitions 合法状态转换表
var ValidTransitions = map[int8][]int8{
    OrderPending:   {OrderPaid, OrderClosed},
    OrderPaid:      {OrderDelivered, OrderRefunded},
    OrderDelivered: {OrderRefunded},
}

// IsValidTransition 校验状态转换是否合法
func IsValidTransition(from, to int8) bool {
    validTos, ok := ValidTransitions[from]
    if !ok {
        return false
    }
    for _, v := range validTos {
        if v == to {
            return true
        }
    }
    return false
}

// StatusText 状态码 → 中文描述
var StatusText = map[int8]string{
    OrderPending:   "待支付",
    OrderPaid:      "已支付",
    OrderDelivered: "已发货",
    OrderRefunded:  "已退款",
    OrderClosed:    "已关闭",
}`

const callbackCode = `// ProcessCallback 处理支付回调（防重放核心）
func (e *PaymentEngine) ProcessCallback(ctx context.Context, cb *PaymentCallback) error {
    // 1. 幂等检查: callback_id 唯一索引去重
    if err := e.dao.CreateCallback(ctx, cb); err != nil {
        if errors.Is(err, dao.ErrCallbackExists) {
            log.Info("callback already processed", "callback_id", cb.CallbackID)
            return nil // 幂等返回成功
        }
        return fmt.Errorf("create callback: %w", err)
    }

    // 2. 查询订单
    order, err := e.dao.GetOrderByNo(ctx, cb.OrderNo)
    if err != nil {
        return fmt.Errorf("get order: %w", err)
    }

    // 3. 状态机校验: Pending → Paid
    if !model.IsValidTransition(order.Status, model.OrderPaid) {
        log.Info("invalid transition, idempotent return",
            "status", model.StatusText[order.Status])
        return nil // 非 Pending 直接返回成功
    }

    // 4. Redis 分布式锁: 防止并发
    lockKey := fmt.Sprintf("pay:lock:%s", cb.OrderNo)
    locked, err := myredis.RDB.SetNX(ctx, lockKey, "1", 30*time.Second).Result()
    if err != nil || !locked {
        log.Warn("failed to acquire lock or duplicate", "order", cb.OrderNo)
        return nil
    }
    defer myredis.RDB.Del(ctx, lockKey)

    // 5. 更新订单状态 → Paid
    if err := e.dao.UpdateOrderStatus(ctx, order.OrderNo, model.OrderPaid, cb.TradeNo); err != nil {
        return fmt.Errorf("update order: %w", err)
    }

    // 6. 异步发货（投递到队列）
    e.deliveryQueue <- &DeliveryTask{
        OrderNo:  order.OrderNo,
        UserID:   order.UserID,
        Diamond:  order.Diamond + order.Bonus,
        Type:     order.ProductType,
    }

    return nil
}`

const schemaSQL = `-- 支付系统数据库建表脚本
-- 8 张表：订单、回调、月卡、礼包、VIP、钱包流水、成长基金、退款

CREATE TABLE payment_orders (
  order_no VARCHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_type VARCHAR(20) NOT NULL COMMENT 'diamond/monthly/gift/vip',
  tier_id INT DEFAULT 0,
  yuan INT NOT NULL COMMENT '金额(分)',
  diamond INT NOT NULL DEFAULT 0 COMMENT '钻石',
  bonus INT NOT NULL DEFAULT 0 COMMENT '赠送钻石',
  status TINYINT DEFAULT 0 COMMENT '0待付1已付2已发3退4关',
  trade_no VARCHAR(128) DEFAULT '' COMMENT '第三方流水号',
  paid_at DATETIME,
  delivered_at DATETIME,
  expire_at DATETIME NOT NULL COMMENT '超时时间',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  INDEX idx_user_status (user_id, status),
  INDEX idx_created (created_at)
);

CREATE TABLE payment_callbacks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  callback_id VARCHAR(128) NOT NULL COMMENT '回调唯一标识',
  order_no VARCHAR(64) NOT NULL,
  trade_no VARCHAR(128) DEFAULT '',
  raw_body JSON COMMENT '原始请求体',
  sign VARCHAR(256) DEFAULT '',
  processed TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT NOW(),
  UNIQUE KEY uk_callback (callback_id),
  INDEX idx_order (order_no)
);

CREATE TABLE user_monthly_cards (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  is_active TINYINT DEFAULT 1,
  start_date DATE NOT NULL,
  expire_date DATE NOT NULL,
  total_days INT DEFAULT 30,
  claimed_days INT DEFAULT 0,
  daily_diamond INT DEFAULT 100,
  purchased_at DATETIME DEFAULT NOW(),
  UNIQUE KEY uk_user (user_id)
);

CREATE TABLE user_gift_purchases (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  gift_key VARCHAR(30) NOT NULL,
  gift_name VARCHAR(50) NOT NULL,
  price_yuan INT NOT NULL,
  contents_json JSON NOT NULL,
  purchase_time DATETIME DEFAULT NOW(),
  UNIQUE KEY uk_user_gift (user_id, gift_key)
);

CREATE TABLE user_vip_records (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  vip_level TINYINT DEFAULT 0,
  vip_exp INT DEFAULT 0,
  total_recharge INT DEFAULT 0 COMMENT '累计充值(分)',
  last_claim_date DATE,
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  UNIQUE KEY uk_user (user_id)
);

CREATE TABLE user_wallet_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL COMMENT 'recharge/claim/spend/refund',
  amount INT NOT NULL COMMENT '变动数量(+/-)',
  balance INT NOT NULL COMMENT '变动后余额',
  description VARCHAR(200) DEFAULT '',
  ref_order_no VARCHAR(64) DEFAULT '',
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_user_time (user_id, created_at)
);

CREATE TABLE growth_fund_milestones (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  level TINYINT NOT NULL,
  recharge_required INT NOT NULL COMMENT '所需累计充值(分)',
  reward_diamond INT NOT NULL,
  claimed TINYINT DEFAULT 0,
  claimed_at DATETIME,
  UNIQUE KEY uk_user_level (user_id, level)
);

CREATE TABLE refund_records (
  refund_no VARCHAR(64) PRIMARY KEY,
  order_no VARCHAR(64) NOT NULL,
  user_id BIGINT NOT NULL,
  refund_amount INT NOT NULL COMMENT '退款金额(分)',
  diamond_deducted INT NOT NULL COMMENT '回收钻石',
  status TINYINT DEFAULT 0 COMMENT '0处理中1已退2已拒',
  reason VARCHAR(200) DEFAULT '',
  created_at DATETIME DEFAULT NOW(),
  processed_at DATETIME,
  INDEX idx_user (user_id),
  INDEX idx_order (order_no)
);`

const configYaml = `server:
  port: 9006
  mode: release

database:
  host: 127.0.0.1
  port: 3306
  user: root
  password: ""
  dbname: jiuzhou_payment
  max_open_conns: 20
  max_idle_conns: 10

redis:
  addr: 127.0.0.1:6379
  password: ""
  db: 0
  pool_size: 10

jwt:
  secret: "your-jwt-secret-key"
  expire_hours: 24

payment:
  idempotent_ttl: 3s
  order_expire: 15m
  callback_lock_ttl: 30s
  monthly_card_days: 30
  monthly_daily_diamond: 100
  vip_levels: 5
  max_refund_hours: 24
  delivery_queue_size: 1000

log:
  level: info
  file: logs/payment-service.log`

export default function Home() {
  const [activeTab, setActiveTab] = useState(1)

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:py-12 space-y-12">

          {/* ===== 1. Hero ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/80 p-8 md:p-12">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-teal-500/10 via-emerald-500/5 to-transparent blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">Payment Service</Badge>
                <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5">支付系统</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-black">
                <span className="bg-gradient-to-r from-emerald-500 via-green-400 to-teal-500 bg-clip-text text-transparent">支付系统微服务</span>
              </h1>
              <p className="mt-2 text-lg text-muted-foreground font-medium">Payment Service — 充值订单 · 支付回调 · 月卡礼包 · VIP体系</p>
              <p className="mt-3 text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
                基于 Go + 订单状态机的支付系统。6档充值体系、4层防重复支付保护、月卡30天每日领取、
                礼包系统、VIP5级体系、成长基金、退款机制等完整支付链路。
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['6档充值', '订单状态机', '防重复支付', '支付回调', '月卡30天', '礼包系统', 'VIP5级', '退款机制'].map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs px-2.5 py-1">{t}</Badge>
                ))}
              </div>
            </div>
          </motion.section>

          {/* ===== 2. 订单状态机 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-green-600" />
              <h2 className="text-2xl font-bold">订单状态机</h2>
              <Badge variant="outline" className="border-emerald-300 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-xs">核心设计</Badge>
            </div>

            {/* State Flow Diagram */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {orderStates.map((s, i) => (
                <div key={s.code} className="flex items-center gap-2 flex-shrink-0">
                  <Card className={`border ${s.color} hover:shadow-sm transition-shadow min-w-[160px]`}>
                    <CardHeader className="pb-1.5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                          <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                          {s.zh}
                        </CardTitle>
                        <Badge variant="outline" className={`text-[9px] font-mono ${s.iconColor} border-current/30`}>{s.code}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-[10px] font-mono text-muted-foreground">{s.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{s.desc}</p>
                    </CardContent>
                  </Card>
                  {i < orderStates.length - 1 && (
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                      {i === 0 ? (
                        <div className="flex flex-col items-center">
                          <ArrowRight className="w-4 h-4 text-emerald-500" />
                          <span className="text-[8px] text-emerald-500 font-mono">Paid</span>
                        </div>
                      ) : i === 1 ? (
                        <div className="flex flex-col items-center">
                          <ArrowRight className="w-4 h-4 text-sky-500" />
                          <span className="text-[8px] text-sky-500 font-mono">Delivered</span>
                        </div>
                      ) : i === 2 ? (
                        <div className="flex flex-col items-center">
                          <ArrowRight className="w-4 h-4 text-purple-500" />
                          <span className="text-[8px] text-purple-500 font-mono">Refund</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pending → Closed branch */}
            <Card className="border-dashed border-amber-300 bg-amber-50/30 dark:bg-amber-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Pending 分支说明
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-300 text-[10px]">Pending(0)</Badge>
                    <ArrowRight className="w-3 h-3 text-emerald-500" />
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-300 text-[10px]">Paid(1)</Badge>
                    <span className="text-xs text-muted-foreground">正常支付</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-300 text-[10px]">Pending(0)</Badge>
                    <ArrowRight className="w-3 h-3 text-stone-500" />
                    <Badge className="bg-stone-500/10 text-stone-600 border-stone-300 text-[10px]">Closed(4)</Badge>
                    <span className="text-xs text-muted-foreground">15分钟超时 / 用户取消</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transition Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {orderStates.map((s) => (
                <Card key={s.code}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold flex items-center gap-2">
                        <s.icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                        {s.name}
                        <span className="text-[9px] text-muted-foreground font-mono">({s.code})</span>
                      </CardTitle>
                    </div>
                    <CardDescription className="text-[11px]">{s.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-[10px] text-muted-foreground font-semibold mb-1">合法转换:</p>
                    {s.transitions.map((t) => (
                      <div key={t} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 flex-shrink-0" />
                        {t}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 3. 防重复支付机制 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-red-500 to-amber-600" />
              <h2 className="text-2xl font-bold">防重复支付机制</h2>
              <Badge variant="outline" className="border-red-300 text-red-600 dark:text-red-400 bg-red-500/5 text-xs">4层防护</Badge>
            </div>

            {/* Protection Flow */}
            <Card className="border-dashed border-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  回调处理链路
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {['支付平台回调', '→', '① 回调去重表', '→', '② 分布式锁', '→', '③ 状态机校验', '→', '④ 更新订单', '→', '⑤ 异步发货'].map((step, i) => (
                    <span key={i}>
                      {step === '→' ? (
                        <ArrowRight className="w-4 h-4 text-emerald-500 mx-0.5 flex-shrink-0" />
                      ) : (
                        <Badge className={`text-[10px] flex-shrink-0 ${step.startsWith('①') || step.startsWith('②') || step.startsWith('③') || step.startsWith('④') || step.startsWith('⑤') ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300' : 'bg-muted text-muted-foreground'}`}>{step}</Badge>
                      )}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {antiDuplicate.map((p) => (
                <Card key={p.title} className={`border ${p.color} hover:shadow-sm transition-shadow`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <p.icon className={`w-4 h-4 ${p.iconColor}`} />
                        {p.title}
                      </CardTitle>
                      <Badge variant="outline" className={`text-[10px] ${p.iconColor} border-current/30`}>{p.sub}</Badge>
                    </div>
                    <CardDescription className="text-xs">{p.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-3 rounded-lg bg-card border">
                      <p className="text-[11px] font-mono text-muted-foreground whitespace-pre-line leading-relaxed">{p.detail}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 4. 充值档位 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
              充值档位
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {rechargeTiers.map((t) => (
                <Card key={t.yuan} className={`border ${t.color} hover:shadow-sm transition-shadow`}>
                  <CardContent className="pt-4 pb-4 text-center">
                    <Badge variant="outline" className={`text-[10px] mb-2 ${t.tagColor}`}>{t.tag}</Badge>
                    <p className="text-lg font-black text-emerald-600">{t.yuan}<span className="text-xs font-normal text-muted-foreground ml-0.5">元</span></p>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-muted-foreground">💎</span>
                        <span className="font-mono font-bold">{t.diamond.toLocaleString()}</span>
                      </div>
                      {t.bonus > 0 && (
                        <p className="text-[10px] text-amber-500 font-medium">+{t.bonus} 赠送</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 5. 商品类型 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-teal-500 to-emerald-600" />
              商品类型
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productTypes.map((p) => (
                <Card key={p.name} className={`border ${p.color} hover:shadow-sm transition-shadow`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <p.icon className={`w-4 h-4 ${p.iconColor}`} />
                        {p.name}
                        <span className="text-[10px] text-muted-foreground font-normal font-mono">{p.en}</span>
                      </CardTitle>
                      <Badge variant="outline" className={`text-[10px] ${p.iconColor} border-current/30`}>{p.desc}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {p.detail.split('\n').map((line) => (
                        <li key={line} className="text-xs text-muted-foreground flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                          {line}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 6. REST API ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-green-600" />
              REST API
            </h2>
            {apiList.map((api) => (
              <Collapsible key={api.path}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-md text-white text-xs font-bold font-mono ${api.color}`}>{api.method}</span>
                        <code className="text-sm font-mono font-semibold">{api.path}</code>
                        {api.auth && <Badge variant="outline" className="text-[10px] gap-1 border-emerald-300 text-emerald-600 dark:text-emerald-400"><Shield className="w-3 h-3" />JWT</Badge>}
                        {!api.auth && api.path.includes('callback') && <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-600 dark:text-amber-400"><AlertTriangle className="w-3 h-3" />无JWT</Badge>}
                        <span className="text-xs text-muted-foreground ml-auto">{api.desc}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {api.req && <div><p className="text-xs font-semibold text-muted-foreground mb-2">→ Request</p><CodeBlock code={api.req} lang="json" filename="request.json" /></div>}
                        {api.res && <div><p className="text-xs font-semibold text-muted-foreground mb-2">← Response</p><CodeBlock code={api.res} lang="json" filename="response.json" /></div>}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </motion.section>

          {/* ===== 7. 数据库 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-green-600" />
              数据库（8 张表）
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dbTables.map((t) => (
                <Card key={t.name}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><Database className="w-4 h-4 text-muted-foreground" /><code className="font-mono">{t.name}</code></CardTitle>
                    <CardDescription className="text-xs">{t.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {t.fields.map((f) => (
                        <li key={f} className="text-[11px] font-mono text-muted-foreground flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-current flex-shrink-0" />{f}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 8. 核心源码 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-teal-600 to-emerald-600" />
              核心源码（14 个文件）
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="lg:col-span-1 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-500" />
                    payment-service/
                  </p>
                </div>
                <ScrollArea className="h-[450px]">
                  <div className="p-1 space-y-0.5">
                    {sourceFiles.map((f, i) => (
                      <button key={f.name} onClick={() => setActiveTab(i)} className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center gap-2 transition-colors ${activeTab === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                        <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${activeTab === i ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{f.name}</p>
                          <p className={`text-[10px] truncate ${activeTab === i ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>{f.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
              <Card className="lg:col-span-3 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-muted-foreground" />
                  <code className="text-sm font-mono font-semibold">{sourceFiles[activeTab].name}</code>
                  <Badge variant="outline" className="text-[10px]">{sourceFiles[activeTab].desc}</Badge>
                </div>
                <ScrollArea className="h-[450px]">
                  <div className="p-4">
                    <CodeBlock
                      code={
                        activeTab === 1 ? callbackCode
                        : activeTab === 9 ? stateMachineCode
                        : activeTab === 11 ? schemaSQL
                        : activeTab === 12 ? configYaml
                        : `// 完整源码位于 payment-service/ 目录\n// 14 个文件，包含支付系统核心实现\n// payment_engine.go 包含回调处理核心逻辑\n// callback_guard.go 包含防重放防护机制\n// order_state.go 订单状态机定义\n// delivery.go 异步发货队列\n// payment_handler.go 提供 10 个 HTTP 接口`
                      }
                      lang={
                        activeTab === 11 ? 'sql' : activeTab === 12 ? 'yaml' : 'go'
                      }
                      filename={sourceFiles[activeTab].name}
                    />
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </motion.section>

          {/* ===== 9. 快速启动 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-green-600" />
              快速启动
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                    建库建表
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock code={`mysql -u root -p < payment-service/docs/schema.sql\n\n# 创建数据库 + 8 张表\n# payment_orders, payment_callbacks\n# user_monthly_cards, user_gift_purchases\n# user_vip_records, user_wallet_logs\n# growth_fund_milestones, refund_records`} lang="bash" filename="terminal" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                    启动服务
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock code={`# 启动支付服务 (端口 9006)\ncd payment-service && go run main.go\n\n# 确保 MySQL + Redis 已启动\n# 服务启动后监听 :9006\n# 日志输出到 logs/payment-service.log`} lang="bash" filename="terminal" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                    测试流程
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock code={`# 1. 获取充值档位\ncurl http://localhost:9006/api/v1/pay/tiers\n\n# 2. 创建充值订单\ncurl -X POST http://localhost:9006/api/v1/pay/recharge \\\n  -H "Authorization: Bearer <token>" \\\n  -d '{"tier_id":3,"product_type":"diamond"}'\n\n# 3. 模拟支付回调\ncurl -X POST http://localhost:9006/api/v1/pay/callback \\\n  -d '{"callback_id":"CB_test","order_no":"PAY...","status":"success"}'`} lang="bash" filename="terminal" />
                </CardContent>
              </Card>
            </div>
          </motion.section>

        </main>

        {/* ===== 10. Footer ===== */}
        <footer className="border-t bg-muted/30 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <p className="text-sm font-semibold">九州争鼎 — 支付系统微服务</p>
                <span className="text-xs text-muted-foreground">Go + 订单状态机 + 防重放</span>
              </div>
              <div className="flex items-center gap-2">
                {['Pay', 'Order', 'StateMachine', 'Port 9006'].map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] border-emerald-200 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
