-- CreateTable
CREATE TABLE "FounderPhoto" (
    "id" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "caption" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FounderPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderPrompt" (
    "id" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "prompt" VARCHAR(100) NOT NULL,
    "answer" VARCHAR(300) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FounderPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FounderPhoto_founderId_idx" ON "FounderPhoto"("founderId");

-- CreateIndex
CREATE INDEX "FounderPrompt_founderId_idx" ON "FounderPrompt"("founderId");

-- AddForeignKey
ALTER TABLE "FounderPhoto" ADD CONSTRAINT "FounderPhoto_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "Founder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderPrompt" ADD CONSTRAINT "FounderPrompt_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "Founder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
