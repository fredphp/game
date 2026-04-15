import { NextRequest, NextResponse } from 'next/server';

const SEASON_SERVICE = 'http://127.0.0.1:9008';
const API_KEY = 'season-service-internal-key-2024';

// Helper to proxy requests to season-service
async function proxyRequest(path: string, options?: RequestInit) {
  const url = `${SEASON_SERVICE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Internal-Api-Key': API_KEY,
    'X-Caller-Service': 'admin-panel',
    ...(options?.headers as Record<string, string> || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { code: 10004, message: '赛季服务不可用', data: null },
      { status: 200 }
    );
  }
}

// GET /api/season - List seasons or get current season
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'current') {
    const serverId = searchParams.get('server_id') || '0';
    return proxyRequest(`/api/v1/season/current?server_id=${serverId}`);
  }

  if (action === 'stats' && searchParams.get('id')) {
    return proxyRequest(`/admin/season/${searchParams.get('id')}/stats`);
  }

  if (action === 'rankings' && searchParams.get('id')) {
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '20';
    return proxyRequest(`/api/v1/season/${searchParams.get('id')}/rankings?page=${page}&page_size=${pageSize}`);
  }

  if (action === 'rewards' && searchParams.get('id')) {
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('page_size') || '20';
    return proxyRequest(`/api/v1/season/${searchParams.get('id')}/rewards?page=${page}&page_size=${pageSize}`);
  }

  if (action === 'reward-config') {
    const seasonNum = searchParams.get('season_num') || '0';
    return proxyRequest(`/admin/season/reward/list?season_num=${seasonNum}`);
  }

  // Default: list seasons
  const serverId = searchParams.get('server_id') || '0';
  const status = searchParams.get('status') || '-1';
  const page = searchParams.get('page') || '1';
  const pageSize = searchParams.get('page_size') || '20';
  return proxyRequest(`/api/v1/season/list?server_id=${serverId}&status=${status}&page=${page}&page_size=${pageSize}`);
}

// POST /api/season - Create season, start, settle, etc.
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  switch (action) {
    case 'create':
      return proxyRequest('/admin/season/create', {
        method: 'POST',
        body: JSON.stringify({
          name: body.name,
          server_id: body.server_id || 0,
          duration_days: body.duration_days || 60,
        }),
      });
    case 'start':
      return proxyRequest(`/admin/season/${body.season_id}/start`, { method: 'POST' });
    case 'settle':
      return proxyRequest(`/admin/season/${body.season_id}/settle`, {
        method: 'POST',
        body: JSON.stringify({ season_id: body.season_id }),
      });
    case 'force-end':
      return proxyRequest(`/admin/season/${body.season_id}/force-end`, { method: 'POST' });
    case 'create-reward':
      return proxyRequest('/admin/season/reward/create', {
        method: 'POST',
        body: JSON.stringify({
          season_num: body.season_num || 0,
          rank_min: body.rank_min,
          rank_max: body.rank_max || 0,
          reward_type: body.reward_type,
          reward_id: body.reward_id || 0,
          amount: body.amount,
          title: body.title || '',
        }),
      });
    default:
      return NextResponse.json({ code: 10001, message: '未知操作' });
  }
}

// DELETE /api/season - Delete reward config
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rewardId = searchParams.get('reward_id');

  if (rewardId) {
    return proxyRequest(`/admin/season/reward/${rewardId}`, { method: 'DELETE' });
  }

  return NextResponse.json({ code: 10001, message: '缺少参数' });
}
