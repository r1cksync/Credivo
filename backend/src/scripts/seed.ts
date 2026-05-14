import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Loan } from '../models/Loan';
import { Payment } from '../models/Payment';
import { DocumentModel } from '../models/Document';
import { uploadDocument, s3PublicUrl } from '../services/s3';
import { calculateLoan } from '../services/loanCalculator';
import { generateSalarySlipPdf } from '../services/pdf';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI!, { dbName: 'credivo' });
  console.log('Connected to MongoDB Atlas');

  await Promise.all([User.deleteMany({}), Loan.deleteMany({}), Payment.deleteMany({}), DocumentModel.deleteMany({})]);
  console.log('Cleared collections');

  const hash = (pwd: string) => bcrypt.hash(pwd, 10);

  const [adminUser, salesUser, sanctionUser, disbursementUser, collectionUser] = await User.insertMany([
    { email: 'admin@credivo.com', passwordHash: await hash('Admin@123'), role: 'admin' },
    { email: 'sales@credivo.com', passwordHash: await hash('Sales@123'), role: 'sales' },
    { email: 'sanction@credivo.com', passwordHash: await hash('Sanction@123'), role: 'sanction' },
    { email: 'disburse@credivo.com', passwordHash: await hash('Disburse@123'), role: 'disbursement' },
    { email: 'collect@credivo.com', passwordHash: await hash('Collect@123'), role: 'collection' },
  ]);
  console.log('Created executive accounts');

  const borrowerData: any[] = [
    {
      email: 'rahul.sharma@email.com',
      password: 'Borrower@123',
      profile: {
        fullName: 'Rahul Sharma',
        pan: 'ABCPS1234R',
        dateOfBirth: new Date('1992-06-15'),
        monthlySalary: 65000,
        employmentMode: 'salaried',
        breStatus: 'passed',
        breRejectionReasons: [],
        breCheckedAt: new Date(Date.now() - 5 * 86400000),
      },
      loanStatus: 'applied',
      loanConfig: { principal: 200000, tenure: 180 },
    },
    {
      email: 'priya.patel@email.com',
      password: 'Borrower@123',
      profile: {
        fullName: 'Priya Patel',
        pan: 'BCDQT5678P',
        dateOfBirth: new Date('1989-11-22'),
        monthlySalary: 85000,
        employmentMode: 'salaried',
        breStatus: 'passed',
        breRejectionReasons: [],
        breCheckedAt: new Date(Date.now() - 10 * 86400000),
      },
      loanStatus: 'sanctioned',
      loanConfig: { principal: 350000, tenure: 270 },
    },
    {
      email: 'amit.kumar@email.com',
      password: 'Borrower@123',
      profile: {
        fullName: 'Amit Kumar',
        pan: 'CDERP9012A',
        dateOfBirth: new Date('1987-03-08'),
        monthlySalary: 120000,
        employmentMode: 'self-employed',
        breStatus: 'passed',
        breRejectionReasons: [],
        breCheckedAt: new Date(Date.now() - 30 * 86400000),
      },
      loanStatus: 'disbursed',
      loanConfig: { principal: 500000, tenure: 365 },
    },
    {
      email: 'sneha.gupta@email.com',
      password: 'Borrower@123',
      profile: {
        fullName: 'Sneha Gupta',
        pan: 'DEFVW3456S',
        dateOfBirth: new Date('1994-08-19'),
        monthlySalary: 55000,
        employmentMode: 'salaried',
        breStatus: 'passed',
        breRejectionReasons: [],
        breCheckedAt: new Date(Date.now() - 60 * 86400000),
      },
      loanStatus: 'closed',
      loanConfig: { principal: 100000, tenure: 90 },
    },
    {
      email: 'vikram.singh@email.com',
      password: 'Borrower@123',
      profile: {
        fullName: 'Vikram Singh',
        pan: 'EFGXY7890V',
        dateOfBirth: new Date('1991-12-30'),
        monthlySalary: 75000,
        employmentMode: 'salaried',
        breStatus: 'passed',
        breRejectionReasons: [],
        breCheckedAt: new Date(Date.now() - 15 * 86400000),
      },
      loanStatus: 'rejected',
      loanConfig: { principal: 450000, tenure: 300 },
    },
    {
      email: 'ananya.roy@email.com',
      password: 'Borrower@123',
      profile: {
        fullName: 'Ananya Roy',
        pan: 'INVALID-PAN',
        dateOfBirth: new Date('2005-04-25'),
        monthlySalary: 18000,
        employmentMode: 'unemployed',
        breStatus: 'rejected',
        breRejectionReasons: [
          'Age 21 is outside the eligible range of 23-50 years',
          'Monthly salary ₹18000 is below the minimum ₹25,000',
          'PAN INVALID-PAN does not match the valid Indian PAN format',
          'Unemployed applicants are not eligible for loans',
        ],
        breCheckedAt: new Date(Date.now() - 2 * 86400000),
      },
    },
    { email: 'deepak.mehta@email.com', password: 'Borrower@123' },
    {
      email: 'kavya.nair@email.com',
      password: 'Borrower@123',
      profile: {
        fullName: 'Kavya Nair',
        pan: 'FGHZA1234K',
        dateOfBirth: new Date('1993-07-14'),
        monthlySalary: 48000,
        employmentMode: 'salaried',
        breStatus: 'passed',
        breRejectionReasons: [],
        breCheckedAt: new Date(Date.now() - 1 * 86400000),
      },
    },
  ];

  const borrowers: { user: any; config: any }[] = [];
  for (const bd of borrowerData) {
    const user = await User.create({
      email: bd.email,
      passwordHash: await hash(bd.password),
      role: 'borrower',
      profile: bd.profile,
    });
    borrowers.push({ user, config: bd });
  }
  console.log(`Created ${borrowers.length} borrowers`);

  const docMap: Record<string, any> = {};
  const employers = ['TechCorp Solutions Pvt Ltd', 'Infomatics India Ltd', 'Globalsoft Services', 'NovaTech Industries', 'Apex Digital Pvt Ltd'];
  const designations = ['Senior Software Engineer', 'Business Analyst', 'Operations Manager', 'Marketing Lead', 'Account Executive'];
  for (let bi = 0; bi < borrowers.length; bi++) {
    const b = borrowers[bi];
    if (b.config.profile?.breStatus === 'passed') {
      const salary = b.config.profile.monthlySalary;
      const basic = Math.round(salary * 0.5);
      const hra = Math.round(salary * 0.2);
      const conveyance = Math.round(salary * 0.05);
      const pf = Math.round(salary * 0.06);
      const tax = Math.round(salary * 0.04);
      const grossSalary = salary + pf + tax;
      const specialAllowance = grossSalary - basic - hra - conveyance;

      const pdfBuffer = await generateSalarySlipPdf({
        employerName: employers[bi % employers.length],
        employeeName: b.config.profile.fullName,
        pan: b.config.profile.pan,
        designation: designations[bi % designations.length],
        payPeriod: 'January 2026',
        employeeId: `EMP${String(10000 + bi)}`,
        basic,
        hra,
        specialAllowance,
        conveyance,
        pf,
        tax,
        grossSalary,
        netSalary: salary,
      });

      const s3Key = `salary-slips/${b.user._id}/seed-salary-slip.pdf`;
      try {
        await uploadDocument(pdfBuffer, s3Key, 'application/pdf');
        console.log(`  S3 uploaded real PDF (${pdfBuffer.length} bytes): ${b.config.profile.fullName}`);
      } catch (err: any) {
        console.warn(`  S3 upload failed for ${b.config.email}: ${err.message}`);
      }
      const extractedText = `SALARY SLIP - JANUARY 2026
Employer: ${employers[bi % employers.length]}
Employee: ${b.config.profile.fullName}
Employee ID: EMP${String(10000 + bi)}
Designation: ${designations[bi % designations.length]}
PAN: ${b.config.profile.pan}
Pay Period: January 2026

EARNINGS
Basic Salary: INR ${basic.toLocaleString('en-IN')}
HRA: INR ${hra.toLocaleString('en-IN')}
Special Allowance: INR ${specialAllowance.toLocaleString('en-IN')}
Conveyance: INR ${conveyance.toLocaleString('en-IN')}
Gross Salary: INR ${grossSalary.toLocaleString('en-IN')}

DEDUCTIONS
Provident Fund: INR ${pf.toLocaleString('en-IN')}
Tax Deducted (TDS): INR ${tax.toLocaleString('en-IN')}

NET SALARY: INR ${salary.toLocaleString('en-IN')}`;

      const doc = await DocumentModel.create({
        ownerId: b.user._id,
        type: 'salary_slip',
        s3Key,
        s3Url: s3PublicUrl(s3Key),
        originalFilename: 'salary-slip-jan-2026.pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: pdfBuffer.length,
        textractStatus: 'completed',
        extractedText,
        detectedSalary: salary,
        textractConfidence: 96.2,
        uploadedAt: new Date(Date.now() - 3 * 86400000),
      });
      docMap[b.user._id.toString()] = doc;
    }
  }

  const loanStatusConfigs = [
    { status: 'applied', appliedDaysAgo: 3, extraFields: {} },
    { status: 'sanctioned', appliedDaysAgo: 12, extraFields: { sanctionedAt: new Date(Date.now() - 8 * 86400000), sanctionedBy: sanctionUser._id } },
    {
      status: 'disbursed',
      appliedDaysAgo: 45,
      extraFields: {
        sanctionedAt: new Date(Date.now() - 40 * 86400000),
        sanctionedBy: sanctionUser._id,
        disbursedAt: new Date(Date.now() - 35 * 86400000),
        disbursedBy: disbursementUser._id,
        disbursementReference: 'DISB-20260115-001',
      },
    },
    {
      status: 'closed',
      appliedDaysAgo: 100,
      extraFields: {
        sanctionedAt: new Date(Date.now() - 95 * 86400000),
        sanctionedBy: sanctionUser._id,
        disbursedAt: new Date(Date.now() - 92 * 86400000),
        disbursedBy: disbursementUser._id,
        disbursementReference: 'DISB-20251010-002',
        closedAt: new Date(Date.now() - 5 * 86400000),
        autoClosedByPayment: true,
      },
    },
    {
      status: 'rejected',
      appliedDaysAgo: 18,
      extraFields: {
        rejectedAt: new Date(Date.now() - 14 * 86400000),
        rejectedBy: sanctionUser._id,
        rejectionReason:
          'Debt-to-income ratio exceeds acceptable threshold. Monthly repayment obligation is above 45% of declared salary.',
      },
    },
  ];

  const createdLoans: any[] = [];
  for (let i = 0; i < 5; i++) {
    const b = borrowers[i];
    const cfg = b.config.loanConfig;
    const calc = calculateLoan(cfg.principal, cfg.tenure);
    const sc = loanStatusConfigs[i];
    const doc = docMap[b.user._id.toString()];

    let totalAmountPaid = 0;
    if (sc.status === 'closed') totalAmountPaid = calc.totalRepayment;
    if (sc.status === 'disbursed') totalAmountPaid = Math.round(calc.totalRepayment * 0.35 * 100) / 100;

    const monthlyObligation = calc.totalRepayment / (cfg.tenure / 30);
    const dti = (monthlyObligation / b.config.profile.monthlySalary) * 100;
    const riskLevel = dti < 30 ? 'LOW' : dti < 50 ? 'MEDIUM' : 'HIGH';

    const loan = await Loan.create({
      loanId: `LMS-2026-${String(10001 + i).padStart(5, '0')}`,
      borrowerId: b.user._id,
      principalAmount: calc.principal,
      tenureDays: calc.tenureDays,
      interestRate: 12,
      simpleInterest: calc.simpleInterest,
      totalRepayment: calc.totalRepayment,
      outstandingBalance: Math.round((calc.totalRepayment - totalAmountPaid) * 100) / 100,
      totalAmountPaid,
      status: sc.status,
      appliedAt: new Date(Date.now() - sc.appliedDaysAgo * 86400000),
      appliedBy: b.user._id,
      salarySlipDocId: doc?._id,
      extractedSalaryData: doc
        ? {
            rawText: doc.extractedText || '',
            detectedSalary: b.config.profile.monthlySalary,
            confidence: 94.5,
            verifiedAt: new Date(Date.now() - (sc.appliedDaysAgo - 1) * 86400000),
          }
        : undefined,
      aiRiskSummary:
        sc.status !== 'applied'
          ? `Risk Level: ${riskLevel}. ${b.config.profile.fullName} has stable ${b.config.profile.employmentMode} income of INR ${b.config.profile.monthlySalary}/month. DTI ratio of ${dti.toFixed(1)}% on the requested principal of INR ${cfg.principal}. Monthly repayment obligation: INR ${Math.round(monthlyObligation)}. Recommendation: ${riskLevel === 'LOW' ? 'Approve' : riskLevel === 'MEDIUM' ? 'Approve with monitoring' : 'Review carefully'}.`
          : undefined,
      activityLog: [
        { at: new Date(Date.now() - sc.appliedDaysAgo * 86400000), actor: b.user._id, action: 'APPLIED', toStatus: 'applied' },
      ],
      ...sc.extraFields,
    });

    createdLoans.push(loan);
    if (doc) await DocumentModel.findByIdAndUpdate(doc._id, { loanId: loan._id });
  }
  console.log('Created loans');

  const disbursedLoan = createdLoans[2];
  const partialPaid = disbursedLoan.totalAmountPaid;
  const p1 = Math.round(partialPaid * 0.6 * 100) / 100;
  const p2 = Math.round((partialPaid - p1) * 100) / 100;
  await Payment.insertMany([
    {
      loanId: disbursedLoan._id,
      borrowerId: borrowers[2].user._id,
      recordedBy: collectionUser._id,
      utrNumber: `UTR${Date.now()}PAY001`,
      amount: p1,
      paymentDate: new Date(Date.now() - 20 * 86400000),
      notes: 'First installment via NEFT',
      status: 'verified',
    },
    {
      loanId: disbursedLoan._id,
      borrowerId: borrowers[2].user._id,
      recordedBy: collectionUser._id,
      utrNumber: `UTR${Date.now() + 1}PAY002`,
      amount: p2,
      paymentDate: new Date(Date.now() - 10 * 86400000),
      notes: 'Second installment via IMPS',
      status: 'verified',
    },
  ]);

  const closedLoan = createdLoans[3];
  const cT = closedLoan.totalRepayment;
  const cp1 = Math.round(cT * 0.4 * 100) / 100;
  const cp2 = Math.round(cT * 0.35 * 100) / 100;
  const cp3 = Math.round((cT - cp1 - cp2) * 100) / 100;
  await Payment.insertMany([
    {
      loanId: closedLoan._id,
      borrowerId: borrowers[3].user._id,
      recordedBy: collectionUser._id,
      utrNumber: `UTR${Date.now() + 10}CLOSED001`,
      amount: cp1,
      paymentDate: new Date(Date.now() - 70 * 86400000),
      notes: 'First payment - on time',
      status: 'verified',
    },
    {
      loanId: closedLoan._id,
      borrowerId: borrowers[3].user._id,
      recordedBy: collectionUser._id,
      utrNumber: `UTR${Date.now() + 11}CLOSED002`,
      amount: cp2,
      paymentDate: new Date(Date.now() - 40 * 86400000),
      notes: 'Second payment',
      status: 'verified',
    },
    {
      loanId: closedLoan._id,
      borrowerId: borrowers[3].user._id,
      recordedBy: collectionUser._id,
      utrNumber: `UTR${Date.now() + 12}CLOSED003`,
      amount: cp3,
      paymentDate: new Date(Date.now() - 5 * 86400000),
      notes: 'Final payment - loan auto-closed',
      status: 'verified',
    },
  ]);
  console.log('Created payments');

  console.log('\n==========================================');
  console.log('SEED COMPLETE - LOGIN CREDENTIALS');
  console.log('==========================================');
  console.log('\nEXECUTIVES:');
  console.log('  Admin:        admin@credivo.com     / Admin@123');
  console.log('  Sales:        sales@credivo.com     / Sales@123');
  console.log('  Sanction:     sanction@credivo.com  / Sanction@123');
  console.log('  Disbursement: disburse@credivo.com  / Disburse@123');
  console.log('  Collection:   collect@credivo.com   / Collect@123');
  console.log('\nBORROWERS (password: Borrower@123):');
  console.log('  rahul.sharma@email.com   -> APPLIED');
  console.log('  priya.patel@email.com    -> SANCTIONED');
  console.log('  amit.kumar@email.com     -> DISBURSED (35% repaid)');
  console.log('  sneha.gupta@email.com    -> CLOSED');
  console.log('  vikram.singh@email.com   -> REJECTED');
  console.log('  ananya.roy@email.com     -> BRE REJECTED');
  console.log('  deepak.mehta@email.com   -> No profile');
  console.log('  kavya.nair@email.com     -> BRE passed, no loan');
  console.log('==========================================\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
