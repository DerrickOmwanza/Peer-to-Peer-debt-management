package com.example.peertopeer.data.repository

import com.example.peertopeer.data.model.Dispute
import com.example.peertopeer.data.model.DisputeRequest
import com.example.peertopeer.data.network.ApiClient

class DisputeRepository {
    private val apiService = ApiClient.getApiService()

    suspend fun submitDispute(request: DisputeRequest): Result<Dispute> = try {
        val response = apiService.submitDispute(request)
        if (response.success && response.data != null) {
            Result.success(response.data)
        } else {
            Result.failure(Exception(response.message ?: "Unknown error"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }

    suspend fun getDispute(disputeId: String): Result<Dispute> = try {
        val response = apiService.getDisputeAnalysis(disputeId)
        if (response.success && response.data != null) {
            Result.success(response.data)
        } else {
            Result.failure(Exception(response.message ?: "Unknown error"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }

    suspend fun getAllDisputes(): Result<List<Dispute>> = try {
        val response = apiService.getAllDisputes()
        if (response.success && response.data != null) {
            Result.success(response.data)
        } else {
            Result.failure(Exception(response.message ?: "Unknown error"))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
