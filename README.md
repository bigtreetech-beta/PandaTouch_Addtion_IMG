lv_i18n - Internationalization for LittlevGL

本工具是基于lvgl提供的lv_i18n修改而来，用于生成IMG文件，IMG文件可以由new_panda.png和自定义语言包组成。

## 快速使用
以windows为例

1. 安装node.js环境
2. 安装依赖库
3. 准备资源文件
4. 生成IMG文件

## 安装node.js环境

请在官网下载安装包，安装在windows上
[node.js](https://nodejs.org/en/download/) required.
 
## 安装依赖库
* 打开powershell，新建一个目录为Panda_Touch_IMG，拷贝lv_i18n文件夹到该目录下

```sh 
mkdir Panda_Touch_IMG
cd Panda_Touch_IMG
cp ../lv_i18n . -r
ls
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----         2024/9/19     11:40                lv_i18n
```

* 安装 pngjs 
```sh 
npm install -s pngjs
``` 

## 准备资源文件
* 拷贝new_panda.png和需要翻译的yml文件
```sh 
cp ../new_panda.png .
cp ../de.yml .
ls
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----         2024/9/19     11:49                lv_i18n
d-----         2024/9/19     11:50                node_modules
-a----         2024/9/18     14:54          40166 de.yml
-a----         2024/3/29      9:07          72521 new_panda.png
-a----         2024/9/19     11:50           7077 package-lock.json
-a----         2024/9/19     11:50            142 package.json
``` 

## 生成IMG文件
* 运行lv_i18n生成img文件
```sh 
npx lv_i18n/node_modules/lv_i18n compile -t *.yml -o . -l de
ls
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
d-----         2024/9/19     11:49                lv_i18n
d-----         2024/9/19     11:50                node_modules
-a----         2024/9/19     11:53          32192 de.bin
-a----         2024/9/18     14:54          40166 de.yml
-a----         2024/9/19     11:53         202804 new_panda.bin
-a----         2024/3/29      9:07          72521 new_panda.png
-a----         2024/9/19     11:53         235024 output.img
-a----         2024/9/19     11:50           7077 package-lock.json
-a----         2024/9/19     11:50            142 package.json

```  
  
## 更新IMG文件到PandaTouch
打开浏览器输入IP地址，通过"Update File"按钮来选择刚刚生成的“output.img”
