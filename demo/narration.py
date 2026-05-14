# Credivo LMS – narration script.
# 23 segments, ~355 words total → ~165s at en-US-AndrewMultilingualNeural +5% rate.
# Video is recorded to match these durations section by section.
# Each entry: (section_key, text)

SEGMENTS = [
    # 0 – INTRO  (≈21s, on landing page loading)
    ("intro",
     "Welcome to Credivo — a full-stack Loan Management System built on Next dot js, Express, and MongoDB Atlas. "
     "In the next few minutes you will see every feature: borrower registration, automated credit checks, "
     "AWS Textract salary-slip OCR, Amazon Bedrock AI risk analysis, sanction, disbursement, collections, and closure."),

    # 1 – RBAC overview  (≈16s, landing page scroll)
    ("rbac",
     "Credivo has six roles — Borrower, Sales, Sanction, Disbursement, Collection, and Admin — "
     "each with a completely different dashboard. "
     "Every API endpoint enforces JWT authentication and role-based access control server-side."),

    # 2 – Landing  (≈12s, finish scrolling landing)
    ("landing",
     "The landing page uses Next dot js 14, Tailwind CSS, and Framer Motion animations "
     "to introduce the Bureau Risk Engine, AWS Textract, Bedrock AI risk, and role-based consoles."),

    # 3 – Register  (≈13s, on /register)
    ("register",
     "A new borrower fills in email, full name, date of birth, PAN number, monthly salary, and employment mode. "
     "All fields validate in real time and the password is bcrypt-hashed before storage."),

    # 4 – Login  (≈11s, on /login, filling form)
    ("login",
     "At login a JSON Web Token is signed with HS256 and stored as an HTTP-only cookie, "
     "protecting it from JavaScript access. We are signing in as Rahul Sharma."),

    # 5 – Borrower dashboard  (≈10s, on /dashboard)
    ("borrower_dash",
     "The borrower dashboard shows the active loan status card — principal, outstanding balance, "
     "and a colour-coded status badge — with quick actions to view loans or apply."),

    # 6 – Loans list  (≈9s, on /loans)
    ("loans_list",
     "The Loans page lists every loan showing loan ID, amount, tenure, interest rate, and current status. "
     "Clicking a card opens the full detail view."),

    # 7 – Loan detail  (≈17s, on /loans/[id])
    ("loan_detail",
     "The Loan Detail page shows the full financial breakdown and an immutable status timeline "
     "logging every transition — Applied, Sanctioned, Disbursed, and Closed. "
     "Once disbursed a presigned download link for the Sanction Letter PDF appears here directly."),

    # 8 – Apply / BRE  (≈18s, on /apply)
    ("apply_bre",
     "The Apply Loan wizard collects principal, tenure, and purpose. "
     "The Bureau Risk Engine fires server-side: PAN format regex, age 23 to 50, "
     "net salary at least 25 thousand rupees, and employment mode. "
     "Failures return plain-language rejection reasons instantly."),

    # 9 – Salary slip upload — Textract  (≈21s, on /apply step 2)
    ("textract",
     "Eligible borrowers reach the Salary Slip Upload step. "
     "The file streams to Amazon S3. The backend calls AWS Textract Analyze Document with the S3 reference. "
     "Textract returns structured text blocks from which Credivo extracts "
     "employee name, PAN, employer, gross salary, and net salary — no templates, no manual entry."),

    # 10 – Bedrock AI  (≈14s, still on /apply or transitioning)
    ("bedrock_apply",
     "Those extracted fields go immediately to Amazon Bedrock. "
     "Claude 3 Haiku computes the debt-to-income ratio, classifies the risk as Low, Medium, or High, "
     "and writes a full recommendation. The S3, Textract, Bedrock pipeline completes in seconds."),

    # 11 – Sales dashboard  (≈15s, on /ops/sales)
    ("sales_dash",
     "Now as the Sales executive. The dashboard shows a 14-day line chart of registrations versus BRE pass, "
     "an acquisition funnel, an employment mix donut, an age distribution chart, and top rejection reasons — "
     "all powered by Recharts."),

    # 12 – Leads table  (≈9s, still on /ops/sales scrolled down)
    ("sales_leads",
     "The Leads table below shows every registered borrower with BRE status badge and profile completeness. "
     "The team can search and filter in real time."),

    # 13 – Sanction queue  (≈17s, on /ops/sanction)
    ("sanction_dash",
     "As the Sanction officer. The Pending Approvals queue shows only loans with a completed BRE "
     "and an uploaded salary slip. Below the queue: a daily decisions line chart, "
     "a Bedrock risk-mix donut, queue-aging bars, and principal distribution."),

    # 14 – Sanction review — Textract panel  (≈18s, on /ops/sanction/[id])
    ("review_textract",
     "Clicking Review opens the Sanction Detail view. "
     "The Extracted Salary Data panel shows live AWS Textract output — "
     "employee name, PAN, employer, gross and net salary pulled from the PDF with a confidence score. "
     "The original salary slip is embedded as an inline PDF viewer on the same page."),

    # 15 – Sanction review — Bedrock panel  (≈17s, still on review page)
    ("review_bedrock",
     "The AI Risk Analysis panel — powered by Amazon Bedrock Claude 3 Haiku — "
     "shows the risk band colour-coded, the DTI ratio, and the full written recommendation. "
     "The officer clicks Approve or Reject; a rejection requires a written reason stored for compliance."),

    # 16 – Disbursement queue  (≈13s, on /ops/disbursement)
    ("disburse_dash",
     "As the Disbursement officer. Sanctioned loans land in the Release Queue. "
     "The dashboard shows pending count, total amount, average turnaround time, "
     "and a 14-day bar chart of disbursed count and value."),

    # 17 – PDF generation  (≈17s, still on /ops/disbursement)
    ("disburse_pdf",
     "Confirming a disbursement triggers PDFKit to generate a Sanction Letter server-side — "
     "borrower name, PAN, principal, tenure, 12 percent per annum interest, EMI schedule, "
     "and a unique disbursement reference. The letter is uploaded to S3 and a presigned URL is returned immediately."),

    # 18 – Collection dashboard  (≈11s, on /ops/collection)
    ("collect_dash",
     "As the Collection officer. Active loans appear as repayment progress cards. "
     "Analytics show a daily collections bar chart, a loan-aging donut, "
     "repayment progress distribution, and collection efficiency."),

    # 19 – Payment recording  (≈12s, on /ops/collection/[id])
    ("collect_payment",
     "Recording a payment needs a UTR reference, amount, and value date. "
     "When the outstanding balance hits zero the loan closes automatically "
     "and the status updates across every dashboard in real time."),

    # 20 – Admin  (≈14s, on /ops/admin)
    ("admin_dash",
     "The Admin dashboard shows a global overview: total leads, loans per status, "
     "total principal disbursed, active book value, and arrears. "
     "The admin role has no API bypass — every call still validates the JWT and role claim server-side."),

    # 21 – Tech stack  (≈17s, back on landing or admin)
    ("tech_stack",
     "Under the hood: Express 4, TypeScript, Mongoose 8, MongoDB Atlas, "
     "AWS S3, AWS Textract, AWS Bedrock Claude 3 Haiku, PDFKit, "
     "Next dot js 14, Recharts, Tailwind CSS, and Framer Motion. "
     "Deployed on Vercel with a cached-promise MongoDB connection that eliminates cold-start timeouts."),

    # 22 – Outro  (≈12s, back on landing)
    ("outro",
     "Credivo is live at credivo dot vercel dot app. "
     "The API is at credivo-api dot vercel dot app. "
     "The README has the architecture diagram, setup guide, and all demo credentials. Thank you for watching."),
]
