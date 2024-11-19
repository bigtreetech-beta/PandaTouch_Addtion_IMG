'use strict';


const _  = require('lodash');

const { create_c_plural_fn } = require('./plurals');

const fs = require('fs');

const { PNG } = require('pngjs');

// en-GB => en_gb
function to_c(locale) {
  return locale.toLowerCase().replace(/-/g, '_');
}

// escape C string to write all in one line.
function esc(str) {
  // TODO: simple & dirty, should be improved.
  return JSON.stringify(str).slice(1, -1);
}

function get_len(str) {
    return encodeURIComponent(JSON.stringify(str).slice(1, -1)).replace(/%[A-F\d]{2}/g, 'U').length;
  }  

function lang_template_ram(l, data) {
    let pforms = Object.keys(data[l].plural); 
    const loc = to_c(l);
      
    return generate_lang_singular_ram(l, data);
  }
   
module.exports.generate_data_ram = function (locales, data) {
    return lang_template_ram(locales[0], data);
};

var enum_val_key = 1; 
  
// 定义硬件 CRC32 计算函数，参考 C 代码
function hardware_crc32_all(source) {
    let wCRCin = 0xFFFFFFFF;
    const wCPoly = 0x04C11DB7;

    for (let i = 0; i < source.length; i++) {
        for (let j = 0; j < 8; j++) {
            const bit = (source[i] >> (7 - j)) & 1;
            const c31 = (wCRCin >> 31) & 1;
            wCRCin <<= 1;
            if (c31 ^ bit) {
                wCRCin ^= wCPoly;
            }
        }
    }
    return wCRCin >>> 0;  // 转换为无符号32位整数
}

// 定义 lv_img_header_t
function createHeader(width, height) {
    let header = 0;
    const cf = 5;  // color format

    header |= (cf & 0x1F);  // cf 占用 5 bit
    header |= (width & 0x7FF) << 10;  // width 占用 11 bit，从第10位开始
    header |= (height & 0x7FF) << 21;  // height 占用 11 bit，从第21位开始

    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(header);
    return buffer;
}

// 转换 PNG 图片颜色深度
function convertColorDepth(imgData, pxCount) {
    const output = Buffer.alloc(pxCount * 3);  // 16位颜色 + alpha 共3字节
    for (let i = 0; i < pxCount; i++) {
        const idx = i * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const alpha = imgData[idx + 3];

        const color = lv_color_make(r, g, b);
        output[i * 3] = color.full & 0xFF;  // 低8位
        output[i * 3 + 1] = color.full >> 8;  // 高8位
        output[i * 3 + 2] = alpha;  // alpha 通道
    }
    return output;
}

// 模拟 lv_color_make 函数
function lv_color_make(r, g, b) {
    return {
        full: ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3)
    };
}
  
var FT_PANDA_LANGUAGE = 0xF1;
var FT_PANDA_PNG = 0xF2;
  
function generate_lang_singular_ram(l, data) {
    enum_val_key = 1;
    const loc = to_c(l);
    const bufferList = [];
  
    const singularEntries = Object.entries(data[l].singular);
    const total_cnt = singularEntries.length;
  
    // Check if total count exceeds 1000
    if (total_cnt > 1000) {
      throw new Error('Total singular count exceeds 1000.');
    }
  
    // File Header: 4 bytes total count
    const totalCntBuffer = Buffer.alloc(4);
    totalCntBuffer.writeUInt32LE(total_cnt);
    bufferList.push(totalCntBuffer);
  
    // Handle first singular entry for special header info
    const [firstKey, firstVal] = singularEntries[0];
    const first_len = get_len(firstVal);
  
    // Check if the first entry's length exceeds 32 bytes
    if (first_len > 32) {
      throw new Error('First entry exceeds 32 bytes.');
    }
  
    // File Header: 4 bytes first entry length
    const firstLenBuffer = Buffer.alloc(4);
    firstLenBuffer.writeUInt32LE(first_len);
    bufferList.push(firstLenBuffer);
  
    // File Header: First entry's translation string (in UTF-8)
    const firstTranslationBuffer = Buffer.from(esc(firstVal), 'utf8');
    bufferList.push(firstTranslationBuffer);
  
    // Process remaining singular entries
    singularEntries.forEach(([key, val]) => {
      const msg_id = enum_val_key++;
      const len = get_len(val);
      const translation = esc(val);
  
      // Msg ID (4 bytes)
      const msgIdBuffer = Buffer.alloc(4);
      msgIdBuffer.writeUInt32LE(msg_id);
  
      // Length (4 bytes)
      const lenBuffer = Buffer.alloc(4);
      lenBuffer.writeUInt32LE(len);
  
      // Translation (in UTF-8)
      const translationBuffer = Buffer.from(translation, 'utf8');
  
      // Push buffers to the list
      bufferList.push(msgIdBuffer, lenBuffer, translationBuffer);
    });
  
    // Concatenate all buffers
    return Buffer.concat(bufferList);
  }
  
  // 生成 PNG 的 bin buffer
  function generatePngBin_ram(pngData) {
    //return new Promise((resolve, reject) => 
    //{
      const png = PNG.sync.read(pngData);
      const width = png.width;
      const height = png.height;
      const pixelCount = width * height;
  
      // 1. 生成文件头信息
      const header = createHeader(width, height);
  
      // 2. 转换颜色深度
      const convertedData = convertColorDepth(png.data, pixelCount);
  
      // 3. 组合成输出 buffer
      const outputBuffer = Buffer.concat([header, convertedData]);
      //resolve(outputBuffer);
      return outputBuffer;
    //});
  }
  
  // 生成最终 img buffer，并添加 CRC32 校验
  function generateImgBuffer_ram(fileList,total_size) {
    const bufferList = [];
  
    // 1. 写入 magic 头部信息
    const magicBuffer = Buffer.alloc(4);
    magicBuffer.writeUInt32LE(0xADDF5AA5);  // 魔术数 0xADDF5AA5
    bufferList.push(magicBuffer);
  
    // 2. 写入总文件个数
    const totalFileCount = fileList.length; 
    const totalFileCountBuffer = Buffer.alloc(4);
    totalFileCountBuffer.writeUInt32LE(totalFileCount);
    bufferList.push(totalFileCountBuffer);

    // 3. 写入总文件大小
    const totalFileSize = total_size+4*4+totalFileCount*(4*2)-4;//去掉CRC32
    console.log("totalFileSize="+totalFileSize); 
    const totalFileSizeBuffer = Buffer.alloc(4);
    totalFileSizeBuffer.writeUInt32LE(totalFileSize);
    bufferList.push(totalFileSizeBuffer);

    // 4. 写入每个文件的类型、大小、内容
    fileList.forEach(file => {
      const typeBuffer = Buffer.alloc(4);
      typeBuffer.writeUInt32LE(file.type);
      const sizeBuffer = Buffer.alloc(4);
      sizeBuffer.writeUInt32LE(file.size);
  
      bufferList.push(typeBuffer, sizeBuffer, file.data);
    });
  
    // 5. 合并所有 buffer
    const finalBuffer = Buffer.concat(bufferList);
  
    // 6. 计算 CRC32 校验
    const crc32 = hardware_crc32_all(finalBuffer);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32LE(crc32);
  
    // 7. 将 CRC32 附加到 buffer 末尾
    return Buffer.concat([finalBuffer, crcBuffer]);
  }
  
  // 主流程，检查 PNG buffer 并生成 img buffer
  module.exports.processBuffers_ram = function (pngBuffer, langData) {
    const fileList = [];
    
    let cal_total_size = 0;

    if (langData)
    {
        // 生成词条的 bin buffer 
        fileList.push({
            type: FT_PANDA_LANGUAGE,  // 假设词条文件类型
            size: langData.length,
            data: langData
        });

        cal_total_size+=langData.length;
    }
    
    // 检查 PNG buffer 是否有效
    if (pngBuffer) 
    {
      const pngBinBuffer =  generatePngBin_ram(pngBuffer);
      fileList.push({
        type: FT_PANDA_PNG,  // 假设 PNG 文件类型
        size: pngBinBuffer.length,
        data: pngBinBuffer
      });

      cal_total_size+=pngBinBuffer.length;
    }
  
    // 生成最终的 img buffer 并附加 CRC32
    return generateImgBuffer_ram(fileList,cal_total_size);
  }