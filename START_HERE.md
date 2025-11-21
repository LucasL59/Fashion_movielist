# 🎬 從這裡開始！

歡迎使用 **MVI影片選擇系統 v2.0**！這是您開始使用本專案的第一步。

## 🎯 專案簡介

這是一個完整的全端 Web 應用程式，採用三層權限架構：
- **管理員 (Admin)** - 完整權限（上傳、編輯、刪除、管理用戶）
- **上傳者 (Uploader)** ⭐ 新增 - 上傳和編輯權限
- **客戶 (Customer)** - 選擇影片
- **系統** 會自動透過 Email 通知相關人員

## 🆕 v2.0 新功能

- ✨ 三層權限架構（admin/uploader/customer）
- ✨ 用戶管理頁面
- ✨ 批次刪除功能
- 🔒 強化的資料庫安全政策

## 🚀 三步驟快速開始

### 步驟 1：選擇您的目標

<table>
<tr>
<td width="50%">

#### 🏃‍♂️ 我想立即試用

**目標**: 5-10 分鐘內在本地運行系統

**請閱讀**: [QUICK_START.md](QUICK_START.md)

**您將學到**:
- 如何設定 Supabase
- 如何設定 Azure AD
- 如何在本地運行系統

</td>
<td width="50%">

#### 🚀 我想部署到雲端

**目標**: 將系統部署到 Vercel + Render

**請閱讀**: [DEPLOYMENT.md](DEPLOYMENT.md)

**您將學到**:
- 如何部署前端到 Vercel
- 如何部署後端到 Render
- 如何設定生產環境

</td>
</tr>
<tr>
<td width="50%">

#### 📚 我想了解技術細節

**目標**: 深入了解系統架構和實現

**請閱讀**: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

**您將學到**:
- 技術架構
- API 文件
- 資料庫結構
- 核心功能實現

</td>
<td width="50%">

#### 🔧 我想設定環境變數

**目標**: 詳細了解如何獲取和設定所有環境變數

**請閱讀**: [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md)

**您將學到**:
- 如何獲取 Supabase 金鑰
- 如何設定 Azure AD
- 環境變數完整說明

</td>
</tr>
</table>

### 步驟 2：準備環境

#### 必要工具

- ✅ **Node.js 18+** - [下載](https://nodejs.org/)
- ✅ **npm 或 yarn** - 隨 Node.js 一起安裝
- ✅ **Git** - [下載](https://git-scm.com/)
- ✅ **程式碼編輯器** - 推薦 [VS Code](https://code.visualstudio.com/)

#### 必要帳號

- ✅ **Supabase 帳號** - [註冊](https://supabase.com)（免費）
- ✅ **Azure 帳號** - [註冊](https://portal.azure.com)（免費）
- ✅ **GitHub 帳號** - [註冊](https://github.com)（部署用，免費）

#### 可選帳號（部署用）

- ⭕ **Vercel 帳號** - [註冊](https://vercel.com)（免費）
- ⭕ **Render 帳號** - [註冊](https://render.com)（免費）

### 步驟 3：開始行動

根據您在步驟 1 選擇的目標，點擊對應的連結開始！

## 📚 完整文件列表

| 文件 | 說明 | 閱讀時間 |
|------|------|----------|
| [README.md](README.md) | 專案主要說明 | 5 分鐘 |
| [QUICK_START.md](QUICK_START.md) | 快速開始指南 | 10 分鐘 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 部署指南 | 15 分鐘 |
| [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) | 環境變數設定 | 10 分鐘 |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | 技術總結 | 20 分鐘 |
| [PROJECT_FILES_OVERVIEW.md](PROJECT_FILES_OVERVIEW.md) | 檔案結構 | 10 分鐘 |
| [INSTALLATION_COMMANDS.md](INSTALLATION_COMMANDS.md) | 命令速查表 | 5 分鐘 |
| [CHECKLIST.md](CHECKLIST.md) | 完成檢查清單 | 5 分鐘 |

## 🎓 學習路徑

### 🌱 初學者路徑

1. 閱讀 [README.md](README.md) 了解專案
2. 閱讀 [QUICK_START.md](QUICK_START.md) 快速開始
3. 閱讀 [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md) 設定環境
4. 開始使用系統！

**預計時間**: 30-60 分鐘

### 🚀 進階路徑

1. 閱讀 [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) 了解架構
2. 閱讀 [PROJECT_FILES_OVERVIEW.md](PROJECT_FILES_OVERVIEW.md) 了解結構
3. 閱讀 [DEPLOYMENT.md](DEPLOYMENT.md) 學習部署
4. 開始客製化和擴展！

**預計時間**: 1-2 小時

### 🏆 專家路徑

1. 閱讀所有文件
2. 研究原始碼
3. 自訂功能
4. 貢獻改進

**預計時間**: 根據需求而定

## 🔥 最快上手方式

如果您想要最快的方式開始，請按照以下步驟：

```bash
# 1. Clone 專案（如果還沒有）
git clone <your-repo-url>
cd Fashion_movielist

# 2. 安裝後端依賴
cd backend
npm install

# 3. 複製環境變數範例
cp .env.example .env
# 編輯 .env 填入您的 Supabase 和 Azure AD 資訊

# 4. 啟動後端
npm run dev

# 5. 開啟新終端，安裝前端依賴
cd ../frontend
npm install

# 6. 複製環境變數範例
cp .env.example .env
# 編輯 .env 填入您的 Supabase 資訊

# 7. 啟動前端
npm run dev

# 8. 開啟瀏覽器訪問 http://localhost:5173
```

**詳細步驟請參考**: [QUICK_START.md](QUICK_START.md)

## 💡 常見問題

### Q: 我需要付費嗎？

A: 不需要！所有服務都有免費方案：
- Supabase: 500MB 資料庫（免費）
- Azure AD: 基本功能（免費）
- Vercel: 100GB 頻寬（免費）
- Render: 750 小時/月（免費）

### Q: 我需要什麼技術背景？

A: 基本的程式設計知識即可。本專案提供完整的文件和步驟說明。

### Q: 需要多久才能開始使用？

A: 
- **本地開發**: 30-60 分鐘
- **雲端部署**: 1-2 小時

### Q: 我可以客製化嗎？

A: 當然可以！這是一個開源專案，您可以自由修改和擴展。

### Q: 遇到問題怎麼辦？

A: 
1. 檢查相關文件
2. 查看瀏覽器控制台和終端日誌
3. 參考 [CHECKLIST.md](CHECKLIST.md) 檢查設定
4. 查看各服務的官方文件

## 🎨 專案特色

### ✨ 功能完整
- ✅ 用戶認證系統
- ✅ Excel 圖片提取
- ✅ 影片選擇功能
- ✅ Email 自動通知
- ✅ 定期提醒排程

### 🎯 易於使用
- ✅ 清晰的 UI 設計
- ✅ 響應式佈局
- ✅ 直覺的操作流程

### 🚀 易於部署
- ✅ 完整的部署文件
- ✅ 一鍵部署配置
- ✅ 免費方案支援

### 📚 文件完善
- ✅ 8+ 份詳細文件
- ✅ 20,000+ 字說明
- ✅ 步驟式教學

## 🎯 下一步

根據您的需求選擇：

<table>
<tr>
<td align="center" width="33%">

### 🏃‍♂️ 立即開始

[閱讀快速開始指南](QUICK_START.md)

30-60 分鐘內運行系統

</td>
<td align="center" width="33%">

### 📚 深入學習

[閱讀技術總結](PROJECT_SUMMARY.md)

了解系統架構和實現

</td>
<td align="center" width="33%">

### 🚀 部署上線

[閱讀部署指南](DEPLOYMENT.md)

將系統部署到雲端

</td>
</tr>
</table>

## 📞 需要幫助？

- 📖 **文件**: 查看上方的文件列表
- 🔍 **搜尋**: 使用 Ctrl+F 搜尋關鍵字
- 📝 **檢查清單**: 參考 [CHECKLIST.md](CHECKLIST.md)
- 💻 **命令參考**: 查看 [INSTALLATION_COMMANDS.md](INSTALLATION_COMMANDS.md)

---

<div align="center">

**準備好了嗎？讓我們開始吧！** 🚀

[快速開始](QUICK_START.md) | [查看文件](README.md) | [部署指南](DEPLOYMENT.md)

---

Made with ❤️ for easy movie selection

</div>

