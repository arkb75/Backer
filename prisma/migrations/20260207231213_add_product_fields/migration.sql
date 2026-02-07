-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "askAmount" INTEGER,
ADD COLUMN     "description" VARCHAR(1000),
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "problem" VARCHAR(500),
ADD COLUMN     "solution" VARCHAR(500),
ADD COLUMN     "stage" VARCHAR(50),
ADD COLUMN     "websiteUrl" TEXT;
