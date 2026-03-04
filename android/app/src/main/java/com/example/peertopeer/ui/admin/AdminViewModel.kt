package com.example.peertopeer.ui.admin

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.peertopeer.data.model.Dispute
import com.example.peertopeer.data.repository.DisputeRepository
import kotlinx.coroutines.launch

class AdminViewModel : ViewModel() {
    private val repository = DisputeRepository()

    private val _disputeQueue = MutableLiveData<List<Dispute>>()
    val disputeQueue: LiveData<List<Dispute>> = _disputeQueue

    private val _error = MutableLiveData<String>()
    val error: LiveData<String> = _error

    private val _loading = MutableLiveData<Boolean>()
    val loading: LiveData<Boolean> = _loading

    fun loadDisputes() {
        _loading.value = true
        viewModelScope.launch {
            val result = repository.getAllDisputes()
            result.onSuccess { disputes ->
                _disputeQueue.value = disputes
                _loading.value = false
            }
            result.onFailure { exception ->
                _error.value = exception.message ?: "Unknown error"
                _loading.value = false
            }
        }
    }
}
