@echo off
chcp 65001 >nul
title Elle İt Parkur
cd /d "%~dp0"

rem Python'u bul: önce "py" başlatıcısı, yoksa "python"
set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY (
    python --version >nul 2>&1 && set "PY=python"
)
if not defined PY goto python_yok

%PY% sunucu.py
if errorlevel 1 pause
exit /b

:python_yok
echo.
echo  Python bulunamadı.
echo  1) https://www.python.org/downloads/ adresinden Python'u indir.
echo  2) Kurulumun ilk ekranında "Add python.exe to PATH" kutusunu işaretle.
echo  3) Kurulum bitince bu dosyaya tekrar çift tıkla.
echo.
pause
