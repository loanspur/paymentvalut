# Test Slack webhook integration
# Replace the webhook URL below with your actual Slack webhook URL

$webhookUrl = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"  # Replace with your actual webhook URL

Write-Host "Testing Slack webhook integration..." -ForegroundColor Green
Write-Host "Webhook URL: $webhookUrl" -ForegroundColor Cyan

# Test with GET request
Write-Host "`nTesting with GET request..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/test-slack?webhook_url=$webhookUrl" -Method GET -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "GET Response:" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 3
} catch {
    Write-Host "GET Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test with POST request
Write-Host "`nTesting with POST request..." -ForegroundColor Yellow
try {
    $testData = @{
        webhook_url = $webhookUrl
        message = @{
            text = "🧪 Test message from PowerShell script"
            blocks = @(
                @{
                    type = "section"
                    text = @{
                        type = "mrkdwn"
                        text = "🧪 *PowerShell Test Message*`n`nThis is a test from the PowerShell script to verify Slack integration."
                    }
                }
            )
        }
    } | ConvertTo-Json -Depth 3

    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/test-slack" -Method POST -ContentType "application/json" -Body $testData -UseBasicParsing
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "POST Response:" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 3
} catch {
    Write-Host "POST Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nSlack test completed!" -ForegroundColor Green
Write-Host "`nTo get a Slack webhook URL:" -ForegroundColor Yellow
Write-Host "1. Go to https://api.slack.com/apps" -ForegroundColor White
Write-Host "2. Create a new app or select existing app" -ForegroundColor White
Write-Host "3. Go to 'Incoming Webhooks' and activate them" -ForegroundColor White
Write-Host "4. Click 'Add New Webhook to Workspace'" -ForegroundColor White
Write-Host "5. Select the channel and copy the webhook URL" -ForegroundColor White
