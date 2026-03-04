package com.example.peertopeer.ui.risk

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.peertopeer.data.model.RiskScore
import com.example.peertopeer.data.repository.RiskScoreRepository
import kotlinx.coroutines.launch

class RiskScoreViewModel : ViewModel() {
    private val repository = RiskScoreRepository()

    private val _riskScore = MutableLiveData<RiskScore>()
    val riskScore: LiveData<RiskScore> = _riskScore

    private val _error = MutableLiveData<String>()
    val error: LiveData<String> = _error

    private val _loading = MutableLiveData<Boolean>()
    val loading: LiveData<Boolean> = _loading

    fun getRiskScore(userId: String) {
        _loading.value = true
        viewModelScope.launch {
            val result = repository.getRiskScore(userId)
            result.onSuccess { score ->
                _riskScore.value = score
                _loading.value = false
            }
            result.onFailure { exception ->
                _error.value = exception.message ?: "Unknown error"
                _loading.value = false
            }
        }
    }
}
