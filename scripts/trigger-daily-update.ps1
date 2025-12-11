# Script to manually trigger daily data update

$SUPABASE_URL = "https://decpkvusmzbgdxmwmwbm.supabase.co"
$SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlY3BrdnVzbXpiZ2R4bXdtd2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MjgwMzQsImV4cCI6MjA4MDIwNDAzNH0.YzIC6odWqrwCON48oTzf2M6nz-i9pJu-g1c_5MEn5gQ"

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $SUPABASE_ANON_KEY"
}

$body = @{
    force = $true
} | ConvertTo-Json

Write-Host "Triggering daily data update..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "$SUPABASE_URL/functions/v1/update-daily-data" -Method Post -Headers $headers -Body $body
    Write-Host "Success!" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Yellow
    }
}
