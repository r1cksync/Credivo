import PDFDocument from 'pdfkit';

export interface SanctionLetterData {
  loanId: string;
  borrowerName: string;
  pan: string;
  principalAmount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  sanctionedAt: Date;
  disbursementReference?: string;
}

export function generateSanctionLetterPdf(data: SanctionLetterData): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fillColor('#10b981').fontSize(24).text('CREDIVO', { align: 'left' });
    doc.fillColor('#64748b').fontSize(10).text('Loan Management System', { align: 'left' });
    doc.moveDown(2);

    doc.fillColor('#0a1628').fontSize(18).text('LOAN SANCTION LETTER', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#334155').text(`Loan ID: ${data.loanId}`, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(11).fillColor('#020817');
    doc.text(`Date: ${data.sanctionedAt.toLocaleDateString('en-IN')}`);
    doc.moveDown();

    doc.text(`Dear ${data.borrowerName},`);
    doc.moveDown();
    doc.text(
      `We are pleased to inform you that your loan application has been sanctioned by Credivo. The terms of the loan are set out below.`,
      { align: 'justify' }
    );
    doc.moveDown(1.5);

    doc.fillColor('#0a1628').fontSize(13).text('LOAN TERMS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#020817');

    const rows: [string, string][] = [
      ['Borrower Name', data.borrowerName],
      ['PAN', data.pan],
      ['Principal Amount', `INR ${data.principalAmount.toLocaleString('en-IN')}`],
      ['Tenure', `${data.tenureDays} days`],
      ['Interest Rate', `${data.interestRate}% p.a. (Simple Interest)`],
      ['Total Interest', `INR ${data.simpleInterest.toLocaleString('en-IN')}`],
      ['Total Repayment', `INR ${data.totalRepayment.toLocaleString('en-IN')}`],
    ];
    if (data.disbursementReference) rows.push(['Disbursement Ref', data.disbursementReference]);

    rows.forEach(([k, v]) => {
      doc.text(`${k}: `, { continued: true }).fillColor('#10b981').text(v).fillColor('#020817');
    });

    doc.moveDown(1.5);
    doc.fontSize(10).fillColor('#64748b').text(
      `This is a system-generated document and does not require a physical signature. Terms and conditions of the master loan agreement apply.`,
      { align: 'justify' }
    );
    doc.moveDown(2);
    doc.fillColor('#0a1628').fontSize(11).text('Authorized Signatory', { align: 'right' });
    doc.fontSize(10).fillColor('#64748b').text('Credivo Operations', { align: 'right' });

    doc.end();
  });
}

export interface SalarySlipData {
  employerName: string;
  employeeName: string;
  pan: string;
  designation: string;
  payPeriod: string; // e.g., "January 2026"
  employeeId: string;
  basic: number;
  hra: number;
  specialAllowance: number;
  conveyance: number;
  pf: number;
  tax: number;
  grossSalary: number;
  netSalary: number;
}

export function generateSalarySlipPdf(d: SalarySlipData): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fillColor('#0a1628').fontSize(18).text(d.employerName.toUpperCase(), { align: 'center' });
    doc.fillColor('#64748b').fontSize(10).text('Payroll Department', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(13).fillColor('#0a1628').text(`SALARY SLIP - ${d.payPeriod.toUpperCase()}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(11).fillColor('#020817');
    const left = 50;
    const startY = doc.y;
    doc.text(`Employee Name: ${d.employeeName}`, left, startY);
    doc.text(`Employee ID: ${d.employeeId}`, left);
    doc.text(`Designation: ${d.designation}`);
    doc.text(`PAN: ${d.pan}`);
    doc.text(`Pay Period: ${d.payPeriod}`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#0a1628').text('EARNINGS', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#020817');
    const earnings: [string, number][] = [
      ['Basic Salary', d.basic],
      ['HRA', d.hra],
      ['Special Allowance', d.specialAllowance],
      ['Conveyance', d.conveyance],
    ];
    earnings.forEach(([k, v]) => {
      doc.text(`${k}: INR ${v.toLocaleString('en-IN')}`);
    });
    doc.fontSize(11).fillColor('#10b981').text(`Gross Salary: INR ${d.grossSalary.toLocaleString('en-IN')}`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor('#0a1628').text('DEDUCTIONS', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#020817');
    doc.text(`Provident Fund: INR ${d.pf.toLocaleString('en-IN')}`);
    doc.text(`Tax Deducted (TDS): INR ${d.tax.toLocaleString('en-IN')}`);
    doc.moveDown(1);

    doc.fontSize(14).fillColor('#10b981').text(`Net Salary: INR ${d.netSalary.toLocaleString('en-IN')}`, { align: 'right' });
    doc.moveDown(2);

    doc.fontSize(9).fillColor('#64748b').text(
      'This is a system-generated salary slip and does not require a physical signature. For verification, contact payroll@employer.com',
      { align: 'center' }
    );

    doc.end();
  });
}
