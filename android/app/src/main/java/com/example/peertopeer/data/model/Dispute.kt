package com.example.peertopeer.data.model

data class Dispute(
    val id: String,
    val loanId: String,
    val reason: String,
    val evidence: String,
    val status: String,
    val novaAnalysis: NovaAnalysis?,
    val createdAt: String
)

data class NovaAnalysis(
    val summary: String,
    val confidence: Double,
    val flags: List<String>,
    val recommendation: String
)

data class DisputeRequest(
    val loanId: String,
    val reason: String,
    val evidence: String
)

data class DisputeResponse(
    val success: Boolean,
    val data: Dispute?,
    val message: String?
)
