@echo off
chcp 936 >nul
title TaffyPK - START/PAUSE
cd /d "D:\Ëþ·ÆPK"
echo  Ëþ·ÆPK½Å±¾ - ¿ª¹Ø£¨Ë«»÷Ò»´ÎÇÐ»» ¿ªÊ¼/ÔÝÍ££©
echo.
node ets-pk-auto.js toggle
ping -n 2 127.0.0.1 >nul