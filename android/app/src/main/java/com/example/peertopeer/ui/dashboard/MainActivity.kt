package com.example.peertopeer.ui.dashboard

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity
import com.example.peertopeer.R
import com.example.peertopeer.ui.admin.AdminActivity
import com.example.peertopeer.ui.dispute.DisputeActivity
import com.example.peertopeer.ui.risk.RiskScoreActivity

class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val loanButton: Button = findViewById(R.id.loanButton)
        val riskButton: Button = findViewById(R.id.riskButton)
        val disputeButton: Button = findViewById(R.id.disputeButton)
        val adminButton: Button = findViewById(R.id.adminButton)

        loanButton.setOnClickListener {
            // TODO: Implement Loan Creation Activity
        }

        riskButton.setOnClickListener {
            val intent = Intent(this, RiskScoreActivity::class.java)
            intent.putExtra("BORROWER_ID", "user123") // Replace with actual user ID
            startActivity(intent)
        }

        disputeButton.setOnClickListener {
            val intent = Intent(this, DisputeActivity::class.java)
            intent.putExtra("LOAN_ID", "loan456") // Replace with actual loan ID
            startActivity(intent)
        }

        adminButton.setOnClickListener {
            val intent = Intent(this, AdminActivity::class.java)
            startActivity(intent)
        }
    }
}
