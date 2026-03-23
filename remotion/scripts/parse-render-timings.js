#!/usr/bin/env node
/**
 * 解析 Remotion 渲染日志中的 delayRender "cleared after Xms"，统计耗时分布和耗时最多的地方。
 * 用法: node parse-render-timings.js < log.txt  或  node parse-render-timings.js log.txt
 */

const fs = require('fs');
const path = require('path');

function readInput() {
  const p = process.argv[2];
  if (p && fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  try {
    const stdin = require('fs').readFileSync(0, 'utf8');
    if (stdin && stdin.length > 100) return stdin;
  } catch (_) {}
  console.error('用法: node parse-render-timings.js < 日志文件 或 node parse-render-timings.js 日志文件路径');
  process.exit(1);
}

const text = readInput();

// 匹配: Tab N, ... "Setting the current frame to M" handle was cleared after Xms
const re = /Tab\s+(\d+).*?frame to (\d+).*?after (\d+)ms/g;
const rows = [];
let m;
while ((m = re.exec(text)) !== null) {
  rows.push({ tab: parseInt(m[1], 10), frame: parseInt(m[2], 10), ms: parseInt(m[3], 10) });
}

if (rows.length === 0) {
  console.log('未匹配到任何 "handle was cleared after Xms" 行');
  process.exit(1);
}

const allMs = rows.map((r) => r.ms);
const sum = allMs.reduce((a, b) => a + b, 0);
const avg = sum / allMs.length;
const min = Math.min(...allMs);
const max = Math.max(...allMs);
const sorted = [...allMs].sort((a, b) => a - b);
const p50 = sorted[Math.floor(sorted.length * 0.5)];
const p90 = sorted[Math.floor(sorted.length * 0.9)];
const p95 = sorted[Math.floor(sorted.length * 0.95)];
const p99 = sorted[Math.floor(sorted.length * 0.99)];

console.log('========== 整体耗时 ==========');
console.log('总次数:', rows.length);
console.log('总耗时:', (sum / 1000).toFixed(2), '秒');
console.log('平均每次:', avg.toFixed(1), 'ms');
console.log('最小:', min, 'ms  最大:', max, 'ms');
console.log('P50:', p50, 'ms  P90:', p90, 'ms  P95:', p95, 'ms  P99:', p99, 'ms');

// 按 Tab 汇总
const byTab = {};
rows.forEach((r) => {
  if (!byTab[r.tab]) byTab[r.tab] = { sum: 0, count: 0 };
  byTab[r.tab].sum += r.ms;
  byTab[r.tab].count += 1;
});
const tabTotals = Object.entries(byTab).map(([t, v]) => ({ tab: parseInt(t, 10), ...v }));
tabTotals.sort((a, b) => b.sum - a.sum);
console.log('\n========== 按 Tab 总耗时（从高到低）==========');
tabTotals.forEach((t) => {
  console.log(`Tab ${t.tab}: 总 ${(t.sum / 1000).toFixed(2)}s, 次数 ${t.count}, 平均 ${(t.sum / t.count).toFixed(1)}ms`);
});

// 耗时区间分布
const buckets = [
  [0, 1, '0-1ms'],
  [1, 35, '1-35ms'],
  [35, 50, '35-50ms'],
  [50, 80, '50-80ms'],
  [80, 150, '80-150ms'],
  [150, 300, '150-300ms'],
  [300, 1e6, '300ms+'],
];
const dist = buckets.map(([lo, hi, label]) => ({
  label,
  count: allMs.filter((ms) => ms >= lo && ms < hi).length,
}));
const distSum = dist.reduce((a, d) => a + d.count, 0);
console.log('\n========== 单次耗时分布 ==========');
dist.forEach((d) => {
  const pct = ((d.count / distSum) * 100).toFixed(1);
  const bar = '#'.repeat(Math.round(d.count / 10)) + ' '.repeat(50);
  console.log(`${d.label.padEnd(12)} ${d.count.toString().padStart(5)} 次 (${pct}%)`);
});

// 耗时最多的单次（前 20）
const topSingle = [...rows].sort((a, b) => b.ms - a.ms).slice(0, 20);
console.log('\n========== 单次耗时最高的 20 次 ==========');
topSingle.forEach((r, i) => {
  console.log(`${i + 1}. Tab ${r.tab} frame ${r.frame}: ${r.ms}ms`);
});

// 结论：耗时最多的地方
console.log('\n========== 结论：耗时最多的地方 ==========');
const totalSec = sum / 1000;
console.log('1. 整段日志的耗时几乎全部来自「Setting the current frame」的 delayRender 清除（即每帧渲染/合成时间）。');
console.log('2. 单次最慢:', max, 'ms (Tab', topSingle[0].tab, 'frame', topSingle[0].frame + ')。');
console.log('3. 按 Tab 看，总耗时最高的是 Tab', tabTotals[0].tab, `(约 ${(tabTotals[0].sum / 1000).toFixed(1)}s)。`);
const over80 = allMs.filter((ms) => ms >= 80).length;
const over80Sum = allMs.filter((ms) => ms >= 80).reduce((a, b) => a + b, 0);
console.log('4. 单次 ≥80ms 的次数:', over80, `，合计 ${(over80Sum / 1000).toFixed(1)}s，占整体 ${((over80Sum / sum) * 100).toFixed(1)}%。`);
console.log('5. 整体「Setting the current frame」阶段合计约', totalSec.toFixed(1), '秒。');
