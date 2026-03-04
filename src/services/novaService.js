/**
 * Amazon Nova Integration Service
 * Handles risk scoring and dispute analysis using Nova 2 Lite
 */

const AWS = require('aws-sdk');

// Initialize Bedrock Runtime
const client = new AWS.BedrockRuntime({
  region: process.env.AWS_REGION || 'us-west-2'
});

const MODEL_ID = 'amazon.nova-lite-v1:0';
const TIMEOUT = 30000; // 30 seconds

/**
 * Get borrower risk score using Nova 2 Lite
 * 
 * INPUT: borrower history (loans, defaults, disputes)
 * OUTPUT: risk score (0-100), risk band, key factors, recommendation
 */
async function getRiskScore(borrowerId, borrowerMetrics) {
  try {
    // Format borrower data for Nova
    const { totalLoans = 0, defaultRate = 0, avgRepaymentDays = 0, loanFrequency = 0, disputeCount = 0 } = borrowerMetrics;

    const prompt = `You are a peer-to-peer lending risk assessment expert. Evaluate the following borrower for creditworthiness:

BORROWER METRICS:
- Total loans issued: ${totalLoans}
- Default rate: ${defaultRate.toFixed(1)}%
- Average repayment time: ${avgRepaymentDays} days
- Loan frequency: ${loanFrequency} loans per quarter
- Disputes filed: ${disputeCount}

Based on these metrics, provide a risk assessment in the following JSON format:
{
  "riskScore": <integer 0-100>,
  "riskBand": "<Low|Medium|High>",
  "keyFactors": [<list of 3-5 key factors affecting risk>],
  "recommendation": "<Approve|Decline|Conditional>",
  "reasoning": "<2-3 sentence explanation>"
}

Respond ONLY with the JSON object, no additional text.`;

    console.log(`[Nova] Requesting risk score for borrower ${borrowerId}...`);

    const response = await invokeNovaModel(prompt);
    const result = JSON.parse(response);

    console.log(`[Nova] Risk score computed: ${result.riskScore} (${result.riskBand})`);

    return {
      success: true,
      riskScore: result.riskScore,
      riskBand: result.riskBand,
      keyFactors: result.keyFactors,
      recommendation: result.recommendation,
      reasoning: result.reasoning,
      source: 'nova'
    };
  } catch (err) {
    console.error('[Nova] Risk score error:', err.message);

    // Fallback: return default medium-risk score
    return {
      success: false,
      riskScore: 50,
      riskBand: 'Medium',
      keyFactors: ['Unable to compute via Nova', 'Using fallback score'],
      recommendation: 'Conditional',
      reasoning: 'Nova service temporarily unavailable. Default score assigned.',
      source: 'fallback',
      error: err.message
    };
  }
}

/**
 * Analyze dispute using Nova 2 Lite
 * 
 * INPUT: dispute reason, evidence (photos, messages, etc.)
 * OUTPUT: summary, suggested resolution, confidence, flags
 */
async function analyzeDispute(disputeData) {
  try {
    const { reason, evidence, loanAmount, borrowerName, lenderName } = disputeData;

    const evidenceText = typeof evidence === 'string' ? evidence : JSON.stringify(evidence);

    const prompt = `You are a peer-to-peer lending dispute resolution specialist. Analyze this dispute and suggest resolution:

LOAN DETAILS:
- Amount: Ksh ${loanAmount}
- Borrower: ${borrowerName}
- Lender: ${lenderName}

DISPUTE:
Reason: ${reason}
Evidence: ${evidenceText}

Provide your analysis in the following JSON format:
{
  "summary": "<1-2 sentence summary of the dispute>",
  "suggestion": "<specific resolution recommendation>",
  "confidence": <0-100 confidence in your suggestion>,
  "flags": [<any suspicious patterns or red flags detected>],
  "nextSteps": "<recommended next action>"
}

Respond ONLY with the JSON object, no additional text.`;

    console.log(`[Nova] Analyzing dispute: "${reason.substring(0, 50)}..."`);

    const response = await invokeNovaModel(prompt);
    const result = JSON.parse(response);

    console.log(`[Nova] Dispute analysis complete. Confidence: ${result.confidence}%`);

    return {
      success: true,
      summary: result.summary,
      suggestion: result.suggestion,
      confidence: result.confidence,
      flags: result.flags || [],
      nextSteps: result.nextSteps,
      source: 'nova'
    };
  } catch (err) {
    console.error('[Nova] Dispute analysis error:', err.message);

    // Fallback: return neutral analysis
    return {
      success: false,
      summary: 'Unable to auto-analyze. Requires manual review.',
      suggestion: 'Escalate to admin for manual dispute resolution.',
      confidence: 0,
      flags: ['Nova service error'],
      nextSteps: 'Contact platform administrator.',
      source: 'fallback',
      error: err.message
    };
  }
}

/**
 * Analyze loan agreement (optional - for future use with multimodal embeddings)
 */
async function analyzeAgreement(agreementText) {
  try {
    const prompt = `You are a peer-to-peer lending agreement specialist. Review this loan agreement and check for completeness:

AGREEMENT:
${agreementText}

Analyze and respond in JSON format:
{
  "isValid": <boolean>,
  "missingClauses": [<list of any missing standard clauses>],
  "riskFlags": [<any problematic terms>],
  "recommendation": "<Approve|Request Revision>"
}

Respond ONLY with the JSON object.`;

    const response = await invokeNovaModel(prompt);
    const result = JSON.parse(response);

    return {
      success: true,
      isValid: result.isValid,
      missingClauses: result.missingClauses || [],
      riskFlags: result.riskFlags || [],
      recommendation: result.recommendation,
      source: 'nova'
    };
  } catch (err) {
    console.error('[Nova] Agreement analysis error:', err.message);
    return {
      success: false,
      isValid: false,
      missingClauses: [],
      riskFlags: ['Unable to analyze'],
      recommendation: 'Manual review required',
      source: 'fallback',
      error: err.message
    };
  }
}

/**
 * Internal: Invoke Nova model with timeout and error handling
 */
async function invokeNovaModel(prompt) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Nova API timeout (30s)'));
    }, TIMEOUT);

    const payload = {
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: prompt,
        temperature: 0.7,
        maxTokens: 500
      })
    };

    client.invokeModel(payload, (err, data) => {
      clearTimeout(timer);

      if (err) {
        reject(new Error(`AWS Bedrock error: ${err.message}`));
        return;
      }

      try {
        const responseBody = JSON.parse(data.body.toString());
        const text = responseBody.outputText || responseBody.text || '';
        
        // Extract JSON from response (handles markdown code blocks)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in Nova response');
        }

        resolve(jsonMatch[0]);
      } catch (parseErr) {
        reject(new Error(`Failed to parse Nova response: ${parseErr.message}`));
      }
    });
  });
}

/**
 * Health check - verify Nova connectivity
 */
async function healthCheck() {
  try {
    console.log('[Nova] Running health check...');
    const result = await getRiskScore('test', {
      totalLoans: 0,
      defaultRate: 0,
      avgRepaymentDays: 30,
      loanFrequency: 0,
      disputeCount: 0
    });

    if (result.success) {
      console.log('[Nova] Health check PASSED ✓');
      return { status: 'healthy', model: MODEL_ID };
    } else {
      console.warn('[Nova] Health check FALLBACK (using default scores)');
      return { status: 'fallback', model: MODEL_ID, note: 'Using fallback scoring' };
    }
  } catch (err) {
    console.error('[Nova] Health check FAILED:', err.message);
    return { status: 'error', error: err.message };
  }
}

module.exports = {
  getRiskScore,
  analyzeDispute,
  analyzeAgreement,
  healthCheck
};
