# 如何用 API 拿到我的信用卡資料

## 結論先講

| 方式 | 支援 Chase / Amex / Capital One | 費用（個人） | 難度 | 本專案 |
|---|---|---|---|---|
| **CSV 匯入** | ✅ 全部（官網下載） | 免費 | ⭐ | ✅ 已實作 |
| **SimpleFIN Bridge** | ✅（背後透過 MX） | 約 $15/年 | ⭐⭐ | ✅ 已實作（`server/index.mjs`） |
| Teller | ✅ | 開發者方案有免費額度 | ⭐⭐⭐（需 mTLS 憑證） | 未實作，可擴充 |
| Plaid | ✅ | Sandbox 免費；正式環境需申請 | ⭐⭐⭐⭐ | 未實作，可擴充 |
| 銀行官方 API | ❌ 不開放給個人 | — | — | — |

**建議**：先用 CSV（零設定），想自動化再用 SimpleFIN。

## 為什麼不能直接接銀行？

- **Chase、American Express、Capital One 都沒有開放給個人開發者的 API。**
  - Capital One DevExchange 只開放給合作夥伴。
  - Chase、Amex 只透過 OAuth 授權給 Plaid、MX、Finicity、Akoya 這類資料聚合商（使用 FDX 標準）。
- 所以個人只能透過聚合商（Plaid / Teller / SimpleFIN）或手動下載 CSV。

## ⚠️ 重要限制：沒有任何 API 會告訴你「benefit 用了多少」

聚合商只提供**交易紀錄、餘額、帳單資訊**，沒有 Amex App 裡的「Benefits 進度條」或 Uber Cash 餘額。
本專案的做法是**從交易推算**：

1. 比對商家名稱：例如 Gold 卡在本月有 `DUNKIN` 消費 $4.25 → Dunkin' credit 已用 $4.25。
   比對規則寫在 `src/data/cards.ts` 每個 benefit 的 `merchantPatterns`。
2. 無法從交易看出的項目（Uber Cash、Marriott Free Night、DashPass 啟用）標為 `manualOnly`，在 App 裡手動勾選。

## 方法 1：CSV 匯入（已實作）

| 銀行 | 下載路徑 | 金額格式 |
|---|---|---|
| Chase | 帳戶 → Download account activity → CSV | 消費為**負數** |
| Amex | Statements & Activity → Download → CSV | 消費為正數 |
| Capital One | Transactions → Download Transactions → CSV | Debit / Credit 分欄 |

解析器（`src/lib/csv.ts`）會自動判斷欄位與正負號，並在重複匯入時去重。所有處理都在瀏覽器內完成。

## 方法 2：SimpleFIN Bridge（已實作）

[SimpleFIN](https://www.simplefin.org/protocol.html) 是給個人用的唯讀銀行資料協定，很多開源記帳工具（Actual Budget 等）都用它。

```
你 ──(在 bridge 網站連結銀行)──▶ SimpleFIN Bridge ──▶ Setup Token
Setup Token ──(貼進 App)──▶ 本機 server/index.mjs ──POST claim──▶ Access URL（存在 server/.data，不進瀏覽器）
App 按「同步」──▶ 本機 server ──GET /accounts──▶ 交易 JSON ──▶ 自動偵測 benefit
```

步驟：
1. 到 https://beta-bridge.simplefin.org 註冊並連結 Chase、Amex、Capital One。
2. 建立 App 連線，複製 **Setup Token**（只能用一次）。
3. 本機執行：
   ```bash
   npm install
   npm run build
   npm run server     # http://localhost:8787
   ```
4. App →「交易同步」→ 貼上 Token →「連結」→「同步交易」。
5. 第一次同步後，把每個帳戶對應到你的卡片，再同步一次。

安全性：Access URL 等於銀行資料的唯讀金鑰，只存在你電腦的 `server/.data/simplefin.json`（權限 600，已列入 `.gitignore`）。伺服器預設只綁定 `127.0.0.1`。

## 方法 3：Plaid（之後可擴充）

- 產品：`Transactions`（交易）+ `Liabilities`（帳單金額、最低應繳、繳款日 → 可以做繳款提醒）。
- 流程：後端建立 `link_token` → 前端 Plaid Link 登入銀行 → `public_token` 換 `access_token` → `/transactions/sync`。
- 個人使用的缺點：正式環境（Production）需要申請並通過審核；Chase 等銀行走 OAuth，需額外註冊 redirect URI。
- 適合未來想做成給別人用的產品時採用。

## 方法 4：Teller（之後可擴充）

- 直接支援 Chase、Amex、Capital One，API 簡單（REST + mTLS 客戶端憑證）。
- 開發者方案有免費的連線數額度（以官網為準），對個人非常夠用。
- 擴充方式：在 `server/index.mjs` 加一個 `/api/teller/*`，用 Teller Connect 拿 access token 後呼叫 `GET /accounts/{id}/transactions`，輸出與 SimpleFIN 相同格式即可。

## 安全提醒

- 不要把銀行密碼、Access URL、API key commit 到 GitHub（`.gitignore` 已排除 `server/.data` 與 `.env`）。
- 部署到 GitHub Pages 的版本是純前端，**不包含後端**，所以只能用 CSV；自動同步請在本機跑後端。
