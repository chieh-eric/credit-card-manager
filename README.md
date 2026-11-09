# 💳 Card Benefits — 個人信用卡權益管理

追蹤每張信用卡的 credits 用了多少、在到期前提醒你，並告訴你每種消費該刷哪張卡。

支援卡片：Amex Gold、Chase Sapphire Preferred、Chase Freedom Unlimited、Hilton Honors Amex、Hilton Honors Amex Surpass、Capital One Venture X、Marriott Bonvoy Boundless。

## 功能

| 頁面 | 做什麼 |
|---|---|
| ✅ **總覽** | 依到期日排序的待辦：本月 Dining/Uber/Dunkin'、本季 Hilton $50、半年 Resy、週年 $300/$100/Free Night…；進度條、勾選完成、部分金額；年費入帳提醒 |
| 💳 **刷哪張** | 選消費類型 → 依「每 $1 回饋價值」排名，提示還沒用完的 credit；附完整「刷卡速查表」 |
| 🗂️ **我的卡** | 每張卡的年費、回饋倍率、credits、權益、保險、使用策略、資料來源、本卡年回本進度 |
| 🔄 **交易同步** | 匯入 CSV 或透過 SimpleFIN 自動同步 → 依商家名稱**自動偵測** benefit 使用量 |
| ⚙️ **設定** | 持有卡片、開卡日（計算週年 credit 與年費日）、點數價值、提醒天數、備份/還原 |

**提醒方式**
- 📆 **加入行事曆**：產生 `.ics`，未來 12 個月每個 credit 到期日都有事件，並在 N 天前提醒（最可靠，手機也會跳）。
- 🔔 **瀏覽器通知**：每天第一次打開網頁時通知快到期的項目。

## 快速開始

```bash
npm install
npm run dev          # http://localhost:5173
```

想用 SimpleFIN 自動同步銀行交易：

```bash
npm run server       # 另一個終端機，http://localhost:8787（Vite 會自動 proxy /api）
```

或打包後只跑一個服務：

```bash
npm run build && npm run server
```

測試：`npm test`

## 部署

push 到 `main` 會透過 GitHub Actions 自動測試並部署到 **GitHub Pages**（需在 repo Settings → Pages → Source 選 *GitHub Actions*）。
Pages 版本是純前端：資料存在瀏覽器 localStorage，可用 CSV 匯入；SimpleFIN 自動同步需在本機跑後端。

## 文件

- [`docs/CARDS.md`](docs/CARDS.md) — 7 張卡的年費、回饋、credits、權益完整整理 + 每月/每季待辦清單 + 刷卡策略
- [`docs/BANK_API.md`](docs/BANK_API.md) — 如何用 API 拿銀行資料（CSV / SimpleFIN / Plaid / Teller 比較）

## 專案結構

```
src/
  data/cards.ts        卡片資料（年費、倍率、credits、商家比對規則）← 權益改版時改這裡
  data/categories.ts   消費類別、預設點數價值
  lib/periods.ts       每月/每季/半年/週年/4 年 期間計算
  lib/benefits.ts      使用狀態、自動偵測、回本計算
  lib/recommend.ts     刷卡建議
  lib/csv.ts           Chase / Amex / Capital One CSV 解析
  lib/ics.ts           行事曆提醒匯出
  components/          React 介面
server/index.mjs       SimpleFIN 本機後端（零相依套件）
tests/                 Vitest 單元測試
```

## 隱私

- 所有使用紀錄存在你的瀏覽器，不會上傳。
- SimpleFIN 的 Access URL 只存在本機 `server/.data/`（已 gitignore）。

> ⚠️ 權益資料整理於 2026-11-09，發卡行可能隨時調整，請以官方 App 為準。
