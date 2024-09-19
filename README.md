lv_i18n - Internationalization for LittlevGL

本工具是基于lvgl提供的lv_i18n修改而来，用于生成IMG文件，IMG文件可以由new_panda.png和自定义语言包组成。

## 快速使用
以windows为例

1. 安装node.js环境
2. 生成IMG文件

## 安装node.js环境

请在官网下载安装包，安装在windows上
[node.js](https://nodejs.org/en/download/) required.
 
* 安装 pngjs 
```sh 
npm install -s pngjs
``` 
 
## 生成IMG文件
* 运行lv_i18n生成img文件，每次只能指定一个yml文件
```sh 
npx lv_i18n/node_modules/lv_i18n compile -t de.yml -o . -l de

```  
  
## 更新IMG文件到PandaTouch
打开浏览器输入IP地址，通过"Update File"按钮来选择刚刚生成的“output.img”
