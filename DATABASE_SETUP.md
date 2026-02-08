# Quick Database Setup with Neon (2 minutes)

## Step 1: Create Neon Account
1. Visit [neon.tech](https://neon.tech)
2. Click "Sign up" (use GitHub for fastest signup)

## Step 2: Create Database
1. After signup, click "Create Project"
2. Name: `Backer`
3. PostgreSQL version: 16 (or latest)
4. Region: Choose closest to you
5. Click "Create Project"

## Step 3: Get Connection String
1. On project dashboard, click "Connection Details"
2. Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/backer?sslmode=require
   ```

## Step 4: Update .env File
Paste the connection string into `/Users/karanjhanji/repos/Backer/.env`:

```bash
DATABASE_URL="your-connection-string-here"
```

## Step 5: Tell me when ready!
Once you've updated the `.env` file, let me know and I'll:
- Run the Prisma migration
- Seed the database with investor data
- Give you the investor profile URL to test

---

**Why Neon?**
- ✅ Free tier (no credit card required)
- ✅ 30 seconds to set up
- ✅ No local PostgreSQL installation needed
- ✅ Auto-scaling, managed database
- ✅ Perfect for development
