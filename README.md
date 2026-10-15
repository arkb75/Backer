# Backer

A founder–investor discovery prototype with short-form startup pitches, personalized feed ranking, profiles, messaging, and investment intent workflows.

Built as a team project for Hack The Coast 2026. Abdul Khurram’s contributions focused on the typed DynamoDB data layer and the feed-ranking pipeline.

[Open the hosted app](https://backer-gray.vercel.app) · [Explore the feed ranker](lib/feed/ranking.ts) · [Training pipeline](scripts/train-feed-model.ts)

**Built with:** TypeScript · Next.js 14 · React 18 · NextAuth · DynamoDB · S3 · SES

## What it does

- Onboards founders and investors and supports startup/company profiles.
- Presents startup pitches in a reels-style investor feed.
- Ranks candidates with a trainable logistic model using stage, text, tag, popularity, and freshness signals, with a heuristic fallback.
- Records feed interactions, likes, and investment intent.
- Supports founder–investor conversations and co-founder invitations.

## Explore the implementation

| Area | Start here |
| --- | --- |
| Feed ranking and features | [Ranker](lib/feed/ranking.ts) · [feature extraction](lib/feed/mlFeatures.ts) |
| Training and evaluation | [Training script](scripts/train-feed-model.ts) · [saved model artifact](lib/feed/model/feed-model.json) |
| Interaction telemetry | [Client events](lib/feed/clientEvents.ts) · [event API](app/api/feed/events/route.ts) |
| Messaging and access checks | [Send-message API](app/api/messages/send/route.ts) |
| Data access | [DynamoDB repository](lib/db/repository.ts) · [table setup](scripts/setup-dynamodb.ts) |

The saved model is a small development artifact: it records 48 examples with a 7-example test split. Its metrics are useful for inspecting the pipeline and are not a production recommendation benchmark. The repository currently provides lint/build checks; it has no automated test suite.

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
DYNAMODB_TABLE_FEED_EVENTS="backer-dev-feed-events"
DYNAMODB_TABLE_CONVERSATIONS="backer-dev-conversations"
DYNAMODB_TABLE_MESSAGES="backer-dev-messages"
DYNAMODB_TABLE_INVESTMENTS="backer-dev-investments"

# Optional ML model output path
# FEED_MODEL_PATH="lib/feed/model/feed-model.json"

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

4. Train the feed model (recommended after generating some usage data):

```bash
npm run train:feed-model
```

5. Open:

`http://localhost:3000`

## Available Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run setup:dynamodb` - create required DynamoDB tables if missing
- `npm run train:feed-model` - train and persist feed ranking model weights

## ML Feed Ranking

The investor reels feed uses a trainable logistic ranking model. At request time, each candidate startup is featurized and scored, then sorted by predicted relevance.

### Feature Signals

- Stage match between investor preference and startup stage
- Investor stage affinity learned from prior investor actions
- Text affinity between investor history/tags and startup content
- Interest tag overlap
- Global product popularity from likes/commitments
- Freshness decay

### Training Pipeline

- Training script: `scripts/train-feed-model.ts`
- Model artifact output: `lib/feed/model/feed-model.json` (or `FEED_MODEL_PATH`)
- Data sources:
  - `investorInterests` (`LIKED`/`COMMITTED`) for supervised positives
  - sampled negatives from unseen products per investor
  - optional behavioral signal enrichment from `feedEvents`

The runtime ranker in `lib/feed/ranking.ts` loads model weights via `lib/feed/model.ts`. If no model artifact is found, it falls back to deterministic heuristic scoring.

### Event Logging for Online Signals

The feed now records investor interaction events (impressions, watch milestones, product opens, like/unlike, message click, commit) via `POST /api/feed/events` into DynamoDB table `DYNAMODB_TABLE_FEED_EVENTS`.

## Project Structure

- `app/` - App Router pages and API routes
- `components/` - UI and feature components
- `lib/db/` - DynamoDB client, table config, repository layer
- `scripts/` - local utility/setup scripts
- `prisma/` - Prisma schema/migrations/seed artifacts

## Data Layer Note

Current application runtime reads/writes through `lib/db/repository.ts` (DynamoDB). Prisma artifacts remain in the repository for schema management/legacy workflows and are not the primary runtime datastore for app features.
