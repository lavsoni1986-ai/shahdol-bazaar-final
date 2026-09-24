-- AlterTable
ALTER TABLE "User" ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 1;
