package com.example.peertopeer.ui.risk

import android.os.Bundle
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.ViewModelProvider
import com.example.peertopeer.R

class RiskScoreActivity : AppCompatActivity() {
    private lateinit var viewModel: RiskScoreViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_risk_score)

        viewModel = ViewModelProvider(this).get(RiskScoreViewModel::class.java)

        val borrowerId = intent.getStringExtra("BORROWER_ID") ?: "user123"
        val progressBar: ProgressBar = findViewById(R.id.riskScoreProgress)
        val scoreValue: TextView = findViewById(R.id.riskScoreValue)
        val band: TextView = findViewById(R.id.riskScoreBand)
        val reasoning: TextView = findViewById(R.id.riskScoreReasoning)

        viewModel.getRiskScore(borrowerId)

        viewModel.riskScore.observe(this) { score ->
            progressBar.progress = score.score
            scoreValue.text = "Score: ${score.score}"
            band.text = "Risk Band: ${score.band}"
            reasoning.text = "Reasoning: ${score.reasoning}"
        }

        viewModel.error.observe(this) { error ->
            reasoning.text = "Error: $error"
        }
    }
}
