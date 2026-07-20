@echo off
echo Starting Everyday Tools Local Server...
echo Open your browser at http://localhost:8000
start "" "http://localhost:8000"
python -m http.server 8000
pause
