-- Migration 2026-10-01: Adiciona coluna country e faz backfill inteligente de países
DO $$
BEGIN
  -- 1. Coluna country em customers
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'country'
  ) THEN
    ALTER TABLE customers ADD COLUMN country VARCHAR(50);
  END IF;

  -- 2. Coluna country em transactions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'country'
  ) THEN
    ALTER TABLE transactions ADD COLUMN country VARCHAR(50);
    CREATE INDEX IF NOT EXISTS ix_transactions_country ON transactions(country);
  END IF;

  -- 3. Backfill de clientes e transações da Itália (Diagnosi Visive, +39)
  UPDATE customers 
  SET country = 'IT' 
  WHERE country IS NULL AND (
    phone LIKE '+39%' OR phone LIKE '39%' OR phone LIKE '% 39 %'
  );

  UPDATE transactions
  SET country = 'IT'
  WHERE country IS NULL AND (
    product_name ILIKE '%diagnosi%' 
    OR product_name ILIKE '%hardware e software%'
    OR product_name ILIKE '%visive%'
    OR product_name ILIKE '%solda%'
    OR customer_id IN (SELECT id FROM customers WHERE country = 'IT' OR phone LIKE '+39%' OR phone LIKE '39%')
  );

  -- 4. Backfill de outros países internacionais
  UPDATE customers SET country = 'PT' WHERE country IS NULL AND (phone LIKE '+351%' OR phone LIKE '351%');
  UPDATE transactions SET country = 'PT' WHERE country IS NULL AND customer_id IN (SELECT id FROM customers WHERE country = 'PT');

  UPDATE customers SET country = 'ES' WHERE country IS NULL AND (phone LIKE '+34%' OR phone LIKE '34%');
  UPDATE transactions SET country = 'ES' WHERE country IS NULL AND customer_id IN (SELECT id FROM customers WHERE country = 'ES');

  UPDATE customers SET country = 'US' WHERE country IS NULL AND (phone LIKE '+1%' OR (phone LIKE '1%' AND LENGTH(phone) >= 11));
  UPDATE transactions SET country = 'US' WHERE country IS NULL AND customer_id IN (SELECT id FROM customers WHERE country = 'US');

  -- 5. Clientes brasileiros
  UPDATE customers SET country = 'BR' WHERE country IS NULL AND (phone LIKE '+55%' OR phone LIKE '55%' OR LENGTH(phone) <= 11);
  UPDATE transactions SET country = 'BR' WHERE country IS NULL AND customer_id IN (SELECT id FROM customers WHERE country = 'BR');

  -- Default para transações sem vínculo
  UPDATE transactions SET country = 'BR' WHERE country IS NULL;

END $$;
