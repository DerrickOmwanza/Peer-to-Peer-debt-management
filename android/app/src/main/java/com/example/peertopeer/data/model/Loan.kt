package com.example.peertopeer.data.model

import com.google.gson.annotations.SerializedName

data class Loan(
    val id: String,
    val borrowerId: String,
    val lenderId: String,
    val amount: Double,
    val status: String,
    val reason: String,
    val dueDate: String,
    val createdAt: String
)

data class CreateLoanRequest(
    val borrowerId: String,
    val amount: Double,
    val reason: String,
    val dueDate: String
)
