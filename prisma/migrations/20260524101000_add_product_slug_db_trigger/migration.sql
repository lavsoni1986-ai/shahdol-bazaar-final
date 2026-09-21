-- Create a function to auto-generate slug at DB level if missing
CREATE OR REPLACE FUNCTION os_auto_product_slug_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if slug is NULL or empty
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        -- Basic DB-level slugification (Lowercases, replaces spaces/special chars with hyphens)
        NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
        
        -- Trim trailing hyphens if any
        NEW.slug := TRIM(BOTH '-' FROM NEW.slug);
        
        -- Fallback if name was purely special characters
        IF NEW.slug = '' THEN
            NEW.slug := 'product-' || TO_CHAR(NOW(), 'FMDDMMYY-HH24MISS');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach Trigger to Product Table (Before Insert or Update)
DROP TRIGGER IF EXISTS trg_os_auto_product_slug ON "Product";
CREATE TRIGGER trg_os_auto_product_slug
BEFORE INSERT OR UPDATE OF name ON "Product"
FOR EACH ROW
EXECUTE FUNCTION os_auto_product_slug_trigger();
