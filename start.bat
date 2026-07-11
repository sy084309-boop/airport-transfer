@echo off
echo Starting Airport Transfer System...
start "API Server" cmd /c "cd /d C:\Users\Lenovo\Desktop\airport-transfer\server && npm run dev"
start "Frontend" cmd /c "cd /d C:\Users\Lenovo\Desktop\airport-transfer\client && npx vite --host"
timeout /t 5 >nul
start http://localhost:5173
echo Done! Frontend: http://localhost:5173 | API: http://localhost:3001
echo API auto-restart: ON (tsx watch)
