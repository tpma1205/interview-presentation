import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bayesianAverage,
  overallLateRate,
  rankByTotalLate,
  rankByMeanRate,
  rankByBayes,
  sumPercent,
  overdueShare,
  peakDays,
} from '../src/analysis.js';
import { contractors, CONFIDENCE_M } from '../data/contractors.js';
import { before, after, DEADLINE_DAY } from '../data/payments.js';

test('bayesianAverage: no observations → global mean', () => {
  assert.equal(bayesianAverage({ v: 0, r: 0.9, m: 20, c: 0.15 }), 0.15);
});

test('bayesianAverage: m = 0 → raw rate', () => {
  assert.equal(bayesianAverage({ v: 5, r: 0.4, m: 0, c: 0.15 }), 0.4);
});

test('bayesianAverage: formula matches hand calculation', () => {
  // (60·0.4 + 20·0.155) / 80 = 27.1 / 80
  const w = bayesianAverage({ v: 60, r: 0.4, m: 20, c: 0.155 });
  assert.ok(Math.abs(w - 27.1 / 80) < 1e-12);
});

test('five contractors: each ranking method puts a different contractor first', () => {
  const c = overallLateRate(contractors);
  const first = (rows) => rows[0].name;
  const byTotal = first(rankByTotalLate(contractors));
  const byMean = first(rankByMeanRate(contractors));
  const byBayes = first(rankByBayes(contractors, CONFIDENCE_M, c));
  assert.equal(new Set([byTotal, byMean, byBayes]).size, 3);
  // design intent: total → 大戶, mean → 小樣本, bayes → 真正該宣導的對象
  assert.equal(byTotal, '業者 A');
  assert.equal(byMean, '業者 B');
  assert.equal(byBayes, '業者 C');
});

test('payment timing distributions sum to 100%', () => {
  assert.ok(Math.abs(sumPercent(before) - 100) < 0.01);
  assert.ok(Math.abs(sumPercent(after) - 100) < 0.01);
});

test('overdue share is 3% before and 0.2% after', () => {
  assert.ok(Math.abs(overdueShare(before, DEADLINE_DAY) - 3) < 0.01);
  assert.ok(Math.abs(overdueShare(after, DEADLINE_DAY) - 0.2) < 0.01);
});

test('both distributions peak on day 1 and day 14', () => {
  assert.deepEqual(peakDays(before, 2), [1, 14]);
  assert.deepEqual(peakDays(after, 2), [1, 14]);
});
