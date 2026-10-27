@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if %errorlevel%==0 (
  python serve.py
  goto :end
)

where py >nul 2>nul
if %errorlevel%==0 (
  py serve.py
  goto :end
)

echo.
echo  No se encontro Python en este equipo.
echo  Puedes servir la pagina con:  npx serve .
echo.
pause

:end
endlocal
