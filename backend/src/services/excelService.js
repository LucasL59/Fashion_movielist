/**
 * Excel 處理服務
 * 
 * 負責解析 Excel 檔案、提取嵌入圖片、上傳到 Supabase
 */

import ExcelJS from 'exceljs';
import { supabase } from '../config/supabase.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

/**
 * 解析 Excel 並上傳到 Supabase
 * 
 * @param {Object} file - 上傳的檔案物件
 * @param {string} uploaderId - 上傳者 ID
 * @param {string} batchName - 批次名稱
 * @param {string} month - 批次所屬月份 (YYYY-MM)
 * @returns {Object} 上傳結果
 */
export async function parseExcelAndUpload(file, uploaderId, batchName, month) {
  const workbook = new ExcelJS.Workbook();
  
  try {
    // 讀取 Excel 檔案
    await workbook.xlsx.readFile(file.tempFilePath);
    const worksheet = workbook.worksheets[0];
    
    if (!worksheet) {
      throw new Error('Excel 檔案中沒有工作表');
    }
    
    // 建立新批次
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert({
        name: batchName,
        month: month,
        uploader_id: uploaderId,
        status: 'active'
      })
      .select()
      .single();
    
    if (batchError) throw batchError;
    
    console.log(`📦 建立批次: ${batch.id} - ${batchName}`);
    
    // 提取嵌入的圖片
    const images = extractImagesFromWorksheet(worksheet, workbook);
    console.log(`🖼️  找到 ${images.length} 張圖片`);
    
    // 解析資料行
    const videos = [];
    const headerRow = worksheet.getRow(1);
    const headers = [];
    
    // 讀取標題行
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.value?.toString().trim() || '';
    });
    
    // 找到各欄位的索引
    const columnMap = {
      image: headers.indexOf('圖   片') || headers.indexOf('圖片'),
      title: headers.indexOf('片   名') || headers.indexOf('片名'),
      titleEn: headers.indexOf('英 文 片 名') || headers.indexOf('英文片名'),
      description: headers.indexOf('簡介'),
      director: headers.indexOf('導演'),
      actorMale: headers.indexOf('男演員'),
      actorFemale: headers.indexOf('女演員'),
      duration: headers.indexOf('片長'),
      rating: headers.indexOf('級別'),
      language: headers.indexOf('發音'),
      subtitle: headers.indexOf('字幕')
    };
    
    // 讀取資料行（從第 2 行開始）
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // 檢查是否為空行
      const titleVal = getCellValue(row.getCell(columnMap.title));
      if (!titleVal) {
        continue;
      }
      
      // 尋找對應的圖片
      const matchedImage = findImageForRow(images, rowNumber);
      let thumbnailUrl = null;
      
      if (matchedImage) {
        // 上傳圖片到 Supabase Storage
        thumbnailUrl = await uploadImageToStorage(matchedImage, batch.id);
      }
      
      // 建立影片資料
      const video = {
        batch_id: batch.id,
        title: titleVal,
        title_en: getCellValue(row.getCell(columnMap.titleEn)),
        description: getCellValue(row.getCell(columnMap.description)),
        director: getCellValue(row.getCell(columnMap.director)),
        actor_male: getCellValue(row.getCell(columnMap.actorMale)),
        actor_female: getCellValue(row.getCell(columnMap.actorFemale)),
        duration: parseInt(getCellValue(row.getCell(columnMap.duration))) || null,
        rating: getCellValue(row.getCell(columnMap.rating)),
        language: getCellValue(row.getCell(columnMap.language)),
        subtitle: getCellValue(row.getCell(columnMap.subtitle)),
        thumbnail_url: thumbnailUrl,
        row_number: rowNumber
      };
      
      videos.push(video);
    }
    
    // 批次插入影片資料
    if (videos.length > 0) {
      const { error: videosError } = await supabase
        .from('videos')
        .insert(videos);
      
      if (videosError) throw videosError;
    }
    
    console.log(`✅ 成功插入 ${videos.length} 部影片`);
    
    // 清理臨時檔案
    if (file.tempFilePath && fs.existsSync(file.tempFilePath)) {
      fs.unlinkSync(file.tempFilePath);
    }
    
    return {
      batchId: batch.id,
      batchName: batch.name,
      videoCount: videos.length,
      uploadedAt: batch.created_at
    };
    
  } catch (error) {
    console.error('解析 Excel 錯誤:', error);
    throw error;
  }
}

/**
 * 從工作表中提取嵌入的圖片
 * 
 * @param {Object} worksheet - ExcelJS 工作表
 * @param {Object} workbook - ExcelJS 工作簿
 * @returns {Array} 圖片資訊陣列
 */
function extractImagesFromWorksheet(worksheet, workbook) {
  const images = [];
  
  // ExcelJS 將圖片存儲在 worksheet.getImages() 中
  worksheet.getImages().forEach((image) => {
    const img = workbook.model.media[image.imageId];
    
    if (img && image.range && image.range.tl) {
      // 計算圖片中心點所在的行號
      const topRow = image.range.tl.row;
      const bottomRow = image.range.br ? image.range.br.row : topRow;
      const centerRow = Math.floor((topRow + bottomRow) / 2) + 1; // +1 因為 ExcelJS 從 0 開始
      
      images.push({
        imageId: image.imageId,
        range: image.range,
        buffer: img.buffer,
        extension: img.extension,
        rowNumber: centerRow,
        topRow: topRow + 1,
        bottomRow: bottomRow + 1
      });
    }
  });
  
  return images;
}

/**
 * 尋找對應行的圖片
 * 
 * @param {Array} images - 圖片陣列
 * @param {number} rowNumber - 行號
 * @returns {Object|null} 匹配的圖片物件
 */
function findImageForRow(images, rowNumber) {
  // 先嘗試精確匹配
  let matchedImage = images.find(img => img.rowNumber === rowNumber);
  
  if (matchedImage) {
    return matchedImage;
  }
  
  // 如果沒有精確匹配，找範圍內的圖片
  matchedImage = images.find(img => 
    rowNumber >= img.topRow && rowNumber <= img.bottomRow
  );
  
  if (matchedImage) {
    return matchedImage;
  }
  
  // 最後嘗試找最接近的圖片（容差 ±2 行）
  matchedImage = images.find(img => 
    Math.abs(img.rowNumber - rowNumber) <= 2
  );
  
  return matchedImage || null;
}

/**
 * 上傳圖片到 Supabase Storage
 * 
 * @param {Object} image - 圖片物件
 * @param {string} batchId - 批次 ID
 * @returns {string} 圖片的公開 URL
 */
async function uploadImageToStorage(image, batchId) {
  try {
    const fileName = `${batchId}/${uuidv4()}.${image.extension}`;
    const bucketName = 'movie-thumbnails';
    
    // 上傳圖片
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, image.buffer, {
        contentType: `image/${image.extension}`,
        upsert: false
      });
    
    if (error) throw error;
    
    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('上傳圖片錯誤:', error);
    return null;
  }
}

/**
 * 獲取儲存格的文字值，處理 Rich Text 和公式
 * 
 * @param {Object} cell - ExcelJS Cell 物件
 * @returns {string} 儲存格文字內容
 */
function getCellValue(cell) {
  if (!cell || cell.value === null || cell.value === undefined) {
    return '';
  }
  
  const value = cell.value;
  
  // 處理 Rich Text
  if (typeof value === 'object' && value.richText) {
    return value.richText.map(part => part.text).join('');
  }
  
  // 處理超連結
  if (typeof value === 'object' && value.text) {
    return value.text;
  }
  
  // 處理公式結果
  if (typeof value === 'object' && value.result !== undefined) {
    return value.result.toString();
  }
  
  // 處理日期
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  // 一般文字或數字
  return value.toString();
}

