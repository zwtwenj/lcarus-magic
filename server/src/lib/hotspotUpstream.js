const config = require('./config');

const DIGIT8 = /^\d{8}$/;

function isRealCalendarYmd(s) {
  if (!DIGIT8.test(s)) return false;
  const y = parseInt(s.slice(0, 4), 10);
  const m = parseInt(s.slice(4, 6), 10);
  const d = parseInt(s.slice(6, 8), 10);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * @param {unknown} raw 查询参数 date
 * @returns {{ ok: true, date: string } | { ok: false, message: string }}
 */
function resolveDateParam(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return { ok: true, date: todayYmd() };
  }
  const s = String(raw).trim();
  if (!isRealCalendarYmd(s)) {
    return { ok: false, message: 'date 须为有效日历 YYYYMMDD，例如 20260320' };
  }
  return { ok: true, date: s };
}

/**
 * 从上游拉取热点数据（与 http://47.110.47.101:9400/?date=YYYYMMDD 一致）
 * @param {string} dateYmd
 */
async function fetchHotspotFromUpstream(dateYmd) {
  const base = String(config.hotspotUpstreamUrl || '').replace(/\/$/, '');
  const url = `${base}/?date=${encodeURIComponent(dateYmd)}`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 30_000);

  let res;
  try {
    res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/plain;q=0.9, */*;q=0.8',
      },
    });
  } finally {
    clearTimeout(t);
  }
  console.log('res', res);
  const contentType = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());

  return { status: res.status, contentType, body: buf };
}

module.exports = {
  todayYmd,
  resolveDateParam,
  fetchHotspotFromUpstream,
};
