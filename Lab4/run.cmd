@echo off
setlocal
cd /d "%~dp0"
echo Lab4: close Calculator windows, switch keyboard to English.
echo Do not use mouse/keyboard during automation. Clipboard will be replaced.
echo 1 - script1: 9*6
 echo 2 - script2: hexadecimal addition
 echo 3 - script3: expressions from text1.txt
choice /c 123 /n /m "Select 1, 2 or 3: "
set "selection=%errorlevel%"
if "%selection%"=="1" cscript.exe //nologo script1.vbs
if "%selection%"=="2" cscript.exe //nologo script2.vbs
if "%selection%"=="3" cscript.exe //nologo //E:JScript script3.js
set "result=%errorlevel%"
echo Exit code: %result%
pause
exit /b %result%
