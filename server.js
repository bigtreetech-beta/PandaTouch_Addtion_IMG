const express = require('express');
const path = require('path');
const http = require('http');
const app = express();
const PORT = process.env.PORT || 3000;
const cmd_compile = require('./lib/cmd_compile');
const fs = require('fs');

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

app.use(express.json({ limit: '30mb' }));

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/firmware_info.json', (req, res) => {
    res.sendFile(path.join(__dirname, 'firmware/firmware_info.json'));
});

app.post('/generate', (req, res) => {
    const {default_lang, ymlData, pngData } = req.body;
    let ymlBuffer;
    let pngBuffer;
 
    try {
        if (ymlData) {
            ymlBuffer = Buffer.from(ymlData.split(",")[1], 'base64');
        } else {
            ymlBuffer = fs.readFileSync(path.join(__dirname, "translations/"+default_lang+'.yml')); // 默认语言文件
            //console.log("use  default ymlBuffer="+ymlBuffer);
        }

        if (pngData) {
            pngBuffer = Buffer.from(pngData.split(",")[1], 'base64');
        } else {
            pngBuffer = null;//fs.readFileSync(path.join(__dirname, 'default_panda.png')); // 默认熊猫图片
        }

        const img_buffer = cmd_compile.generate_img(ymlBuffer, pngBuffer);

        if (!img_buffer) {
            throw new AppError('Failed to execute command: img_buffer is null', 500);
        }
  
        res.send(img_buffer); 
    } catch (error) {
        res.status(500).json({
            message: error.message || 'An unexpected error occurred',
            stack: error.stack
        });
    }
});

app.post('/generate_fat', (req, res) => {
    const {default_lang, ymlData, pngData } = req.body;
    let ymlBuffer;
    let pngBuffer;
 
    try {
        if (ymlData) {
            ymlBuffer = Buffer.from(ymlData.split(",")[1], 'base64');
        } else {
            ymlBuffer = fs.readFileSync(path.join(__dirname, "translations/"+ default_lang+'.yml')); // 默认语言文件
            //console.log("use  default ymlBuffer="+ymlBuffer);
        }
         
        if (pngData) {
            pngBuffer = Buffer.from(pngData.split(",")[1], 'base64');
        } else {
            pngBuffer = null;//fs.readFileSync(path.join(__dirname, 'default_panda.png')); // 默认熊猫图片
        }

        const img_buffer = cmd_compile.generate_img(ymlBuffer, pngBuffer);

        if (!img_buffer) {
            throw new AppError('Failed to execute command: img_buffer is null', 500);
        }
 
        // 读取 fat.img 文件并获取文件大小
        const fatFilePath = path.join(__dirname, 'fat_product.img');

        const fatFileBuffer = fs.readFileSync(fatFilePath);
        const fatFileSize = fatFileBuffer.length;

        // 计算偏移量
        const get_fat_img_total_size = fatFileSize - 8;
        const page_index = Math.floor(((get_fat_img_total_size + 4) / 4096) + 1);
        const get_offset = page_index * 4096;
        
        console.log("page_index="+page_index);
        console.log("get_fat_img_total_size="+get_fat_img_total_size);
        
        console.log("get_offset="+get_offset);

        // 计算总内存大小
        const totalSize = get_offset + img_buffer.length;

        // 创建内存缓冲区并复制数据
        const fat_buffer = Buffer.alloc(totalSize);
        fatFileBuffer.copy(fat_buffer, 0); // 复制 fat.img 内容到缓冲区起始位置
        img_buffer.copy(fat_buffer, get_offset); // 将 img_buffer 数据复制到偏移位置

        // 发送生成的 fat_buffer
        res.send(fat_buffer); // 直接发送 Buffer 数据 
    } catch (error) {
        res.status(500).json({
            message: error.message || 'An unexpected error occurred',
            stack: error.stack
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
