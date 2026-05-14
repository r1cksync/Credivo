export function calculateLoan(principal: number, tenureDays: number) {
  const annualRate = 12;
  const si = (principal * annualRate * tenureDays) / (365 * 100);
  const totalRepayment = principal + si;
  const dailyRate = annualRate / (365 * 100);
  return {
    principal,
    tenureDays,
    annualRate,
    simpleInterest: Math.round(si * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
    effectiveDailyRate: dailyRate,
    interestPercentageOfPrincipal: Math.round((si / principal) * 10000) / 100,
    monthlyEquivalent: Math.round((totalRepayment / (tenureDays / 30)) * 100) / 100,
    dailyCost: Math.round((totalRepayment / tenureDays) * 100) / 100,
  };
}

export function generateLoanId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `LMS-${year}-${rand}`;
}
