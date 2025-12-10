# PowerShell script to start HTTP and WebSocket servers
# Usage: .\start-servers.ps1 [-Foreground] [-Background]
# Default: Background mode (no windows, output to log files)

param(
    [switch]$Foreground,
    [switch]$Background
)

# Default to background if no flag specified
if (-not $Foreground -and -not $Background) {
    $Background = $true
}

# Function to kill process using a port and close its parent PowerShell window
function Kill-ProcessOnPort {
    param([int]$Port)
    
    $connections = netstat -ano | Select-String ":$Port.*LISTENING"
    foreach ($connection in $connections) {
        $parts = $connection -split '\s+'
        if ($parts.Count -gt 4) {
            $processId = $parts[-1]
            if ($processId -match '^\d+$') {
                try {
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "Killing process $processId ($($process.ProcessName)) on port $Port"
                        
                        # Try to find the parent PowerShell process
                        $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId = $processId" | Select-Object -ExpandProperty ParentProcessId -ErrorAction SilentlyContinue)
                        if ($parentId) {
                            $parentProcess = Get-Process -Id $parentId -ErrorAction SilentlyContinue
                            if ($parentProcess -and $parentProcess.ProcessName -eq "powershell") {
                                Write-Host "  Closing parent PowerShell window (PID: $parentId)"
                                # Close the PowerShell window gracefully
                                $parentProcess.CloseMainWindow() | Out-Null
                                Start-Sleep -Milliseconds 500
                                # Force kill if it didn't close
                                if (!$parentProcess.HasExited) {
                                    Stop-Process -Id $parentId -Force -ErrorAction SilentlyContinue
                                }
                            }
                        }
                        
                        # Kill the Python process
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    }
                } catch {
                    Write-Host "  Error killing process $processId : $_"
                }
            }
        }
    }
}

# Kill existing servers by port
Write-Host "Stopping existing servers..."

# Kill processes on ports 8000 and 8001
Kill-ProcessOnPort -Port 8000
Kill-ProcessOnPort -Port 8001

# Also try to kill any remaining Python processes that might be running the servers
$pythonProcesses = Get-Process python,python3 -ErrorAction SilentlyContinue
foreach ($proc in $pythonProcesses) {
    try {
        $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" | Select-Object -ExpandProperty CommandLine -ErrorAction SilentlyContinue)
        if ($cmdLine -and ($cmdLine -match "server\.py|websocket_server\.py")) {
            Write-Host "Killing Python server process $($proc.Id)"
            $parentId = (Get-CimInstance Win32_Process -Filter "ProcessId = $($proc.Id)" | Select-Object -ExpandProperty ParentProcessId -ErrorAction SilentlyContinue)
            if ($parentId) {
                $parentProcess = Get-Process -Id $parentId -ErrorAction SilentlyContinue
                if ($parentProcess -and $parentProcess.ProcessName -eq "powershell") {
                    Write-Host "  Closing parent PowerShell window (PID: $parentId)"
                    $parentProcess.CloseMainWindow() | Out-Null
                    Start-Sleep -Milliseconds 500
                    if (!$parentProcess.HasExited) {
                        Stop-Process -Id $parentId -Force -ErrorAction SilentlyContinue
                    }
                }
            }
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # Ignore errors
    }
}

# Wait a moment for processes to terminate and ports to be released
Start-Sleep -Seconds 2

# Get the current directory (where this script is located)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if ($Foreground) {
    # Foreground mode: Start servers in separate visible windows
    Write-Host "Starting servers in foreground mode (separate windows)..." -ForegroundColor Cyan
    
    # Start HTTP server in a new window
    Write-Host "Starting HTTP server on port 8000..."
    Start-Process powershell -ArgumentList "-Command", "cd '$scriptDir'; Write-Host 'HTTP Server (Port 8000)'; Write-Host '=================='; python3 server.py 8000; Write-Host ''; Write-Host 'Server stopped. Window will close in 3 seconds...'; Start-Sleep -Seconds 3"
    
    # Wait a moment before starting the second server
    Start-Sleep -Seconds 1
    
    # Start WebSocket server in a new window
    Write-Host "Starting WebSocket server on port 8001..."
    Start-Process powershell -ArgumentList "-Command", "cd '$scriptDir'; Write-Host 'WebSocket Server (Port 8001)'; Write-Host '=================='; python3 websocket_server.py 8001; Write-Host ''; Write-Host 'Server stopped. Window will close in 3 seconds...'; Start-Sleep -Seconds 3"
    
    Write-Host ""
    Write-Host "Servers started in separate windows." -ForegroundColor Green
    Write-Host "Close the server windows to stop the servers."
    Write-Host ""
} else {
    # Background mode: Start servers without windows, output to log files
    Write-Host "Starting servers in background mode (output to log files)..." -ForegroundColor Cyan
    
    # Start HTTP server in background
    Write-Host "Starting HTTP server on port 8000..."
    Start-Process python3 -ArgumentList "server.py", "8000" -WindowStyle Hidden -RedirectStandardOutput "server.log" -RedirectStandardError "server.log"
    
    # Wait a moment before starting the second server
    Start-Sleep -Seconds 1
    
    # Start WebSocket server in background
    Write-Host "Starting WebSocket server on port 8001..."
    Start-Process python3 -ArgumentList "websocket_server.py", "8001" -WindowStyle Hidden -RedirectStandardOutput "websocket_server.log" -RedirectStandardError "websocket_server.log"
    
    # Wait a moment for servers to start
    Start-Sleep -Seconds 2
    
    # Verify servers are running
    $httpRunning = netstat -ano | Select-String ":8000.*LISTENING"
    $wsRunning = netstat -ano | Select-String ":8001.*LISTENING"
    
    Write-Host ""
    if ($httpRunning) {
        Write-Host "✅ HTTP server started successfully on port 8000" -ForegroundColor Green
        Write-Host "   Access at: http://localhost:8000"
        Write-Host "   Logs: server.log"
    } else {
        Write-Host "❌ HTTP server failed to start. Check server.log for errors." -ForegroundColor Red
    }
    
    if ($wsRunning) {
        Write-Host "✅ WebSocket server started successfully on port 8001" -ForegroundColor Green
        Write-Host "   WebSocket at: ws://localhost:8001"
        Write-Host "   Logs: websocket_server.log"
    } else {
        Write-Host "❌ WebSocket server failed to start. Check websocket_server.log for errors." -ForegroundColor Red
        Write-Host "   Note: Make sure websockets package is installed: pip install websockets"
    }
    
    Write-Host ""
    Write-Host "Servers running in background. Use 'Get-Process python3' to see processes." -ForegroundColor Yellow
    Write-Host "To stop servers, use: Get-Process python3 | Where-Object {$_.Path -like '*server.py*'} | Stop-Process"
    Write-Host "Or run this script again to restart them."
    Write-Host ""
}
