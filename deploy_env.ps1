$APP_NAME = "nyayasetu-api"
$RESOURCE_GROUP = "ai_for_bharat"

# Parse .env — skip blank lines and comments, strip surrounding quotes
$settings = @()
Get-Content ".env" | Where-Object { $_ -match '^\s*[^#\s]' -and $_ -match '=' } | ForEach-Object {
    $idx   = $_.IndexOf('=')
    $key   = $_.Substring(0, $idx).Trim()
    $value = $_.Substring($idx + 1).Trim()
    # Strip one layer of surrounding single or double quotes
    if (($value.StartsWith("'") -and $value.EndsWith("'")) -or
        ($value.StartsWith('"') -and $value.EndsWith('"'))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    if ($key -and $value) {
        $settings += [PSCustomObject]@{ name = $key; value = $value; slotSetting = $false }
    }
}

Write-Host "Pushing $($settings.Count) env vars to $APP_NAME..."

# Write to a temp JSON file — avoids all PowerShell special-character issues
$tmpJson = "$env:TEMP\nyayasetu_appsettings.json"
$settings | ConvertTo-Json | Out-File -FilePath $tmpJson -Encoding utf8

az webapp config appsettings set `
    --name $APP_NAME `
    --resource-group $RESOURCE_GROUP `
    --settings "@$tmpJson"

Remove-Item $tmpJson
Write-Host "Done."
