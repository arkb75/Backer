-- CreateEnum
CREATE TYPE "InvestmentStage" AS ENUM ('SEED', 'SERIES_A', 'SERIES_B', 'GROWTH');

-- AlterTable
ALTER TABLE "Investor" ADD COLUMN     "bio" VARCHAR(500),
ADD COLUMN     "investmentStagePreference" "InvestmentStage" DEFAULT 'SEED',
ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "location" VARCHAR(50),
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "title" VARCHAR(80),
ADD COLUMN     "twitterUrl" TEXT,
ADD COLUMN     "websiteUrl" TEXT;

-- CreateTable
CREATE TABLE "PortfolioCompany" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "logoUrl" TEXT,
    "stage" "InvestmentStage" NOT NULL,
    "isExited" BOOLEAN NOT NULL DEFAULT false,
    "exitYear" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorInterestTag" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorInterestTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioCompany_investorId_idx" ON "PortfolioCompany"("investorId");

-- CreateIndex
CREATE INDEX "InvestorInterestTag_investorId_idx" ON "InvestorInterestTag"("investorId");

-- AddForeignKey
ALTER TABLE "PortfolioCompany" ADD CONSTRAINT "PortfolioCompany_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorInterestTag" ADD CONSTRAINT "InvestorInterestTag_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
