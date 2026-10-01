@echo off
chcp 936 >nul
title TaffyPK - WATCH (close this window to stop)
cd /d "D:\塔菲PK"
echo  守护模式：页面刷新/切换作业后会自动重新注入
echo  这个窗口别关，关了守护就停了（脚本本身还会留在客户端里）
echo.
node ets-pk-auto.js watch