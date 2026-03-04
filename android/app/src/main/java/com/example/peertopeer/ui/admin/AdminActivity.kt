package com.example.peertopeer.ui.admin

import android.os.Bundle
import android.widget.ListView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.example.peertopeer.R

class AdminActivity : AppCompatActivity() {
    private lateinit var viewModel: AdminViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_admin)

        viewModel = ViewModelProvider(this).get(AdminViewModel::class.java)

        val disputeQueue: ListView = findViewById(R.id.disputeQueue)
        val disputeDetail: TextView = findViewById(R.id.disputeDetail)

        viewModel.loadDisputes()

        viewModel.disputeQueue.observe(this) { disputes ->
            // TODO: Implement adapter for dispute list
            val summary = disputes.joinToString("\n") { "${it.id}: ${it.reason}" }
            disputeDetail.text = summary
        }

        viewModel.error.observe(this) { error ->
            disputeDetail.text = "Error: $error"
        }
    }
}
