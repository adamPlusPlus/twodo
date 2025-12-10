@echo off
echo Checking server status...

REM Check if port 8000 is in use
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo Server is running. Restarting...
    REM Get the PID of the process using port 8000
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING" ^| head -1') do set SERVER_PID=%%a
    if defined SERVER_PID (
        echo Killing existing server process (PID: %SERVER_PID%)...
        taskkill /PID %SERVER_PID% /F >nul 2>&1
        timeout /t 2 /nobreak >nul
    )
) else (
    echo Server is not running. Starting...
)

REM Kill any remaining python processes that might be related to our server
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FI "WINDOWTITLE eq server.py*" ^| findstr "python.exe"') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo Starting twodo server on port 8000...
start /B python3 server.py 8000 > server.log 2>&1
timeout /t 2 /nobreak >nul

REM Verify it's running
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Server started successfully!
    echo Access the app at: http://localhost:8000
    echo Check server.log for output.
) else (
    echo ❌ Server failed to start. Check server.log for errors.
    exit /b 1
)
