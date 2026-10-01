@echo off
chcp 936 >nul
title TaffyPK - START
cd /d "D:\塔菲PK"
echo.
echo   塔菲PK脚本 - 正在连接 讯飞E听说 客户端...
echo.
node ets-pk-auto.js install
echo.
echo   ==================================================
echo    已就绪！切到 讯飞E听说 窗口，进入作业并开始后：
echo.
echo      F8  =  开始 / 暂停   (需客户端窗口有焦点)
echo      或双击 塔菲PK-开始暂停.cmd  (不依赖焦点)
echo      F9  =  退出脚本并移除左下角悬浮框
echo   ==================================================
echo.
pause