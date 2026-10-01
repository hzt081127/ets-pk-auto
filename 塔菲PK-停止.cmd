@echo off
chcp 936 >nul
title TaffyPK - STOP
cd /d "D:\塔菲PK"
echo 正在停止 塔菲PK脚本 并清理...
node ets-pk-auto.js uninstall
echo 已停止。
ping -n 2 127.0.0.1 >nul