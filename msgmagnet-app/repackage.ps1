$ErrorActionPreference = "Stop"
Write-Host "--- Repackaging APK ---"

Set-Location "M:\"

# Update APK with newly generated JS bundle
& jar -uf M:\msgmagnet-unaligned.apk -C M:\apk_decoded assets/index.android.bundle
if (Test-Path M:\msgmagnet-aligned.apk) {
    Remove-Item -Force M:\msgmagnet-aligned.apk
}

& C:\Users\Hydizo\AppData\Local\Android\Sdk\build-tools\35.0.0\zipalign.exe -p -f 4 M:\msgmagnet-unaligned.apk M:\msgmagnet-aligned.apk
cmd.exe /c "C:\Users\Hydizo\AppData\Local\Android\Sdk\build-tools\35.0.0\apksigner.bat sign --ks M:\android\app\debug.keystore --ks-pass pass:android --key-pass pass:android --out M:\msgmagnet-release.apk M:\msgmagnet-aligned.apk"

Write-Host "--- Updating AAB ---"
if (-not (Test-Path M:\aab_staging\base\assets)) {
    New-Item -ItemType Directory -Force -Path M:\aab_staging\base\assets | Out-Null
}
Copy-Item M:\apk_decoded\assets\index.android.bundle M:\aab_staging\base\assets\index.android.bundle -Force
& jar -uf M:\app-release.aab -C M:\aab_staging base/assets/index.android.bundle
& jarsigner -keystore M:\android\app\debug.keystore -storepass android -keypass android M:\app-release.aab androiddebugkey

# Sync to all output directories including Downloads root
$now = Get-Date
$aabTargets = @(
    'M:\app-release.aab',
    'M:\android\app\build\outputs\bundle\release\app-release.aab',
    'C:\Users\Hydizo\Downloads\app-release.aab'
)

foreach ($target in $aabTargets) {
    if ($target -ne 'M:\app-release.aab') {
        Copy-Item 'M:\app-release.aab' $target -Force
    }
    (Get-Item $target).CreationTime = $now
    (Get-Item $target).LastWriteTime = $now
}

# Copy APK to Downloads root
Copy-Item 'M:\msgmagnet-release.apk' 'C:\Users\Hydizo\Downloads\msgmagnet-release.apk' -Force
(Get-Item 'M:\msgmagnet-release.apk').CreationTime = $now
(Get-Item 'M:\msgmagnet-release.apk').LastWriteTime = $now
(Get-Item 'C:\Users\Hydizo\Downloads\msgmagnet-release.apk').CreationTime = $now
(Get-Item 'C:\Users\Hydizo\Downloads\msgmagnet-release.apk').LastWriteTime = $now

Write-Host "--- Installing on Phone (4700e068) ---"
& adb -s 4700e068 push M:\msgmagnet-release.apk /data/local/tmp/app.apk
& adb -s 4700e068 shell pm install -r -d /data/local/tmp/app.apk
& adb -s 4700e068 shell am start -n com.msgmagnet.app/.MainActivity

Write-Host "--- Done! All files synchronized ---"
Get-Item 'C:\Users\Hydizo\Downloads\app-release.aab',
         'M:\app-release.aab',
         'M:\android\app\build\outputs\bundle\release\app-release.aab',
         'C:\Users\Hydizo\Downloads\msgmagnet-release.apk' | 
Select-Object FullName, Length, LastWriteTime | Format-Table
