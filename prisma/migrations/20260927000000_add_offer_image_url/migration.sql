-- Migration: add_offer_image_url
-- Additive, nullable, non-destructive. Existing records unaffected.
ALTER TABLE "Offer" ADD COLUMN "imageUrl" TEXT;
