## 部署操作手冊（2025-11-21）

> 本手冊記錄目前線上環境的完整佈署流程與設定值，確保後續接手人員可以「照表抄功課」完成更新。

---

### 1. 系統總覽
- **Frontend**：Vite + React + Tailwind，部署在 **Vercel** 專案 `fashion-movielist`（Org：`kk750509-gmailcoms-projects`），域名 `https://fashion-movielist.vercel.app/`。
- **Backend**：Node.js (Express) API，部署在 **Render** Web Service `movie-selection-api`（region: Singapore）。
- **Database/Auth/Storage**：Supabase 專案 `fewmoqevsxswvzfwedbc`。
- **Email**：Microsoft Graph API（Azure AD App）。

```
Client (Vercel) ──(HTTPS /api/*)──> Render API ──> Supabase & Graph API
```

---

### 2. 前端（Vercel）部署流程
1. **確保本機已安裝 Vercel CLI 並登入**
   ```bash
   npm install -g vercel
   vercel login
   ```
2. **切換到專案根目錄並確認 `.vercel/project.json`**
   ```json
   {"projectId":"prj_FCeqZjzpjDzvGwevMYfcjjnxnL0R","orgId":"team_caUFxu9aD7LF1UXOy95LqRku"}
   ```
3. **環境變數（Vercel → Settings → Environment Variables）**

| Key | Value | Environments |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `https://fewmoqevsxswvzfwedbc.supabase.co` | Prod / Preview / Dev |
| `VITE_SUPABASE_ANON_KEY` | 參考 SafeNote《Supabase Keys》中 `VITE_SUPABASE_ANON_KEY` | Prod / Preview / Dev |
| `VITE_API_URL` | `https://movie-selection-api.onrender.com` | Prod / Preview / Dev |

4. **部署指令**
   ```bash
   vercel deploy --prod --yes
   ```
5. **驗證**
   - 造訪 `https://fashion-movielist.vercel.app/`
   - F12 → Network → 確認 API 請求指向 `movie-selection-api.onrender.com`

---

### 3. 後端（Render）部署流程
1. **Render Web Service 設定**
   - 名稱：`movie-selection-api`
   - Repo：`https://github.com/LucasL59/Fashion_movielist`
   - Root：`backend/`
   - Build Command：`cd backend && npm install`
   - Start Command：`cd backend && npm start`
   - Region：Singapore
   - Plan：Starter（可自動休眠，需綁定信用卡）

2. **環境變數（Render → Dashboard → Environment）**

| Key | Value |
| --- | --- |
| `PORT` | `3000` |
| `NODE_ENV` | `development` |
| `SUPABASE_URL` | `https://fewmoqevsxswvzfwedbc.supabase.co` |
| `SUPABASE_SERVICE_KEY` | 參考 SafeNote《Supabase Keys》中 `SERVICE_ROLE` | 
| `SUPABASE_ANON_KEY` | 同上 `ANON_KEY` |
| `AZURE_CLIENT_ID` | `110a9f1f-bc53-44b4-b27e-fe138d400a05` |
| `AZURE_CLIENT_SECRET` | 參考 SafeNote《Azure Graph API》中的 `CLIENT_SECRET` |
| `AZURE_TENANT_ID` | `134d4e1c-cf6e-4aec-9876-23add86b1cf1` |
| `ADMIN_EMAIL` | `lucas@fas.com.tw` |
| `FRONTEND_URL` | `https://fashion-movielist.vercel.app` |
| `REMINDER_CRON_SCHEDULE` | `0 9 1 * *` |

3. **健康檢查**
   ```bash
   curl https://movie-selection-api.onrender.com/health
   # {"status":"ok","timestamp":"2025-11-21T12:22:56.565Z","service":"Movie Selection API"}
   ```

4. **CI/CD**
   - Render 已啟用「Auto deploy on commit to main」。
   - 若需要暫停，至 Dashboard → Settings → Auto-Deploy 關閉即可。

---

### 4. Supabase 設定重點
1. **資料表與 RLS**
   - `profiles`：儲存角色（admin / uploader / customer）
   - `batches`：影片批次（新增 `month` 欄位）
   - `videos`：影片細節（含 `thumbnail_url`）
   - `selections`：客戶選擇紀錄
   - RLS Policy 需載入 `database/schema.sql`，確保 `is_admin()` 函數與角色政策一致。

2. **Storage**
   - Bucket：`thumbnails`
   - 必須設為 Public，否則前端無法載入圖片。

3. **服務金鑰**
   - `SUPABASE_SERVICE_KEY` 用於後端（Server Role）
   - `SUPABASE_ANON_KEY` 用於前端

---

### 5. Microsoft Graph 設定
| 項目 | 值 |
| --- | --- |
| Tenant ID | `134d4e1c-cf6e-4aec-9876-23add86b1cf1` |
| Client ID | `110a9f1f-bc53-44b4-b27e-fe138d400a05` |
| Client Secret | 參考 SafeNote《Azure Graph API》中的 `CLIENT_SECRET` |
| 授權流程 | Client Credentials (Mail.Send, User.Read.All 等) |

需在 Azure Portal → App registrations → API Permissions 內確認 `Mail.Send` 已授權並 admin consent。

---

### 6. 常用指令速查
```bash
# 前端 (Vercel)
vercel env ls
vercel env add VITE_API_URL production
vercel deploy --prod --yes

# 後端 (Render CLI - optional)
render services:list
render deploys:list srv-d4g4lc9r0fns738iqo7g

# 健康檢查
curl https://movie-selection-api.onrender.com/health
```

---

### 7. 更新流程建議
1. **修改程式**
   - 後端：變更 `backend/`，push 到 `main` 即自動觸發 Render deploy。
   - 前端：變更 `frontend/`，手動執行 `vercel deploy --prod --yes`。
2. **調整環境變數**
   - Render 與 Vercel 都需同步更新（尤其 API URL / Supabase Key）。
3. **驗證**
   - Render `/health`
   - Vercel 前端操作流程（登入、上傳、選擇）

---

### 8. 故障排查
| 症狀 | 檢查方向 |
| --- | --- |
| Vercel 前端顯示無法連線 | 確認 `VITE_API_URL` 是否指向正常的 Render URL，並重新部署前端 |
| Render API 回 404 | 確認服務是否在休眠 / redeploy 中，或 health check path 是否設為 `/health` |
| 寄信失敗 | 確認 Azure 客戶端憑證是否過期、Graph API 權限是否有 Mail.Send |
| Excel 圖片缺失 | 檢查 `excelService.js` log、Supabase Storage 是否允許 public access |

---

### 9. 聯絡方式
- **主要聯絡人**：`lucas@fas.com.tw`
- **備註**：若需更換環境（例如改用 Railway/Fly.io），請同步更新本文件與 `.env` 範例，以免部署過程遺漏。

---

_最後更新：2025-11-21 20:30 (UTC+8)_  
_維護人：GPT-5.1 Codex_

