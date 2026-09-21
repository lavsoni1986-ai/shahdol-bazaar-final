/*
  Warnings:

  - Added the required column `lastSeenAt` to the `district_supply_gap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "district_supply_gap" ADD COLUMN     "lastSeenAt" TIMESTAMP(3) NOT NULL;
