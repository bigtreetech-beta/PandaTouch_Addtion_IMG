lv_i18n - Internationalization for LittlevGL

本工具是基于lvgl提供的lv_i18n修改而来，用于生成IMG文件，IMG文件可以由new_panda.png和自定义语言包组成。

## 快速使用

1. 安装node.js环境
2. 安装lv_i18n到本地，安装 pngjs 
3. 添加需要翻译的 `yml`文件，添加需要替换的new_panda.png
4. 生成IMG文件

## Install/run the script

运行指令 npx lv_i18n/node_modules/lv_i18n compile -t translations/*.yml -o . 

[node.js](https://nodejs.org/en/download/) required.

Global install of the last version, execute as "lv_i18n"

```sh
npm i lv_i18n -g
```

**Alternatives:**

Install from github's repo, master branch

```sh
npm i littlevgl/lv_i18n -g
```


## Mark up the text in your code
