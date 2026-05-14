import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient, BEDROCK_MODEL_ID } from '../config/aws';

async function invokeClaude(prompt: string, maxTokens = 256): Promise<string> {
  try {
    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: BEDROCK_MODEL_ID,
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        }),
        contentType: 'application/json',
        accept: 'application/json',
      })
    );
    const parsed = JSON.parse(new TextDecoder().decode(response.body));
    return parsed.content?.[0]?.text || '';
  } catch (err: any) {
    console.error('[bedrock] error', err.message);
    return '';
  }
}

export async function generateLoanRiskSummary(loanData: {
  borrowerName: string;
  age: number;
  monthlySalary: number;
  employmentMode: string;
  principalAmount: number;
  tenureDays: number;
  totalRepayment: number;
  salaryTextractData?: string;
}): Promise<string> {
  const monthlyObligation = loanData.totalRepayment / (loanData.tenureDays / 30);
  const dti = (monthlyObligation / loanData.monthlySalary) * 100;

  const prompt = `You are a senior loan risk analyst at Credivo, an Indian fintech.
Analyze this loan application and produce a concise 3-4 sentence risk assessment for the sanction executive.

Borrower: ${loanData.borrowerName}, Age: ${loanData.age}
Employment: ${loanData.employmentMode}, Monthly Salary: ₹${loanData.monthlySalary}
Loan Amount: ₹${loanData.principalAmount}, Tenure: ${loanData.tenureDays} days
Total Repayment: ₹${loanData.totalRepayment.toFixed(2)}
Monthly Obligation Equivalent: ₹${monthlyObligation.toFixed(0)}
Debt-to-Income Ratio: ${dti.toFixed(1)}%
${loanData.salaryTextractData ? `Salary Slip Extract (Textract): ${loanData.salaryTextractData.substring(0, 500)}` : ''}

Start your response with one of these exact tokens on the first line: "Risk Level: LOW", "Risk Level: MEDIUM", or "Risk Level: HIGH".
Then list 1-2 key concerns and a recommendation for the sanction team.
Keep it factual, professional, and under 100 words.`;

  const result = await invokeClaude(prompt, 256);
  if (result) return result;

  const riskLevel = dti < 30 ? 'LOW' : dti < 50 ? 'MEDIUM' : 'HIGH';
  return `Risk Level: ${riskLevel}. ${loanData.borrowerName} (${loanData.age}y, ${loanData.employmentMode}) has a DTI of ${dti.toFixed(1)}% on this ₹${loanData.principalAmount} loan. Monthly obligation of ₹${monthlyObligation.toFixed(0)} against income of ₹${loanData.monthlySalary}. Recommendation: ${riskLevel === 'LOW' ? 'Approve' : riskLevel === 'MEDIUM' ? 'Approve with monitoring' : 'Reject or request co-applicant'}.`;
}

export async function generateCollectionInsight(data: {
  loanId: string;
  totalRepayment: number;
  amountPaid: number;
  daysSinceDisbursement: number;
  paymentsCount: number;
  tenureDays: number;
}): Promise<string> {
  const pct = (data.amountPaid / data.totalRepayment) * 100;
  const outstanding = data.totalRepayment - data.amountPaid;
  const expectedPct = (data.daysSinceDisbursement / data.tenureDays) * 100;
  const onTrack = pct >= expectedPct - 10;

  const prompt = `You are a loan collection analyst at Credivo.
Loan ${data.loanId}: ₹${data.amountPaid.toFixed(0)} of ₹${data.totalRepayment.toFixed(0)} repaid (${pct.toFixed(1)}%) across ${data.paymentsCount} payments over ${data.daysSinceDisbursement} days of a ${data.tenureDays}-day tenure.
Outstanding: ₹${outstanding.toFixed(0)}. Expected progress: ${expectedPct.toFixed(1)}%.
Write exactly two sentences: one about repayment health, one with a recommendation for the collection team. Be concise.`;

  const result = await invokeClaude(prompt, 128);
  if (result) return result;

  return `Repayment is ${onTrack ? 'on track' : 'behind schedule'} at ${pct.toFixed(1)}% paid vs ${expectedPct.toFixed(1)}% expected. ${onTrack ? 'Continue standard follow-up cadence.' : 'Initiate priority outreach for next installment.'}`;
}
