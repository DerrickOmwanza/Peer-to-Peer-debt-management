# P2P Debt Management - Loan Testing Script
# This script manages tokens automatically

Write-Host "🧪 Loan Testing Script" -ForegroundColor Cyan
Write-Host "=====================`n"

# Login as John (Borrower)
Write-Host "Logging in as John Borrower..." -ForegroundColor Yellow
$body = @{email="john@example.com";password="password123"} | ConvertTo-Json
$response = Invoke-WebRequest -Uri http://localhost:5000/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body $body -UseBasicParsing
$johnToken = ($response.Content | ConvertFrom-Json).token
Write-Host "✅ John Token obtained`n"

# Test 5: Create Loan
Write-Host "Test 5: Create Loan Request" -ForegroundColor Yellow
$body = @{lender_phone="+254702345678";principal_amount=5000;repayment_method="fixed";repayment_amount=500;repayment_start_date="2026-03-15"} | ConvertTo-Json
$loanResponse = Invoke-WebRequest -Uri http://localhost:5000/api/loans/request -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $johnToken"} -Body $body -UseBasicParsing
$loanData = $loanResponse.Content | ConvertFrom-Json
$loanId = $loanData.loan.id
Write-Host "✅ Loan Created: $loanId`n"

# Test 6: Get Borrower Loans
Write-Host "Test 6: Get Borrower Loans" -ForegroundColor Yellow
$borrowerLoans = Invoke-WebRequest -Uri http://localhost:5000/api/loans/borrower -Method GET -Headers @{"Authorization"="Bearer $johnToken"} -UseBasicParsing
$loansData = $borrowerLoans.Content | ConvertFrom-Json
Write-Host "✅ Retrieved borrower loans:"
$loansData | ConvertTo-Json -Depth 10
Write-Host ""

# Test 7: Get Loan Details
Write-Host "Test 7: Get Loan Details" -ForegroundColor Yellow
$loanDetails = Invoke-WebRequest -Uri "http://localhost:5000/api/loans/$loanId" -Method GET -Headers @{"Authorization"="Bearer $johnToken"} -UseBasicParsing
$detailsData = $loanDetails.Content | ConvertFrom-Json
Write-Host "✅ Loan Status: $($detailsData.status)"
Write-Host ""

Write-Host "🎉 All loan tests complete!" -ForegroundColor Green
