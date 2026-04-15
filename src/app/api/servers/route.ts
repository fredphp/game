import { NextResponse } from 'next/server';

const servers = [
  {
    id: 1,
    name: 'S1-烽火连天',
    status: 1,
    statusText: '正常运行',
    openTime: '2024-06-01T10:00:00Z',
    region: 'cn',
    regionText: '国服',
    host: 's1.jiuzhou.game:9001',
    maxPlayers: 50000,
    onlineCount: 32856,
    playerCount: 45123,
  },
  {
    id: 2,
    name: 'S2-龙争虎斗',
    status: 1,
    statusText: '正常运行',
    openTime: '2024-06-15T10:00:00Z',
    region: 'cn',
    regionText: '国服',
    host: 's2.jiuzhou.game:9001',
    maxPlayers: 50000,
    onlineCount: 18432,
    playerCount: 28791,
  },
  {
    id: 3,
    name: 'S3-逐鹿中原',
    status: 2,
    statusText: '即将开服',
    openTime: '2025-01-20T10:00:00Z',
    region: 'cn',
    regionText: '国服',
    host: 's3.jiuzhou.game:9001',
    maxPlayers: 50000,
    onlineCount: 0,
    playerCount: 8421,
  },
  {
    id: 4,
    name: 'TW1-楚汉争霸',
    status: 1,
    statusText: '正常运行',
    openTime: '2024-07-01T10:00:00Z',
    region: 'tw',
    regionText: '台服',
    host: 'tw1.jiuzhou.game:9001',
    maxPlayers: 30000,
    onlineCount: 8923,
    playerCount: 15342,
  },
  {
    id: 5,
    name: 'S4-问鼎天下',
    status: 0,
    statusText: '维护中',
    openTime: '2024-08-01T10:00:00Z',
    region: 'cn',
    regionText: '国服',
    host: 's4.jiuzhou.game:9001',
    maxPlayers: 50000,
    onlineCount: 0,
    playerCount: 21034,
  },
  {
    id: 6,
    name: 'S5-三国鼎立',
    status: 3,
    statusText: '已关闭',
    openTime: '2024-03-01T10:00:00Z',
    region: 'cn',
    regionText: '国服',
    host: '',
    maxPlayers: 20000,
    onlineCount: 0,
    playerCount: 5689,
  },
];

export async function GET() {
  return NextResponse.json({ servers, total: servers.length });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, openTime, region } = body;

    const maxID = Math.max(...servers.map(s => s.id));
    const newServer = {
      id: maxID + 1,
      name: name || `S${maxID + 1}-新区`,
      status: 2,
      statusText: '即将开服',
      openTime: openTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      region: region || 'cn',
      regionText: region === 'tw' ? '台服' : region === 'sea' ? '东南亚' : '国服',
      host: `s${maxID + 1}.jiuzhou.game:9001`,
      maxPlayers: 50000,
      onlineCount: 0,
      playerCount: 0,
    };

    servers.push(newServer);
    return NextResponse.json({ success: true, server: newServer });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
