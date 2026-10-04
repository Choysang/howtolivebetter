@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title 高性价比人生指南 · 本地优先离线服务

echo ======================================================================
echo           高性价比人生指南（HowToLiveBetter）· 本地优先极速启动器
echo ======================================================================
echo.

:: 1. Node.js 环境与版本检测 (铁律: Node >= 24)
echo [*] 正在检测 Node.js 运行环境...
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未在系统 PATH 中检测到 Node.js！
    echo 请先安装 Node.js ^>= 24: https://nodejs.org/
    echo 安装完成后请重新双击此批处理脚本。
    echo.
    pause
    exit /b 1
)

for /f "tokens=1 delims=." %%a in ('node -v') do set "NODE_VER_RAW=%%a"
set "NODE_MAJOR=!NODE_VER_RAW:v=!"
if !NODE_MAJOR! LSS 24 (
    echo [错误] 当前 Node.js 版本为 !NODE_VER_RAW!，低于要求的最低版本 Node 24。
    echo 本项目采用全仓原生 TypeScript 剥离与零根依赖架构，必须使用 Node.js ^>= 24。
    echo 请访问 https://nodejs.org/ 下载并升级 Node.js。
    echo.
    pause
    exit /b 1
)
echo [+] Node.js 环境正常 (检测到 !NODE_VER_RAW!)

:: 2. 检查依赖与静态构建产物
if not exist "frontend\web\node_modules" (
    echo [*] 首次运行检测：正在安装前端轻量构建依赖...
    call npm --prefix frontend/web install
    if errorlevel 1 (
        echo [错误] 前端依赖安装失败，请检查网络或权限。
        pause
        exit /b 1
    )
)

if not exist "frontend\web\dist\index.html" (
    echo [*] 检测到全站静态构建产物缺失，正在执行全量静态编译 (npm run build)...
    call npm run build
    if errorlevel 1 (
        echo [错误] 静态站点编译失败，请根据终端报错排查。
        pause
        exit /b 1
    )
    echo [+] 静态产物编译成功！
)

:: 3. 动态端口防冲突探测 (从 3000 开始自动探测首个可用端口)
echo [*] 正在探测本地可用服务端口...
for /f %%p in ('node -e "const net=require('net');let p=3000;function c(port){const s=net.createServer();s.once('error',()=>c(port+1));s.once('listening',()=>{s.close(()=>console.log(port));});s.listen(port);}c(p);"') do set "PORT=%%p"

echo [+] 已分配可用端口: !PORT!
set "SITE_URL=http://localhost:!PORT!/"

:: 4. 唤起默认浏览器并启动原生静态预览服务
echo.
echo ======================================================================
echo  服务启动成功！正在自动唤起默认浏览器打开:
echo  !SITE_URL!
echo.
echo  - 处境体检问卷:   !SITE_URL!checkup/
echo  - 微习惯打卡:     !SITE_URL!checkin/
echo  - 场景应对指南:   !SITE_URL!scenario/laid-off/
echo  - 全文极速搜索:   !SITE_URL!search/
echo  - AI 规范接口:    !SITE_URL!llms.txt
echo.
echo  提示: 按 Ctrl+C 可停止本地服务。
echo ======================================================================
echo.

start "" "!SITE_URL!"

set PORT=!PORT!
npm run preview
