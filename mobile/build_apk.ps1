# HRMS Mobile APK Build Script
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Building HRMS Multi-Tenant SaaS Mobile APK...   " -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Resolve Flutter Path
$flutterCmd = "flutter"
if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\flutter\bin\flutter.bat") {
        $flutterCmd = "C:\flutter\bin\flutter.bat"
    } elseif (Test-Path "C:\HRMS\flutter_sdk\bin\flutter.bat") {
        $flutterCmd = "C:\HRMS\flutter_sdk\bin\flutter.bat"
    } else {
        Write-Host "ERROR: Flutter SDK not found." -ForegroundColor Red
        Write-Host "Downloading Flutter SDK... Please wait." -ForegroundColor Yellow
        Exit 1
    }
}

# 2. Resolve Android SDK Path
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"
if (Test-Path $androidSdk) {
    $env:ANDROID_HOME = $androidSdk
    $env:ANDROID_SDK_ROOT = $androidSdk
}

# 3. Resolve Java JDK Path
$javaSdk = "$env:LOCALAPPDATA\Java\jdk-17\jdk-17.0.10+7"
if (-not (Test-Path $javaSdk)) {
    $javaSdk = "$env:LOCALAPPDATA\Java\jdk-17"
}
if (Test-Path $javaSdk) {
    $env:JAVA_HOME = $javaSdk
    $env:Path = "$javaSdk\bin;$env:Path"
}

Write-Host "`n1. Fetching Flutter Dependencies..." -ForegroundColor Yellow
& $flutterCmd pub get

Write-Host "`n2. Compiling Release Android APK..." -ForegroundColor Yellow
& $flutterCmd build apk --release

if (Test-Path "build\app\outputs\flutter-apk\app-release.apk") {
    Write-Host "`n=================================================" -ForegroundColor Green
    Write-Host " SUCCESS! Production APK compiled to:" -ForegroundColor Green
    Write-Host " c:\HRMS\mobile\build\app\outputs\flutter-apk\app-release.apk" -ForegroundColor White
    Write-Host "=================================================" -ForegroundColor Green
} else {
    Write-Host "`nBuild process finished. Check output directory." -ForegroundColor Yellow
}
