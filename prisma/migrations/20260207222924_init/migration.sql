-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('FOUNDER', 'INVESTOR');

-- CreateEnum
CREATE TYPE "FounderType" AS ENUM ('FIRST_TIME', 'SERIAL', 'EXITED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('IDEA', 'BUILDING', 'LAUNCHED', 'RAISING', 'FUNDED');

-- CreateEnum
CREATE TYPE "InterestType" AS ENUM ('LIKED', 'COMMITTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "userType" "UserType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Founder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "headline" VARCHAR(80) NOT NULL,
    "location" VARCHAR(50) NOT NULL,
    "bio" VARCHAR(500) NOT NULL,
    "videoUrl" TEXT,
    "founderType" "FounderType" NOT NULL,
    "yearsExperience" INTEGER,
    "linkedinUrl" TEXT,
    "twitterUrl" TEXT,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Founder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "tagline" VARCHAR(200) NOT NULL,
    "videoUrl" TEXT,
    "status" "ProductStatus" NOT NULL DEFAULT 'IDEA',
    "amountRaised" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderProduct" (
    "id" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FounderProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "company" VARCHAR(100) NOT NULL,
    "role" VARCHAR(80) NOT NULL,
    "years" VARCHAR(20) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "firmName" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorInterest" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "founderId" TEXT,
    "productId" TEXT,
    "interestType" "InterestType" NOT NULL,
    "amountCommitted" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestorInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Founder_userId_key" ON "Founder"("userId");

-- CreateIndex
CREATE INDEX "FounderProduct_founderId_idx" ON "FounderProduct"("founderId");

-- CreateIndex
CREATE INDEX "FounderProduct_productId_idx" ON "FounderProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "FounderProduct_founderId_productId_key" ON "FounderProduct"("founderId", "productId");

-- CreateIndex
CREATE INDEX "WorkExperience_founderId_idx" ON "WorkExperience"("founderId");

-- CreateIndex
CREATE INDEX "Skill_founderId_idx" ON "Skill"("founderId");

-- CreateIndex
CREATE UNIQUE INDEX "Investor_userId_key" ON "Investor"("userId");

-- CreateIndex
CREATE INDEX "InvestorInterest_founderId_idx" ON "InvestorInterest"("founderId");

-- CreateIndex
CREATE INDEX "InvestorInterest_productId_idx" ON "InvestorInterest"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorInterest_investorId_founderId_key" ON "InvestorInterest"("investorId", "founderId");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorInterest_investorId_productId_key" ON "InvestorInterest"("investorId", "productId");

-- AddForeignKey
ALTER TABLE "Founder" ADD CONSTRAINT "Founder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderProduct" ADD CONSTRAINT "FounderProduct_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "Founder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderProduct" ADD CONSTRAINT "FounderProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "Founder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "Founder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investor" ADD CONSTRAINT "Investor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorInterest" ADD CONSTRAINT "InvestorInterest_investorId_fkey" FOREIGN KEY ("investorId") REFERENCES "Investor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorInterest" ADD CONSTRAINT "InvestorInterest_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "Founder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorInterest" ADD CONSTRAINT "InvestorInterest_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
