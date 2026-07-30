@echo off
chcp 65001 >nul
title Zaiken
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Download: https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\electron" (
  echo Installing dependencies first time...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
)

echo Starting Zaiken...
call npx --yes electron .
if errorlevel 1 pause
