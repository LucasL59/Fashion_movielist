# 安裝命令速查表

本文件提供所有安裝和啟動命令的快速參考。

## 📦 安裝依賴

### 後端依賴安裝

```bash
cd backend
npm install
```

**安裝的主要套件**:
- express (Web 框架)
- @supabase/supabase-js (Supabase 客戶端)
- @microsoft/microsoft-graph-client (Microsoft Graph API)
- @azure/msal-node (Azure AD 認證)
- exceljs (Excel 處理)
- express-fileupload (檔案上傳)
- node-cron (排程任務)
- helmet (安全性)
- cors (跨域請求)
- morgan (日誌)
- dotenv (環境變數)

### 前端依賴安裝

```bash
cd frontend
npm install
```

**安裝的主要套件**:
- react (UI 框架)
- react-dom (React DOM)
- react-router-dom (路由)
- @supabase/supabase-js (Supabase 客戶端)
- axios (HTTP 客戶端)
- lucide-react (圖示)
- tailwindcss (CSS 框架)
- vite (建置工具)

## 🚀 啟動命令

### 開發模式

#### 啟動後端（開發模式）
```bash
cd backend
npm run dev
```
- 使用 nodemon 自動重啟
- 監聽端口: 3000
- 支援熱重載

#### 啟動前端（開發模式）
```bash
cd frontend
npm run dev
```
- 使用 Vite 開發伺服器
- 監聽端口: 5173
- 支援 HMR（熱模組替換）

### 生產模式

#### 啟動後端（生產模式）
```bash
cd backend
npm start
```
- 使用 Node.js 直接執行
- 不支援熱重載

#### 建置前端（生產模式）
```bash
cd frontend
npm run build
```
- 建置輸出到 `dist/` 目錄
- 優化和壓縮程式碼

#### 預覽前端建置
```bash
cd frontend
npm run preview
```
- 預覽生產建置
- 監聽端口: 4173

## 🔧 其他命令

### 程式碼檢查

```bash
# 前端 ESLint 檢查
cd frontend
npm run lint
```

### 清理

```bash
# 清理 node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules

# 清理建置產物
rm -rf frontend/dist

# Windows 用戶使用：
# rmdir /s /q backend\node_modules
# rmdir /s /q frontend\node_modules
# rmdir /s /q frontend\dist
```

### 重新安裝

```bash
# 後端重新安裝
cd backend
rm -rf node_modules package-lock.json
npm install

# 前端重新安裝
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## 🐳 Docker 命令

### 建置 Docker 映像

```bash
cd backend
docker build -t movie-selection-api .
```

### 執行 Docker 容器

```bash
docker run -p 3000:3000 \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_KEY=your_key \
  -e SUPABASE_ANON_KEY=your_anon_key \
  -e AZURE_CLIENT_ID=your_client_id \
  -e AZURE_CLIENT_SECRET=your_secret \
  -e AZURE_TENANT_ID=your_tenant_id \
  -e ADMIN_EMAIL=your_email \
  -e FRONTEND_URL=http://localhost:5173 \
  movie-selection-api
```

### 使用 Docker Compose（可選）

建立 `docker-compose.yml`:

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    env_file:
      - ./backend/.env
    volumes:
      - ./backend:/app
      - /app/node_modules

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    env_file:
      - ./frontend/.env
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
```

啟動：
```bash
docker-compose up
```

## 📝 完整啟動流程

### 第一次啟動（完整步驟）

```bash
# 1. 安裝後端依賴
cd backend
npm install

# 2. 設定後端環境變數
cp .env.example .env
# 編輯 .env 填入正確的值

# 3. 啟動後端
npm run dev

# 4. 開啟新終端，安裝前端依賴
cd frontend
npm install

# 5. 設定前端環境變數
cp .env.example .env
# 編輯 .env 填入正確的值

# 6. 啟動前端
npm run dev

# 7. 開啟瀏覽器訪問 http://localhost:5173
```

### 日常開發啟動

```bash
# 終端 1 - 後端
cd backend
npm run dev

# 終端 2 - 前端
cd frontend
npm run dev
```

## 🔍 驗證安裝

### 檢查後端

```bash
# 檢查後端健康狀態
curl http://localhost:3000/health

# 預期輸出：
# {"status":"ok","timestamp":"...","service":"Movie Selection API"}
```

### 檢查前端

1. 開啟瀏覽器訪問 http://localhost:5173
2. 應該看到登入頁面
3. 檢查瀏覽器控制台沒有錯誤

### 檢查依賴版本

```bash
# 檢查 Node.js 版本
node --version
# 應該是 v18 或更高

# 檢查 npm 版本
npm --version
# 應該是 v9 或更高

# 檢查後端依賴
cd backend
npm list --depth=0

# 檢查前端依賴
cd frontend
npm list --depth=0
```

## 🐛 常見問題

### 問題：端口已被佔用

```bash
# Windows - 查找佔用端口的程序
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# 殺死程序（替換 PID）
taskkill /PID <PID> /F

# macOS/Linux - 查找並殺死程序
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### 問題：node_modules 損壞

```bash
# 刪除並重新安裝
rm -rf node_modules package-lock.json
npm install
```

### 問題：建置失敗

```bash
# 清理快取並重新建置
cd frontend
rm -rf node_modules dist .vite
npm install
npm run build
```

### 問題：環境變數未載入

```bash
# 確認 .env 檔案存在
ls -la backend/.env
ls -la frontend/.env

# 確認檔案格式正確（無 BOM、使用 UTF-8）
file backend/.env
```

## 📊 效能優化命令

### 分析前端打包大小

```bash
cd frontend
npm run build
npx vite-bundle-visualizer
```

### 檢查依賴安全性

```bash
# 後端
cd backend
npm audit
npm audit fix

# 前端
cd frontend
npm audit
npm audit fix
```

### 更新依賴

```bash
# 檢查過時的套件
npm outdated

# 更新所有套件到最新版本
npm update

# 更新到最新主要版本（謹慎使用）
npx npm-check-updates -u
npm install
```

## 🚀 部署命令

### Vercel 部署（前端）

```bash
# 安裝 Vercel CLI
npm install -g vercel

# 登入
vercel login

# 部署
cd frontend
vercel

# 生產部署
vercel --prod
```

### Render 部署（後端）

```bash
# 使用 Render Dashboard 或 CLI
# 1. 連接 GitHub repository
# 2. 選擇 backend 目錄
# 3. 設定環境變數
# 4. 點擊 Deploy
```

## 📝 開發工作流程

### 功能開發流程

```bash
# 1. 建立功能分支
git checkout -b feature/new-feature

# 2. 開發並測試
npm run dev

# 3. 提交變更
git add .
git commit -m "Add new feature"

# 4. 推送到遠端
git push origin feature/new-feature

# 5. 建立 Pull Request
```

### 發布流程

```bash
# 1. 更新版本號
npm version patch  # 或 minor, major

# 2. 建置前端
cd frontend
npm run build

# 3. 測試生產建置
npm run preview

# 4. 提交並推送
git add .
git commit -m "Release v1.0.1"
git push

# 5. 建立 Git Tag
git tag v1.0.1
git push --tags
```

## 🎯 快速參考

| 命令 | 用途 |
|------|------|
| `npm install` | 安裝依賴 |
| `npm run dev` | 開發模式 |
| `npm start` | 生產模式 |
| `npm run build` | 建置 |
| `npm run lint` | 程式碼檢查 |
| `npm audit` | 安全性檢查 |
| `npm outdated` | 檢查過時套件 |
| `npm update` | 更新套件 |

---

**提示**: 將此文件加入書籤，方便快速查找命令！📌

