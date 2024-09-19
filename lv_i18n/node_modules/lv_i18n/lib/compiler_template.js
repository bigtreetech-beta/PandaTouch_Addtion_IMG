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
  
function lang_template(l, data) {
  let pforms = Object.keys(data[l].plural); 
  const loc = to_c(l);
  
  gernerate_lang_singular_bin(l, data,l+".bin");

  return ``;
}
 
module.exports.generate_file_c = function (locales, data) {
  return ` 

${locales.map(l => lang_template(l, data)).join('\n\n')} 
`;
};
  


var enum_val_key = 1; 

function gernerate_lang_singular_bin(l, data, filePath)
{
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
    singularEntries.forEach(([key, val], index) => {
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
    const finalBuffer = Buffer.concat(bufferList);
  
    // Write the binary buffer to a file
    fs.writeFileSync(filePath, finalBuffer);
  
    // Check file size after writing
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
  
    // Throw an error if the file size exceeds 64KB (65536 bytes)
    if (fileSizeInBytes > 65536) {
      throw new Error(`File size exceeds 64KB. Actual size: ${fileSizeInBytes} bytes.`);
    }
  
    console.log(`File written successfully. Size: ${fileSizeInBytes} bytes.`); 
  }
  
 

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

// 生成 PNG 的 bin 文件
function generatePngBin(inputFile, outputFile, callback) {
    fs.createReadStream(inputFile)
        .pipe(new PNG())
        .on('parsed', function () {
            const width = this.width;
            const height = this.height;
            const pixelCount = width * height;

            // 1. 生成文件头信息
            const header = createHeader(width, height);

            // 2. 转换颜色深度
            const convertedData = convertColorDepth(this.data, pixelCount);

            // 3. 写入文件
            const outputBuffer = Buffer.concat([header, convertedData]);
            fs.writeFileSync(outputFile, outputBuffer);

            console.log('PNG decode ok:', outputFile);

            if (callback) callback(outputBuffer);
        })
        .on('error', function (err) {
            console.error('PNG decode error:', err);
        });
}

// 生成最终 img 文件，并添加 CRC32 校验
function generateImgFile(fileList, outputFile) {
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

    // 3. 写入每个文件的类型、大小、内容
    fileList.forEach(file => {
        const typeBuffer = Buffer.alloc(4);
        typeBuffer.writeUInt32LE(file.type);  // 文件类型
        const sizeBuffer = Buffer.alloc(4);
        sizeBuffer.writeUInt32LE(file.size);  // 文件大小

        bufferList.push(typeBuffer, sizeBuffer, file.data);  // 写入类型、大小、数据
    });

    // 4. 合并所有 buffer
    const finalBuffer = Buffer.concat(bufferList);

    // 5. 计算 CRC32 校验
    const crc32 = hardware_crc32_all(finalBuffer);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32LE(crc32);

    // 6. 将 CRC32 附加到文件末尾
    const imgBufferWithCrc = Buffer.concat([finalBuffer, crcBuffer]);

    // 7. 写入 img 文件
    fs.writeFileSync(outputFile, imgBufferWithCrc);
    console.log('img generate ok', outputFile);
}


var FT_PANDA_LANGUAGE = 0xF1;
var FT_PANDA_PNG = 0xF2;

// 主流程，检查 PNG 文件并生成 img 文件 
module.exports.processFiles = function (pngFilePath, langBinFilePath, outputFilePath)
{
    const fileList = [];

    // 生成词条的 bin 文件并获取数据
    const langBinBuffer = fs.readFileSync(langBinFilePath);
    fileList.push({
        type: FT_PANDA_LANGUAGE,  // 假设词条文件类型为 1
        size: langBinBuffer.length,
        data: langBinBuffer
    });

    // 检查是否存在 PNG 文件
    if (fs.existsSync(pngFilePath)) {
        const pngBinFilePath = 'new_panda.bin';  // 定义 PNG bin 文件的路径

        // 生成 PNG 的 bin 文件
        generatePngBin(pngFilePath, pngBinFilePath, pngBinBuffer => {
            fileList.push({
                type: FT_PANDA_PNG,  // 假设 PNG 文件类型为 2
                size: pngBinBuffer.length,
                data: pngBinBuffer
            });

            // 生成最终的 img 文件并附加 CRC32
            generateImgFile(fileList, outputFilePath);
        });
    } else {
        // 如果没有 PNG 文件，只生成词条的 img 文件
        generateImgFile(fileList, outputFilePath);
    }
}

