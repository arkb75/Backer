# DynamoDB Setup

This project now uses DynamoDB for app data storage.

## 1. Configure `.env`

Set these values (or keep defaults):

```bash
AWS_REGION="us-east-2"

DYNAMODB_TABLE_USERS="backer-dev-users"
DYNAMODB_TABLE_FOUNDERS="backer-dev-founders"
DYNAMODB_TABLE_PRODUCTS="backer-dev-products"
DYNAMODB_TABLE_FOUNDER_PRODUCTS="backer-dev-founder-products"
DYNAMODB_TABLE_INVESTORS="backer-dev-investors"
DYNAMODB_TABLE_INVESTOR_INTERESTS="backer-dev-investor-interests"
```

Optional for local DynamoDB:

```bash
AWS_DYNAMODB_ENDPOINT="http://localhost:8000"
```

## 2. Create Tables

Run:

```bash
npm run setup:dynamodb
```

The script is idempotent:
- Creates only missing tables
- Leaves existing tables untouched
- Uses on-demand billing (`PAY_PER_REQUEST`)

## 3. AWS Credentials

The app/script uses the standard AWS SDK provider chain.
If you use profiles, set:

```bash
AWS_PROFILE="root"
```

## Table Design

- `users`
  - PK: `id`
  - GSI: `email-index` (`email`)
- `founders`
  - PK: `id`
  - GSI: `userId-index` (`userId`)
- `products`
  - PK: `id`
- `founder-products`
  - PK: `id`
  - GSIs: `founderId-index`, `productId-index`
- `investors`
  - PK: `id`
  - GSI: `userId-index` (`userId`)
- `investor-interests`
  - PK: `id`
  - GSIs: `founderId-index`, `productId-index`
