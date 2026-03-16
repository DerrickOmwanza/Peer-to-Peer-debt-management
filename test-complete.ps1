# P2P Debt Management - Complete Testing Script
# Starts fresh with new users and tests all functionality

Write-Host "🧪 P2P Debt Management - Complete Testing" -ForegroundColor Cyan
Write-Host "=========================================`n"

# Generate unique emails for fresh test
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$borrowerEmail = "borrower_$timestamp@test.com"
$lenderEmail = "lender_$timestamp@test.com"

Write-Host "Test 1: Health Check" -ForegroundColor Yellow
$healthCheck = Invoke-WebRequest -Uri http://localhost:5000/api/health -Method GET -UseBasicParsing
$health = $healthCheck.Content | ConvertFrom-Json
Write-Host "✅ Server Status: $($health.status)`n"

# Test 2: Register New Borrower
Write-Host "Test 2: Register New Borrower" -ForegroundColor Yellow
$borrowerBody = @{full_name="Test Borrower";email=$borrowerEmail;phone_number="+254701234567";password="password123"} | ConvertTo-Json
$borrowerReg = Invoke-WebRequest -Uri http://localhost:5000/api/auth/register -Method POST -Headers @{"Content-Type"="application/json"} -Body $borrowerBody -UseBasicParsing
$borrowerToken = ($borrowerReg.Content | ConvertFrom-Json).token
$borrowerId = (($borrowerReg.Content | ConvertFrom-Json).user).id
Write-Host "✅ Borrower Registered: $borrowerEmail"
Write-Host "   ID: $borrowerId`n"

# Test 3: Register New Lender
Write-Host "Test 3: Register New Lender" -ForegroundColor Yellow
$lenderBody = @{full_name="Test Lender";email=$lenderEmail;phone_number="+254702345678";password="password123"} | ConvertTo-Json
$lenderReg = Invoke-WebRequest -Uri http://localhost:5000/api/auth/register -Method POST -Headers @{"Content-Type"="application/json"} -Body $lenderBody -UseBasicParsing
$lenderToken = ($lenderReg.Content | ConvertFrom-Json).token
$lenderId = (($lenderReg.Content | ConvertFrom-Json).user).id
Write-Host "✅ Lender Registered: $lenderEmail"
Write-Host "   ID: $lenderId`n"

# Test 4: Login as Borrower
Write-Host "Test 4: Login as Borrower" -ForegroundColor Yellow
$loginBody = @{email=$borrowerEmail;password="password123"} | ConvertTo-Json
$loginRes = Invoke-WebRequest -Uri http://localhost:5000/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body $loginBody -UseBasicParsing
$borrowerToken = ($loginRes.Content | ConvertFrom-Json).token
Write-Host "✅ Login Successful for: $borrowerEmail`n"

# Test 5: Create Loan Request
Write-Host "Test 5: Create Loan Request" -ForegroundColor Yellow
$loanBody = @{lender_phone="+254702345678";principal_amount=5000;repayment_method="fixed";repayment_amount=500;repayment_start_date="2026-03-15"} | ConvertTo-Json
$loanRes = Invoke-WebRequest -Uri http://localhost:5000/api/loans/request -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $borrowerToken"} -Body $loanBody -UseBasicParsing
$loanData = $loanRes.Content | ConvertFrom-Json
$loanId = $loanData.loan.id
Write-Host "✅ Loan Created: $loanId"
Write-Host "   Status: $($loanData.loan.status)"
Write-Host "   Amount: $($loanData.loan.principal_amount)`n"

# Test 6: Get Borrower Loans
Write-Host "Test 6: Get Borrower Loans" -ForegroundColor Yellow
$borrowerLoans = Invoke-WebRequest -Uri http://localhost:5000/api/loans/borrower -Method GET -Headers @{"Authorization"="Bearer $borrowerToken"} -UseBasicParsing
$loansData = $borrowerLoans.Content | ConvertFrom-Json
Write-Host "✅ Retrieved $($loansData.Count) loan(s)"
foreach ($loan in $loansData) {
    Write-Host "   - Loan ID: $($loan.id), Status: $($loan.status), Amount: $($loan.principal_amount)"
}
Write-Host ""

# Test 7: Login as Lender
Write-Host "Test 7: Login as Lender" -ForegroundColor Yellow
$lenderLoginBody = @{email=$lenderEmail;password="password123"} | ConvertTo-Json
$lenderLoginRes = Invoke-WebRequest -Uri http://localhost:5000/api/auth/login -Method POST -Headers @{"Content-Type"="application/json"} -Body $lenderLoginBody -UseBasicParsing
$lenderToken = ($lenderLoginRes.Content | ConvertFrom-Json).token
Write-Host "✅ Login Successful for: $lenderEmail`n"

# Test 8: Get Lender Loans
Write-Host "Test 8: Get Lender Loans" -ForegroundColor Yellow
$lenderLoans = Invoke-WebRequest -Uri http://localhost:5000/api/loans/lender -Method GET -Headers @{"Authorization"="Bearer $lenderToken"} -UseBasicParsing
$lenderLoansData = $lenderLoans.Content | ConvertFrom-Json
Write-Host "✅ Retrieved $($lenderLoansData.Count) loan(s) as lender"
foreach ($loan in $lenderLoansData) {
    Write-Host "   - Loan ID: $($loan.id), Status: $($loan.status), Amount: $($loan.principal_amount)"
}
Write-Host ""

# Test 9: Approve Loan
Write-Host "Test 9: Approve Loan (Lender Approval)" -ForegroundColor Yellow
$approvalBody = @{approved=$true} | ConvertTo-Json
try {
    $approvalRes = Invoke-WebRequest -Uri "http://localhost:5000/api/loans/$loanId/approval" -Method PATCH -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $lenderToken"} -Body $approvalBody -UseBasicParsing
    $approvalData = $approvalRes.Content | ConvertFrom-Json
    Write-Host "✅ Loan Approved"
    $approvalRes.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    Write-Host ""
} catch {
    Write-Host "⚠️  Approval endpoint error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
}

# Test 10: Auto-Repayment Trigger (KEY TEST)
Write-Host "Test 10: Auto-Repayment Trigger - Incoming Transaction" -ForegroundColor Yellow
$transactionBody = @{amount=1000;source_phone="+254705555555";description="Payment from client"} | ConvertTo-Json
try {
    $transactionRes = Invoke-WebRequest -Uri http://localhost:5000/api/transactions/incoming -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $borrowerToken"} -Body $transactionBody -UseBasicParsing
    Write-Host "✅ Transaction Processed"
    $transactionRes.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    Write-Host ""
} catch {
    Write-Host "⚠️  Transaction endpoint error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
}

# Test 11: Get Repayment History
Write-Host "Test 11: Get Repayment History" -ForegroundColor Yellow
try {
    $repaymentRes = Invoke-WebRequest -Uri "http://localhost:5000/api/repayments/loan/$loanId" -Method GET -Headers @{"Authorization"="Bearer $borrowerToken"} -UseBasicParsing
    Write-Host "✅ Repayment History:"
    $repaymentRes.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    Write-Host ""
} catch {
    Write-Host "⚠️  Repayment endpoint error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
}

# Test 12: File Dispute
Write-Host "Test 12: File Dispute" -ForegroundColor Yellow
$disputeBody = @{loan_id=$loanId;reason="Terms not agreed";evidence="Messages"} | ConvertTo-Json
try {
    $disputeRes = Invoke-WebRequest -Uri http://localhost:5000/api/disputes/create -Method POST -Headers @{"Content-Type"="application/json"; "Authorization"="Bearer $borrowerToken"} -Body $disputeBody -UseBasicParsing
    Write-Host "✅ Dispute Created:"
    $disputeRes.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
    Write-Host ""
} catch {
    Write-Host "⚠️  Dispute endpoint error: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "🎉 All Tests Complete!" -ForegroundColor Green
Write-Host "=====================`n"
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "- Borrower Email: $borrowerEmail"
Write-Host "- Lender Email: $lenderEmail"
Write-Host "- Loan ID: $loanId"
Write-Host "- Loan Status: pending -> approved (if Test 9 passed)"
Write-Host "- Auto-Repayment: Test 10 status above"
