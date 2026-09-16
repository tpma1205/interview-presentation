// 純函數：不碰 DOM，頁面與測試共用。

/** 貝氏平均：w = (v·r + m·c) / (v + m) */
export function bayesianAverage({ v, r, m, c }) {
  if (v + m === 0) return c;
  return (v * r + m * c) / (v + m);
}

/** 單一業者的逾期率 r */
export function lateRate({ filings, late }) {
  return filings === 0 ? 0 : late / filings;
}

/** 全體平均逾期率 c：所有申報中逾期的比例 */
export function overallLateRate(rows) {
  const filings = rows.reduce((s, x) => s + x.filings, 0);
  const late = rows.reduce((s, x) => s + x.late, 0);
  return filings === 0 ? 0 : late / filings;
}

const desc = (key) => (a, b) => b[key] - a[key];

/** 方法一：總逾期次數 */
export function rankByTotalLate(rows) {
  return rows.map((x) => ({ ...x, score: x.late })).sort(desc('score'));
}

/** 方法二：算術平均逾期率 */
export function rankByMeanRate(rows) {
  return rows
    .map((x) => ({ ...x, score: lateRate(x) }))
    .sort(desc('score'));
}

/** 方法三：貝氏平均逾期率 */
export function rankByBayes(rows, m, c) {
  return rows
    .map((x) => ({
      ...x,
      score: bayesianAverage({ v: x.filings, r: lateRate(x), m, c }),
    }))
    .sort(desc('score'));
}

/** 分布陣列（index 0 = 第 1 天）的總和 */
export function sumPercent(dist) {
  return dist.reduce((s, x) => s + x, 0);
}

/** 期限日之後的佔比合計 */
export function overdueShare(dist, deadlineDay) {
  return dist.slice(deadlineDay).reduce((s, x) => s + x, 0);
}

/** 佔比最高的 n 個天數（1-based），由小到大排序 */
export function peakDays(dist, n) {
  return dist
    .map((value, i) => ({ day: i + 1, value }))
    .sort(desc('value'))
    .slice(0, n)
    .map((x) => x.day)
    .sort((a, b) => a - b);
}
