package com.example.peertopeer.data.model

data class RiskScore(
    val userId: String,
    val score: Int,
    val band: String,
    val reasoning: String,
    val factors: List<String>
)

data class RiskScoreResponse(
    val success: Boolean,
    val data: RiskScore?,
    val message: String?
)
