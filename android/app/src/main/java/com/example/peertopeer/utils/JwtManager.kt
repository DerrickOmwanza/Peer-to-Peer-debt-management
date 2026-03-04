package com.example.peertopeer.utils

import android.content.Context
import android.content.SharedPreferences

class JwtManager(context: Context) {
    private val sharedPreferences: SharedPreferences = 
        context.getSharedPreferences("auth", Context.MODE_PRIVATE)

    private companion object {
        const val TOKEN_KEY = "jwt_token"
        const val USER_ID_KEY = "user_id"
    }

    fun saveToken(token: String) {
        sharedPreferences.edit().putString(TOKEN_KEY, token).apply()
    }

    fun getToken(): String? = sharedPreferences.getString(TOKEN_KEY, null)

    fun saveUserId(userId: String) {
        sharedPreferences.edit().putString(USER_ID_KEY, userId).apply()
    }

    fun getUserId(): String? = sharedPreferences.getString(USER_ID_KEY, null)

    fun clearAuth() {
        sharedPreferences.edit().clear().apply()
    }

    fun isLoggedIn(): Boolean = getToken() != null
}
