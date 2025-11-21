# 工具函數目錄

此目錄用於存放共用的工具函數。

## 檔案結構

- `validation.js` - 資料驗證函數
- `helpers.js` - 通用輔助函數
- `constants.js` - 常數定義

## 使用範例

```javascript
import { validateEmail } from './utils/validation.js'

if (!validateEmail(email)) {
  throw new Error('無效的 Email 格式')
}
```

