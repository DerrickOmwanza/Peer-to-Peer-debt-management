package com.example.peertopeer.data.repository

import com.example.peertopeer.data.model.RiskScore
import com.example.peertopeer.data.network.ApiClient

class RiskScoreRepository {
    private val apiService = ApiClient.getApiService()

    suspend fun getRiskScore(userId: String): Result<RiskScore> = try {
        val response = apiService.getRiskScore(userId)
        if (response.success && response.data != null) {
            Result.success(response.data)
        } else {
            Result.failure(Exception(response.message ?: "Unknown error"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
