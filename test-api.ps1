# API Testing Script for PowerShell
# This script tests all backend endpoints

$baseURL = "http://localhost:5000"

Write-Host "🧪 P2P Debt Management - API Testing" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseURL/api/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Success" -ForegroundColor Green
    Write-Host $response.Content
}
catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 2: Register Borrower" -ForegroundColor Cyan
try {
    $body = @{
        full_name = "John Borrower"
        email = "john@example.com"
        phone_number = "+254701234567"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseURL/api/auth/register" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ Success" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "Token: $($content.token)"
    Write-Host "User: $($content.user.full_name)"
    
    # Save token for later tests
    $script:johnToken = $content.token
}
catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 3: Register Lender" -ForegroundColor Cyan
try {
    $body = @{
        full_name = "Jane Lender"
        email = "jane@example.com"
        phone_number = "+254702345678"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseURL/api/auth/register" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ Success" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "Token: $($content.token)"
    Write-Host "User: $($content.user.full_name)"
    
    $script:janeToken = $content.token
}
catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test 4: Login as John" -ForegroundColor Cyan
try {
    $body = @{
        email = "john@example.com"
        password = "password123"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "$baseURL/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body $body `
        -ErrorAction Stop

    Write-Host "✅ Success" -ForegroundColor Green
    $content = $response.Content | ConvertFrom-Json
    Write-Host "Login successful for: $($content.user.full_name)"
}
catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Green
Write-Host "🎉 Basic tests complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Check results above" -ForegroundColor Yellow
Write-Host "2. If all passed ✅ - run frontend tests" -ForegroundColor Yellow
Write-Host "3. If any failed ❌ - check backend logs" -ForegroundColor Yellow
