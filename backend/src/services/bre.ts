export function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

export interface BREInput {
  dateOfBirth: Date | string;
  monthlySalary: number;
  pan: string;
  employmentMode: string;
}

export interface BREResult {
  passed: boolean;
  rejectionReasons: string[];
  age: number;
}

export function runBRE(input: BREInput): BREResult {
  const reasons: string[] = [];
  const dob = new Date(input.dateOfBirth);
  const age = calculateAge(dob);

  if (isNaN(dob.getTime())) {
    reasons.push('Invalid date of birth provided');
  } else if (age < 23 || age > 50) {
    reasons.push(`Age ${age} is outside the eligible range of 23-50 years`);
  }

  if (!input.monthlySalary || input.monthlySalary < 25000) {
    reasons.push(`Monthly salary ₹${input.monthlySalary || 0} is below the minimum ₹25,000`);
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!input.pan || !panRegex.test(input.pan)) {
    reasons.push(`PAN ${input.pan || '(empty)'} does not match the valid Indian PAN format (e.g., ABCDE1234F)`);
  }

  if (input.employmentMode === 'unemployed') {
    reasons.push('Unemployed applicants are not eligible for loans');
  }

  return { passed: reasons.length === 0, rejectionReasons: reasons, age };
}
