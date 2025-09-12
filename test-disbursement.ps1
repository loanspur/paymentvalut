# Test disbursement script to capture balance data
# Replace the phone number below with your actual number

$phoneNumber = "254727638940"  # Replace with your actual phone number (format: 254XXXXXXXXX)
$amount = 10  # Small test amount in KES

Write-Host "Making test disbursement to capture balance data..." -ForegroundColor Green
Write-Host "Phone: $phoneNumber" -ForegroundColor Cyan
Write-Host "Amount: KES $amount" -ForegroundColor Cyan
Write-Host "Partner: Kulman Group Limited" -ForegroundColor Cyan

$disbursementData = @{
    amount = $amount
    msisdn = $phoneNumber
    tenant_id = "KULMAN_TEST"
    customer_id = "TEST_CUST_001"
    client_request_id = "TEST-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    partner_id = "550e8400-e29b-41d4-a716-446655440000"
} | ConvertTo-Json

Write-Host "`nSending disbursement request..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/disburse" -Method POST -ContentType "application/json" -Headers @{"x-api-key"="kulmna_sk_live_1234567890abcdef"} -Body $disbursementData -UseBasicParsing
    
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "`nDisbursement Response:" -ForegroundColor Green
    Write-Host "=======================" -ForegroundColor Green
    $result | ConvertTo-Json -Depth 10
    
    if ($result.status -eq "success" -or $result.status -eq "pending" -or $result.status -eq "accepted") {
        Write-Host "`nSUCCESS: Disbursement initiated successfully!" -ForegroundColor Green
        Write-Host "The system should now capture balance data from M-Pesa API" -ForegroundColor Yellow
        
        Write-Host "`nWaiting 5 seconds before checking balance..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
        
        Write-Host "`nChecking balance after disbursement..." -ForegroundColor Cyan
        
        $balanceResponse = Invoke-WebRequest -Uri "http://localhost:3000/api/balance-monitor" -Method POST -ContentType "application/json" -UseBasicParsing
        $balanceResult = $balanceResponse.Content | ConvertFrom-Json
        
        Write-Host "`nBalance Check Results:" -ForegroundColor Green
        $balanceResult | ConvertTo-Json -Depth 10
        
    } else {
        Write-Host "`nERROR: Disbursement failed:" -ForegroundColor Red
        Write-Host "Error: $($result.error_message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "`nERROR: Error making disbursement: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nINSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "=============" -ForegroundColor Yellow
Write-Host "1. Update the phoneNumber variable at the top of this script" -ForegroundColor White
Write-Host "2. Use format: 254XXXXXXXXX (Kenya phone number format)" -ForegroundColor White
Write-Host "3. Run: .\test-disbursement.ps1" -ForegroundColor White
