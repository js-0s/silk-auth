-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prevSigninAt" TIMESTAMP(3),
    "lastSigninAt" TIMESTAMP(3),
    "lastSignoutAt" TIMESTAMP(3),
    "roles" TEXT[],
    "email" TEXT,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "bio" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
