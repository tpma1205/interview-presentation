import {
  overallLateRate,
  rankByTotalLate,
  rankByMeanRate,
  rankByBayes,
} from './src/analysis.js';
import { contractors, CONFIDENCE_M } from './data/contractors.js';
import { before, after, DEADLINE_DAY } from './data/payments.js';

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- navigation ---------- */
const slides = [...document.querySelectorAll('.slide')];
const navLinks = new Map([...document.querySelectorAll('[data-nav]')].map((a) => [a.dataset.nav, a]));
const progress = document.getElementById('nav-progress');
let activeIndex = 0;

function setActive(index) {
  if (index === activeIndex && navLinks.get(slides[index].id)?.classList.contains('is-active')) return;
  activeIndex = index;
  const id = slides[index].id;
  navLinks.forEach((a, key) => a.classList.toggle('is-active', key === id));
  progress.textContent = `${index + 1} / ${slides.length}`;
  if (location.hash !== `#${id}`) history.replaceState(null, '', `#${id}`);
}

const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActive(slides.indexOf(visible.target));
  },
  { threshold: [0.5, 0.75] },
);
slides.forEach((s) => observer.observe(s));

function goTo(index) {
  const next = Math.min(Math.max(index, 0), slides.length - 1);
  slides[next].scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
}

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(e.key)) { e.preventDefault(); goTo(activeIndex + 1); }
  if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); goTo(activeIndex - 1); }
  if (e.key === 'Home') { e.preventDefault(); goTo(0); }
  if (e.key === 'End') { e.preventDefault(); goTo(slides.length - 1); }
});

// initial position from hash
const initial = slides.findIndex((s) => `#${s.id}` === location.hash);
if (initial > 0) requestAnimationFrame(() => slides[initial].scrollIntoView({ behavior: 'auto' }));

/* ---------- payment timing chart ---------- */
const labels = before.map((_, i) => i + 1);

function barColors(dist) {
  return dist.map((_, i) => (i + 1 <= DEADLINE_DAY ? css('--teal') : css('--rust')));
}

// 期限線與逾期區底色
const deadlinePlugin = {
  id: 'deadline',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    const xAfter = scales.x.getPixelForValue(DEADLINE_DAY - 1) + (scales.x.getPixelForValue(DEADLINE_DAY) - scales.x.getPixelForValue(DEADLINE_DAY - 1)) / 2;
    ctx.save();
    ctx.fillStyle = css('--rust-tint');
    ctx.fillRect(xAfter, chartArea.top, chartArea.right - xAfter, chartArea.bottom - chartArea.top);
    ctx.strokeStyle = css('--ink');
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xAfter, chartArea.top);
    ctx.lineTo(xAfter, chartArea.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = css('--ink');
    ctx.font = `500 13px ${css('--font-cjk')}`;
    ctx.textAlign = 'right';
    ctx.fillText('繳費期限 第 14 天', xAfter - 8, chartArea.top + 16);
    ctx.textAlign = 'left';
    ctx.fillStyle = css('--rust');
    const overdue = chart.data.datasets[0].data.slice(DEADLINE_DAY).reduce((s, x) => s + x, 0);
    ctx.fillText('逾期', xAfter + 8, chartArea.top + 16);
    ctx.font = `700 28px ${css('--font-latin')}`;
    ctx.fillText(`${Math.round(overdue * 10) / 10}%`, xAfter + 8, chartArea.top + 52);
    ctx.restore();
  },
};

function makeChart(canvasId, dist) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !window.Chart) return null;
  return new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: dist,
        backgroundColor: barColors(dist),
        borderRadius: 2,
        barPercentage: 0.8,
        categoryPercentage: 0.9,
      }],
    },
    plugins: [deadlinePlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion ? false : { duration: 700 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: (items) => `開單後第 ${items[0].label} 天`,
            label: (item) => `${item.parsed.y}% 的案件在這天繳費`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: '開單後天數', color: css('--slate') },
          grid: { display: false },
          ticks: { color: css('--slate'), font: { family: css('--font-latin') }, maxRotation: 0, autoSkip: true },
        },
        y: {
          title: { display: true, text: '案件佔比', color: css('--slate') },
          grid: { color: css('--line') },
          border: { display: false },
          ticks: { color: css('--slate'), font: { family: css('--font-latin') }, callback: (v) => `${v}%` },
          suggestedMax: 26,
        },
      },
    },
  });
}

makeChart('chart-before', before);
const toggleChart = makeChart('chart-after', before);

document.querySelectorAll('.toggle-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
    if (!toggleChart) return;
    const dist = btn.dataset.phase === 'after' ? after : before;
    toggleChart.data.datasets[0].data = dist;
    toggleChart.update();
  });
});

/* ---------- 2-4 method comparison ---------- */
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const c = overallLateRate(contractors);

const rawBody = document.getElementById('raw-body');
if (rawBody) {
  rawBody.innerHTML = contractors
    .map((x) => `<tr><td>${x.name}</td><td>${x.filings}</td><td>${x.late}</td><td>${pct(x.late / x.filings)}</td></tr>`)
    .join('');
}

const methods = [
  {
    title: '總逾期次數',
    formula: '逾期件數',
    rows: rankByTotalLate(contractors),
    fmt: (s) => `${s} 件`,
    flaw: '申報量大的業者永遠排前面。業者 A 逾期率只有 10%，卻因為件數多而居首。',
  },
  {
    title: '算術平均逾期率',
    formula: '逾期件數 ÷ 申報件數',
    rows: rankByMeanRate(contractors),
    fmt: pct,
    flaw: '樣本太少的業者被放大。業者 B 只申報 2 件就變成 100%。',
  },
  {
    title: '貝氏平均逾期率',
    formula: `(v·r + m·c) ÷ (v + m)，m = ${CONFIDENCE_M}，c = ${pct(c)}`,
    rows: rankByBayes(contractors, CONFIDENCE_M, c),
    fmt: pct,
    flaw: '樣本少的向全體平均靠攏，樣本多的回歸自己的表現。業者 C 逾期率 40%、申報 60 件，才是該宣導的對象。',
    chosen: true,
  },
];

const methodsEl = document.getElementById('methods');
if (methodsEl) {
  methodsEl.innerHTML = methods
    .map(
      (m) => `
      <div class="method${m.chosen ? ' is-chosen' : ''}">
        <p class="method-title">${m.title}</p>
        <p class="method-formula">${m.formula}</p>
        <ol class="rank">
          ${m.rows
            .map(
              (r, i) => `<li><span class="rank-pos">${i + 1}</span><span class="rank-name">${r.name}</span><span class="rank-score">${m.fmt(r.score)}</span></li>`,
            )
            .join('')}
        </ol>
        <p class="method-flaw">${m.flaw}</p>
      </div>`,
    )
    .join('');
}
