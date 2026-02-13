/**
 * 台灣時區工具函式
 * 
 * 提供可靠的台灣時間 (UTC+8) 格式化功能，
 * 不依賴 Node.js 的 toLocaleString() 與 ICU 資料。
 * 確保在任何 Node.js 環境（包括 Render 伺服器）下都能正確顯示台灣時間。
 */

const TAIWAN_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8 = 8 小時 = 28800000 毫秒

/**
 * 將任意日期/時間值轉換為台灣時間的 Date 物件
 * 注意：回傳的 Date 物件其 getUTCXxx() 方法代表台灣時間
 * 
 * @param {Date|string|number} [input] - 日期/時間值，預設為現在
 * @returns {Date} 偏移後的 Date 物件
 */
function toTaiwanDate(input) {
  const date = input ? new Date(input) : new Date();
  return new Date(date.getTime() + TAIWAN_OFFSET_MS);
}

/**
 * 格式化為台灣時間字串
 * 
 * 輸出格式：YYYY/MM/DD HH:mm:ss
 * 範例：2026/02/13 14:30:00
 * 
 * @param {Date|string|number} [input] - 日期/時間值，預設為現在
 * @returns {string} 格式化後的台灣時間字串
 */
export function formatTaiwanDateTime(input) {
  const tw = toTaiwanDate(input);

  const year = tw.getUTCFullYear();
  const month = String(tw.getUTCMonth() + 1).padStart(2, '0');
  const day = String(tw.getUTCDate()).padStart(2, '0');
  const hours = String(tw.getUTCHours()).padStart(2, '0');
  const minutes = String(tw.getUTCMinutes()).padStart(2, '0');
  const seconds = String(tw.getUTCSeconds()).padStart(2, '0');

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化為台灣日期字串（不含時間）
 * 
 * 輸出格式：YYYY/MM/DD
 * 
 * @param {Date|string|number} [input] - 日期/時間值，預設為現在
 * @returns {string} 格式化後的台灣日期字串
 */
export function formatTaiwanDate(input) {
  const tw = toTaiwanDate(input);

  const year = tw.getUTCFullYear();
  const month = String(tw.getUTCMonth() + 1).padStart(2, '0');
  const day = String(tw.getUTCDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
}

/**
 * 取得當前台灣時間的年份
 * 
 * @returns {number} 台灣時區的年份
 */
export function getTaiwanYear() {
  const tw = toTaiwanDate();
  return tw.getUTCFullYear();
}

/**
 * 計算指定月份在台灣時區下的 UTC 邊界
 * 用於資料庫查詢時的月份範圍篩選
 * 
 * 範例：getTaiwanMonthBoundary('2026-01') 
 *   → { start: '2025-12-31T16:00:00.000Z', end: '2026-01-31T16:00:00.000Z' }
 * 
 * @param {string} monthStr - 月份字串 (YYYY-MM)
 * @returns {{ start: string, end: string }} UTC ISO 字串格式的起始和結束時間
 */
export function getTaiwanMonthBoundary(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);

  // 台灣時間的月初 00:00:00 轉為 UTC
  const startTW = `${monthStr}-01T00:00:00+08:00`;

  // 台灣時間的下個月初 00:00:00 轉為 UTC
  const nextMonth = month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, '0')}`;
  const endTW = `${nextMonth}-01T00:00:00+08:00`;

  return {
    start: new Date(startTW).toISOString(),
    end: new Date(endTW).toISOString(),
  };
}
