# Credivo Backend

Express + TypeScript + MongoDB + AWS (S3, Textract, Bedrock).

## Setup

```bash
npm install
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, AWS_*, FRONTEND_URL
npm run seed
npm run dev
```

API at http://localhost:3001
