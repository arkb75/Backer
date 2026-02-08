# Backer

Backer is a Next.js 14 platform that connects founders and investors through short-form pitch content, profile matching, messaging, and investment intent workflows.

## Tech Stack

- Next.js 14 (App Router) + React 18 + TypeScript
- NextAuth (credentials provider)
- DynamoDB (primary app data store)
- AWS S3 (media uploads)
- AWS SES (optional invite email delivery)
- Prisma (present in repo for schema/client tooling and legacy scripts)

## Core Product Flows

- Founder and investor registration/login
- Founder onboarding/profile + startup/company creation
- Investor onboarding/profile + reels-style feed (`/investor/feed`)
- Product like/interest and commitment flow
- Founder/investor messaging
- Co-founder invite flow

## Prerequisites

- Node.js 18+ (recommended: Node.js 20)
- npm
- AWS account/credentials with access to:
  - DynamoDB
  - S3
  - SES (only if you want invite emails)

## Environment Variables

Create a `.env` file in the project root. At minimum, configure:

```bash
# NextAuth
NEXTAUTH_SECRET="replace-with-a-strong-random-secret"
NEXTAUTH_URL="http://localhost:3000"

# AWS
AWS_REGION="us-east-2"
AWS_PROFILE="your-profile" # or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY

# S3 uploads
AWS_S3_BUCKET="your-s3-bucket"
AWS_S3_PUBLIC_URL="https://your-bucket.s3.us-east-2.amazonaws.com"
AWS_S3_UPLOAD_PREFIX="uploads"

# Optional S3 custom endpoint/localstack
# AWS_S3_ENDPOINT="http://localhost:4566"
# AWS_S3_FORCE_PATH_STYLE="true"

# Optional SES (co-founder invite emails)
EMAIL_FROM_ADDRESS="no-reply@your-domain.com"
APP_BASE_URL="http://localhost:3000"

# DynamoDB table names
DYNAMODB_TABLE_USERS="backer-dev-users"
DYNAMODB_TABLE_FOUNDERS="backer-dev-founders"
DYNAMODB_TABLE_PRODUCTS="backer-dev-products"
DYNAMODB_TABLE_FOUNDER_PRODUCTS="backer-dev-founder-products"
DYNAMODB_TABLE_FOUNDER_INVITES="backer-dev-founder-invites"
DYNAMODB_TABLE_INVESTORS="backer-dev-investors"
DYNAMODB_TABLE_INVESTOR_INTERESTS="backer-dev-investor-interests"
DYNAMODB_TABLE_CONVERSATIONS="backer-dev-conversations"
DYNAMODB_TABLE_MESSAGES="backer-dev-messages"
DYNAMODB_TABLE_INVESTMENTS="backer-dev-investments"

# Optional local DynamoDB endpoint
# AWS_DYNAMODB_ENDPOINT="http://localhost:8000"
```

Notes:
- Use either `AWS_PROFILE` or static access keys, not both.
- Do not commit real secrets in `.env`.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Ensure DynamoDB tables exist:

```bash
npm run setup:dynamodb
```

3. Start the app:

```bash
npm run dev
```

4. Open:

`http://localhost:3000`

## Available Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run setup:dynamodb` - create required DynamoDB tables if missing

## Project Structure

- `app/` - App Router pages and API routes
- `components/` - UI and feature components
- `lib/db/` - DynamoDB client, table config, repository layer
- `scripts/` - local utility/setup scripts
- `prisma/` - Prisma schema/migrations/seed artifacts

## Data Layer Note

Current application runtime reads/writes through `lib/db/repository.ts` (DynamoDB). Prisma artifacts remain in the repository for schema management/legacy workflows and are not the primary runtime datastore for app features.
