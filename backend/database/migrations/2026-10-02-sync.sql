-- Migration 2026-10-02-sync: Sincronização definitiva dos dados da Hotmart e Meta Ads
DO $$
DECLARE
  cust_it_id INT;
  cust_ch_id INT;
BEGIN
  -- 1. Garante que colunas de país existam
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'customers' AND column_name = 'country'
  ) THEN
    ALTER TABLE customers ADD COLUMN country VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'country'
  ) THEN
    ALTER TABLE transactions ADD COLUMN country VARCHAR(50);
  END IF;

  -- 2. Atualiza ou insere a Conta de Anúncios com o Token Oficial do NinjaTracker
  IF NOT EXISTS (SELECT 1 FROM facebook_accounts WHERE account_id = 'act_949690764845924') THEN
    INSERT INTO facebook_accounts (label, account_id, access_token, business_id, token_valid)
    VALUES (
      'CONTA BR 3k',
      'act_949690764845924',
      'EAAQNi9yZBwRUBSrDuVbjcMGeIs8jAGv0i3oR5KjGiKwdKzR6lngSCQW075XamzQDBmsESsAqilbfhoYZCSmZBBYQ5eRhkvGZBpEM2BJgO0YctpQ772KZARnbjVZBgZCuT8g3cqQAxCQMFKXq8AYJwQfG3V9osqJJ14ZCYJ2AgTjEOWgmQ0r89w4uSrWwqbud3toxIAZDZD',
      'BM 4KBRL',
      true
    );
  ELSE
    UPDATE facebook_accounts
    SET label = 'CONTA BR 3k',
        access_token = 'EAAQNi9yZBwRUBSrDuVbjcMGeIs8jAGv0i3oR5KjGiKwdKzR6lngSCQW075XamzQDBmsESsAqilbfhoYZCSmZBBYQ5eRhkvGZBpEM2BJgO0YctpQ772KZARnbjVZBgZCuT8g3cqQAxCQMFKXq8AYJwQfG3V9osqJJ14ZCYJ2AgTjEOWgmQ0r89w4uSrWwqbud3toxIAZDZD',
        business_id = 'BM 4KBRL',
        token_valid = true
    WHERE account_id = 'act_949690764845924';
  END IF;

  -- 3. Atualiza os gastos com anúncios de hoje da Meta Ads (R$ 158,24)
  INSERT INTO daily_ad_spends (spend_date, spend, clicks, impressions)
  VALUES (CURRENT_DATE, 158.24, 92, 1315)
  ON CONFLICT (spend_date) DO UPDATE 
  SET spend = EXCLUDED.spend, clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions;

  -- 4. Corrige os países dos clientes
  UPDATE customers SET country = 'IT' WHERE email LIKE '%.it' OR phone LIKE '+39%' OR phone LIKE '39%';
  UPDATE customers SET country = 'CH' WHERE email LIKE '%.ch' OR phone LIKE '+41%' OR phone LIKE '41%';

  -- 5. Corrige os países de todas as transações da oferta de diagnóstico
  UPDATE transactions SET country = 'CH' WHERE customer_id IN (SELECT id FROM customers WHERE country = 'CH');
  UPDATE transactions 
  SET country = 'IT' 
  WHERE (
    product_name ILIKE '%diagnosi%' 
    OR product_name ILIKE '%visive%' 
    OR product_name ILIKE '%hardware%' 
    OR product_name ILIKE '%pinout%' 
    OR product_name ILIKE '%multimetro%'
  ) AND (country IS NULL OR country = 'BR');

END $$;
