package com.example.peertopeer.data.network

import com.example.peertopeer.data.model.*
import retrofit2.http.*

interface ApiService {
    // User Authentication
    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): LoginResponse

    // Risk Score
    @GET("api/users/{id}/score")
    suspend fun getRiskScore(@Path("id") userId: String): RiskScoreResponse

    // Disputes
    @POST("api/disputes/create")
    suspend fun submitDispute(@Body request: DisputeRequest): DisputeResponse

    @GET("api/disputes/{id}")
    suspend fun getDisputeAnalysis(@Path("id") disputeId: String): DisputeResponse

    @GET("api/disputes")
    suspend fun getAllDisputes(): DisputeListResponse

    // Loans
    @POST("api/loans/create")
    suspend fun createLoan(@Body request: CreateLoanRequest): LoanResponse

    @GET("api/loans/{id}")
    suspend fun getLoan(@Path("id") loanId: String): LoanResponse

    @GET("api/users/{id}/loans")
    suspend fun getUserLoans(@Path("id") userId: String): LoansListResponse
}

data class LoginRequest(
    val email: String,
    val password: String
)

data class LoginResponse(
    val success: Boolean,
    val token: String?,
    val user: User?,
    val message: String?
)

data class RegisterRequest(
    val name: String,
    val email: String,
    val password: String,
    val phone: String
)

data class LoanResponse(
    val success: Boolean,
    val data: Loan?,
    val message: String?
)

data class LoansListResponse(
    val success: Boolean,
    val data: List<Loan>?,
    val message: String?
)

data class DisputeListResponse(
    val success: Boolean,
    val data: List<Dispute>?,
    val message: String?
)
