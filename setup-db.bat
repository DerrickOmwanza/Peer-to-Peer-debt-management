@echo off
cls
echo.
echo ========================================
echo M-PESA Debt Allocation - Database Setup
echo ========================================
echo.

REM Get PostgreSQL password from user
set /p DB_PASSWORD="Enter your PostgreSQL password: "

REM Create database
echo.
echo Creating database 'mpesa_debt'...
set PGPASSWORD=%DB_PASSWORD%
"C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres -h localhost mpesa_debt

if %ERRORLEVEL% EQU 0 (
    echo ✓ Database created successfully
    echo.
    echo Next steps:
    echo 1. Update .env with your PostgreSQL password
    echo 2. Run: npm run db:init
    echo 3. Run: npm run dev
) else (
    echo ✗ Failed to create database
    echo Check your PostgreSQL password and try again
    pause
)

pause
