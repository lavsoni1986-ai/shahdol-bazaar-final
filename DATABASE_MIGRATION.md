# Database Migration Guide - Product Management System

## Schema Changes

The following changes have been made to the database schema:

### Products Table Updates

New fields added:
- `title` (text) - Product title (supports both name and title)
- `mrp` (text) - Maximum Retail Price
- `stock` (integer, default 0) - Stock quantity

Existing fields maintained:
- `name` - Kept for backward compatibility
- `price` - Selling price
- `category` - Product category
- `description` - Product description
- `imageUrl` - Primary image URL
- `status` - pending, approved, rejected
- `approved` - Boolean approval flag
- `sellerId` - Merchant ID (merchant_id)

### New Table: product_images

```sql
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Migration Steps

### Option 1: Using Drizzle Kit (Recommended)

```bash
# Generate migration
npm run db:push

# Or use drizzle-kit
npx drizzle-kit push
```

### Option 2: Manual SQL Migration

Run these SQL commands in your Neon database:

```sql
-- Add new columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS mrp TEXT,
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0 NOT NULL;

-- Create product_images table
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
```

### Option 3: Using Drizzle Migrations

```bash
# Generate migration files
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate
```

## Data Migration

### Copy name to title (if needed)

```sql
-- Copy name to title for existing products
UPDATE products 
SET title = name 
WHERE title IS NULL OR title = '';
```

### Set default stock for existing products

```sql
-- Set stock to 0 for existing products without stock
UPDATE products 
SET stock = 0 
WHERE stock IS NULL;
```

## Verification

After migration, verify the schema:

```sql
-- Check products table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products';

-- Check product_images table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_images';

-- Verify indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('products', 'product_images');
```

## Rollback (if needed)

If you need to rollback:

```sql
-- Remove new columns (WARNING: Data loss!)
ALTER TABLE products 
DROP COLUMN IF EXISTS title,
DROP COLUMN IF EXISTS mrp,
DROP COLUMN IF EXISTS stock;

-- Drop product_images table (WARNING: Data loss!)
DROP TABLE IF EXISTS product_images CASCADE;
```

## Notes

- The `name` field is kept for backward compatibility
- Both `name` and `title` can be used, but `title` is preferred
- Existing products will have `stock = 0` by default
- Product images are automatically deleted when a product is deleted (CASCADE)
- All existing product APIs continue to work
