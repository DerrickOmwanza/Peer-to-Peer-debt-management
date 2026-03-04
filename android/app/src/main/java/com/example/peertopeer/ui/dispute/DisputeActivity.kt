package com.example.peertopeer.ui.dispute

import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.example.peertopeer.R

class DisputeActivity : AppCompatActivity() {
    private lateinit var viewModel: DisputeViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_dispute)

        viewModel = ViewModelProvider(this).get(DisputeViewModel::class.java)

        val loanId = intent.getStringExtra("LOAN_ID") ?: "loan456"
        val reasonInput: EditText = findViewById(R.id.reasonInput)
        val evidenceInput: EditText = findViewById(R.id.evidenceInput)
        val submitButton: Button = findViewById(R.id.submitButton)
        val disputeResult: TextView = findViewById(R.id.disputeResult)

        submitButton.setOnClickListener {
            val reason = reasonInput.text.toString()
            val evidence = evidenceInput.text.toString()

            if (reason.isNotEmpty() && evidence.isNotEmpty()) {
                viewModel.submitDispute(loanId, reason, evidence)
            } else {
                disputeResult.text = "Please fill in all fields"
            }
        }

        viewModel.disputeResult.observe(this) { dispute ->
            val analysis = dispute.novaAnalysis
            val result = """
                Dispute ID: ${dispute.id}
                Summary: ${analysis?.summary}
                Confidence: ${analysis?.confidence}
                Recommendation: ${analysis?.recommendation}
            """.trimIndent()
            disputeResult.text = result
        }

        viewModel.error.observe(this) { error ->
            disputeResult.text = "Error: $error"
        }
    }
}
