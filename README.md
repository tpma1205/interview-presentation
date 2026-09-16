# 面試簡報：新北市營建工程空污費徵收專案

陳映安 Alan ｜ 數據產品經理面試用的靜態簡報網站。

線上網址：https://tpma1205.github.io/interview-presentation/

## 內容

- **專案篇**（1-1 ～ 1-3）：專案與平台流程、團隊組織、我的角色
- **分析篇**（2-1 ～ 2-2）：逾期繳費的難點及解決方案（雙峰分布 → 3% 降至 0.2%）、逾期申報宣導對象問題（總次數 → 算術平均 → 貝氏平均）

貝氏平均的互動模擬工具是另一個獨立專案：https://tpma1205.github.io/NTPC_SimBayes/

## 操作

- 滑鼠捲動或 ← → ↑ ↓ / PageUp / PageDown 切換節；導覽列可直接點擊
- 網址 hash（例如 `#2-2`）可直接定位到該節
- 2-1 的「改善前 / 改善後」按鈕切換圖表

## 結構

```
index.html        頁面內容（5 節）
style.css         樣式（CSS 變數定義色系與字體）
app.js            導覽、圖表、2-2 排名渲染
src/analysis.js   純函數：貝氏平均、三種排名、分布驗證
data/             示意數據（繳費時點分布、示範業者）
assets/           模擬工具預覽圖
test/             node:test 測試
package.json      僅用於 npm test（無相依套件）
docs/SPEC.md      需求規格
docs/DESIGN.md    設計筆記
CONTEXT.md        領域詞彙
```

純 HTML / CSS / JavaScript，Chart.js 經 CDN 載入，無建置流程。

## 本機

```bash
npm test
```

```bash
python -m http.server 8765
```

## 數據說明

所有圖表數據皆為程式生成的示意數據，僅保留實際觀察到的分布形狀與比例，不含任何真實業者資料。
