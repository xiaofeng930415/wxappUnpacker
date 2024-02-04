
# 安装
```
npm install
```

# 安装依赖
```
npm install esprima
    
npm install css-tree
    
npm install cssbeautify
    
npm install vm2
    
npm install uglify-es
    
npm install js-beautify


```
# 使用

Android 手机最近使用过的微信小程序所对应的 wxapkg 包文件都存储在特定文件夹下，可通过以下命令查看：

adb pull /data/data/com.tencent.mm/MicroMsg/{User}/appbrand/pkg


--
node wuWxapkg.js  .wxapkg

其中`{User}` 为当前用户的用户名，类似于 `2bc**************b65`。





# 分包功能

当检测到 wxapkg 为子包时, 添加-s 参数指定主包源码路径即可自动将子包的 wxss,wxml,js 解析到主包的对应位置下. 完整流程大致如下: 
1. 获取主包和若干子包
2. 解包主包  
    - windows系统使用: `./bingo.bat testpkg/master-xxx.wxapkg`
    - Linux系统使用: `./bingo.sh testpkg/master-xxx.wxapkg`
3. 解包子包  
    - windows系统使用: `./bingo.bat testpkg/sub-1-xxx.wxapkg -s=../master-xxx`
    - Linux系统使用:  `./bingo.sh testpkg/sub-1-xxx.wxapkg -s=../master-xxx`
4.备注
    - 解析子包只能是: `node wuWxapkg.js -s=../master-xxx testpkg/sub-1-xxx.wxapkg`
    - 目前支持 `./bingo.bat testpkg/sub-1-xxx.wxapkg -s ../master-xxx`


./bingo.bat Z:/GitStore/test/_packageSmart_.wxapkg -s Z:/GitStore/test/__APP__

TIP
> -s 参数可为相对路径或绝对路径, 推荐使用绝对路径, 因为相对路径的起点不是当前目录 而是子包解包后的目录

```
├── testpkg
│   ├── sub-1-xxx.wxapkg #被解析子包
│   └── sub-1-xxx               #相对路径的起点
│       ├── app-service.js
│   ├── master-xxx.wxapkg
│   └── master-xxx             # ../master-xxx 就是这个目录
│       ├── app.json
```

循环嵌套 非也

需要写个循环 去除if(path&&e_[path]){ 里的代码 }

现存问题：

dir: C:\Users\xiaogf007\Documents\leidian9\Pictures\ciniao\_1637444913_17  error:  Error: Unknown init callee 
gz$gwx0_XC_1_1
    at analyze (D:\GitStore\wxappUnpacker\wuWxml.js:216:46)
    at doWxml (D:\GitStore\wxappUnpacker\wuWxml.js:346:5)
    at tryWxml (D:\GitStore\wxappUnpacker\wuWxml.js:387:9)
    at D:\GitStore\wxappUnpacker\wuWxml.js:574:34
    at D:\GitStore\wxappUnpacker\wuRestoreZ.js:321:21
    at catchZ (D:\GitStore\wxappUnpacker\wuRestoreZ.js:73:2)
    at getZ (D:\GitStore\wxappUnpacker\wuRestoreZ.js:321:3)
    at D:\GitStore\wxappUnpacker\wuWxml.js:464:9
    at D:\GitStore\wxappUnpacker\wuLib.js:103:14
    at agent (D:\GitStore\wxappUnpacker\wuLib.js:66:23)
Decompile ./sub_pages/tools/coverCrop.wxml...
dir: C:\Users\xiaogf007\Documents\leidian9\Pictures\ciniao\_1637444913_17  error:  Error: Unknown init callee 

已经修复

可以参考
_-1431017214_12

PC小程序地址
C:\Users\Administrator\Documents\WeChat Files\Applet

使用工具
https://www.npmjs.com/package/mp-wxapkg-unpacker?activeTab=readme

使用方式
yarn global add mp-wxapkg-unpakcer
首先尝试直接解包 (解压出来打包好的目录)
# 解包
unp unpack -s <decrypt>.wxapkg
如果失败, 则按下面顺序执行
# 解密
unp decrypt -s <src>.wxapkg -d <decrypt>.wxapkg

# 解密并解包 (pc 端)
unp decrypt -s <src>.wxapkg

# 解包
unp unpack -s <decrypt>.wxapkg

# 解包 (指定输出目录)
unp unpack -s <decrypt>.wxapkg -d <dist path>


必须cd进入相应的路径   C:/Users/Administrator/Documents/"WeChat Files"/Applet
才能执行   unp decrypt -s __APP__.wxapkg  -d APP.wxapkg

原因: 路径中不能包含空格,即使是做了处理,也仍会生成失败


