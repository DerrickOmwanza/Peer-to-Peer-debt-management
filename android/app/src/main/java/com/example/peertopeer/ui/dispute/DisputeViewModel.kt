package com.example.peertopeer.ui.dispute

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.peertopeer.data.model.Dispute
import com.example.peertopeer.data.model.DisputeRequest
import com.example.peertopeer.data.repository.DisputeRepository
import kotlinx.coroutines.launch

class DisputeViewModel : ViewModel() {
    private val repository = DisputeRepository()

    private val _disputeResult = MutableLiveData<Dispute>()
    val disputeResult: LiveData<Dispute> = _disputeResult

    private val _error = MutableLiveData<String>()
    val error: LiveData<String> = _error

    private val _loading = MutableLiveData<Boolean>()
    val loading: LiveData<Boolean> = _loading

    fun submitDispute(loanId: String, reason: String, evidence: String) {
        _loading.value = true
        val request = DisputeRequest(loanId, reason, evidence)
        viewModelScope.launch {
            val result = repository.submitDispute(request)
            result.onSuccess { dispute ->
                _disputeResult.value = dispute
                _loading.value = false
            }
            result.onFailure { exception ->
                _error.value = exception.message ?: "Unknown error"
                _loading.value = false
            }
        }
    }
}
