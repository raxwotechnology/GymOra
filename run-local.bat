@echo off
echo Starting FitnessHub Local Environment...

echo [1/1] Starting Client and Server concurrently...
npm run install:all && npm run dev

pause
