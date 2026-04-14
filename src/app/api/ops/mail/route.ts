import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'

// Helper: upsert mail stats for a user
async function refreshMailStats(userId: number) {
  const total = await db.mail.count({
    where: { receiverId: userId, isDeleted: false },
  })
  const unread = await db.mail.count({
    where: { receiverId: userId, isDeleted: false, isRead: false },
  })
  const rewardPending = await db.mail.count({
    where: { receiverId: userId, isDeleted: false, isRead: false, category: 'reward', isClaimed: false },
  })

  return db.mailStats.upsert({
    where: { userId },
    update: { total, unread, rewardPending },
    create: { userId, total, unread, rewardPending },
  })
}

// GET /api/ops/mail — List mails for a user
// Query: ?userId=10001&category=reward&isRead=false
// Query: ?stats=true&userId=10001 — return mail stats
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const isStats = searchParams.get('stats') === 'true'
    const userId = Number(searchParams.get('userId'))
    const category = searchParams.get('category')
    const isReadParam = searchParams.get('isRead')

    if (!userId) {
      return NextResponse.json({ success: false, message: '缺少用户ID' }, { status: 400 })
    }

    // Stats endpoint
    if (isStats) {
      const stats = await refreshMailStats(userId)
      return NextResponse.json({
        success: true,
        data: stats,
        message: '邮件统计查询成功',
      })
    }

    // Build filter
    const where: Record<string, unknown> = {
      receiverId: userId,
      isDeleted: false,
    }
    if (category) where.category = category
    if (isReadParam !== null) where.isRead = isReadParam === 'true'

    const mails = await db.mail.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Refresh stats in background
    refreshMailStats(userId).catch(() => {})

    return NextResponse.json({
      success: true,
      data: mails,
      message: `查询到 ${mails.length} 封邮件`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询邮件失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// POST /api/ops/mail — Send mail (batch supported)
// Body: { receiverIds: number[], title, content, category, attachments?, senderType, senderName?, senderId?, expireAt? }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      receiverIds,
      title,
      content,
      category = 'system',
      attachments,
      senderType = 'system',
      senderName = '系统',
      senderId = 0,
      expireAt,
    } = body as {
      receiverIds: number[]
      title: string
      content: string
      category?: string
      attachments?: string
      senderType?: string
      senderName?: string
      senderId?: number
      expireAt?: string
    }

    if (!receiverIds?.length || !title) {
      return NextResponse.json({ success: false, message: '缺少收件人列表或邮件标题' }, { status: 400 })
    }

    const attachmentsStr = typeof attachments === 'string' ? attachments : JSON.stringify(attachments ?? [])
    const expireAtDate = expireAt ? new Date(expireAt) : null

    // Batch create mails
    const mailData = receiverIds.map((receiverId: number) => ({
      mailUid: `mail_${randomUUID().slice(0, 12)}`,
      senderType,
      senderId,
      senderName,
      receiverId,
      category,
      title,
      content,
      attachments: attachmentsStr,
      expireAt: expireAtDate,
    }))

    // SQLite has a limit on batch inserts; split if needed
    const BATCH_SIZE = 100
    let created = 0
    for (let i = 0; i < mailData.length; i += BATCH_SIZE) {
      const result = await db.mail.createMany({
        data: mailData.slice(i, i + BATCH_SIZE),
      })
      created += result.count
    }

    // Refresh stats for all recipients
    for (const receiverId of receiverIds) {
      refreshMailStats(receiverId).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      data: { sentCount: created, receiverIds },
      message: `成功发送 ${created} 封邮件`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '发送邮件失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// PUT /api/ops/mail — Mail actions
// Body: { action: 'read', mailId }          — mark as read
// Body: { action: 'claim', mailId }         — claim reward
// Body: { action: 'batch_read', mailIds }   — batch mark as read
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ success: false, message: '缺少操作类型' }, { status: 400 })
    }

    // ── Mark single mail as read ──
    if (action === 'read') {
      const { mailId } = body as { mailId: number }

      if (!mailId) {
        return NextResponse.json({ success: false, message: '缺少邮件ID' }, { status: 400 })
      }

      const mail = await db.mail.update({
        where: { id: mailId },
        data: { isRead: true },
      })

      refreshMailStats(mail.receiverId).catch(() => {})

      return NextResponse.json({
        success: true,
        data: mail,
        message: '邮件已标记为已读',
      })
    }

    // ── Claim reward from mail ──
    if (action === 'claim') {
      const { mailId } = body as { mailId: number }

      if (!mailId) {
        return NextResponse.json({ success: false, message: '缺少邮件ID' }, { status: 400 })
      }

      const mail = await db.mail.findUnique({ where: { id: mailId } })

      if (!mail) {
        return NextResponse.json({ success: false, message: '邮件不存在' }, { status: 404 })
      }

      if (mail.isClaimed) {
        return NextResponse.json({ success: false, message: '奖励已领取' }, { status: 400 })
      }

      if (mail.category !== 'reward') {
        return NextResponse.json({ success: false, message: '该邮件无奖励可领取' }, { status: 400 })
      }

      const updated = await db.mail.update({
        where: { id: mailId },
        data: {
          isRead: true,
          isClaimed: true,
          claimedAt: new Date(),
        },
      })

      refreshMailStats(mail.receiverId).catch(() => {})

      return NextResponse.json({
        success: true,
        data: {
          mail: updated,
          claimedAttachments: JSON.parse(updated.attachments),
        },
        message: '奖励领取成功',
      })
    }

    // ── Batch mark as read ──
    if (action === 'batch_read') {
      const { mailIds } = body as { mailIds: number[] }

      if (!mailIds?.length) {
        return NextResponse.json({ success: false, message: '缺少邮件ID列表' }, { status: 400 })
      }

      const result = await db.mail.updateMany({
        where: { id: { in: mailIds }, isRead: false },
        data: { isRead: true },
      })

      // Find receiverIds to refresh their stats
      const mails = await db.mail.findMany({
        where: { id: { in: mailIds } },
        select: { receiverId: true },
        distinct: ['receiverId'],
      })

      for (const m of mails) {
        refreshMailStats(m.receiverId).catch(() => {})
      }

      return NextResponse.json({
        success: true,
        data: { updatedCount: result.count },
        message: `已将 ${result.count} 封邮件标记为已读`,
      })
    }

    return NextResponse.json({ success: false, message: '未知操作类型' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '邮件操作失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// DELETE /api/ops/mail — Soft delete mails
// Body: { action: 'soft_delete', mailIds: number[] }
export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const { action, mailIds } = body as { action: string; mailIds: number[] }

    if (action !== 'soft_delete' || !mailIds?.length) {
      return NextResponse.json({ success: false, message: '缺少操作类型或邮件ID列表' }, { status: 400 })
    }

    const result = await db.mail.updateMany({
      where: { id: { in: mailIds }, isDeleted: false },
      data: { isDeleted: true },
    })

    // Find receiverIds to refresh their stats
    const mails = await db.mail.findMany({
      where: { id: { in: mailIds } },
      select: { receiverId: true },
      distinct: ['receiverId'],
    })

    for (const m of mails) {
      refreshMailStats(m.receiverId).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
      message: `已软删除 ${result.count} 封邮件`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除邮件失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
