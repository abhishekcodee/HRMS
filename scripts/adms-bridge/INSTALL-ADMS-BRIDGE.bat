@echo off
rem Double-click this file to install the HRMS ADMS bridge (asks for administrator rights).
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','\"%~dp0install-adms-bridge.ps1\"'"
