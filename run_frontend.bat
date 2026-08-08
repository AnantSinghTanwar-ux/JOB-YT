@echo off
title Hiring Platform - Frontend
echo ==========================================
echo Starting Hiring Platform Frontend...
echo ==========================================
cd /d "%~dp0frontend"

if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

echo Running development server...
call npm run dev

pause
