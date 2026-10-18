-- Migration 2026-10-01-sync-sales: Sincronização histórica de 01/10/2026
DO $$
BEGIN
  -- 1. Gastos históricos em 01/10/2026 (nunca sobrescrever CURRENT_DATE)
  INSERT INTO daily_ad_spends (spend_date, spend, clicks, impressions)
  VALUES ('2026-10-01'::DATE, 145.57, 55, 550)
  ON CONFLICT (spend_date) DO UPDATE 
  SET spend = 145.57, clicks = 55, impressions = 550;

  -- 2. Limpar transações fictícias com prefixo HT_
  DELETE FROM transactions WHERE external_id LIKE 'HT_%';

END $$;
