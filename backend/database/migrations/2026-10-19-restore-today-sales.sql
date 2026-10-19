-- Migration: Isola estritamente as 2 vendas reais de 19/10/2026 e retorna o histórico para 12/10/2026
DO $$
DECLARE
  today_main_id INT;
  today_bump_id INT;
BEGIN
  -- 1. Identifica a última venda aprovada da oferta principal (120 Diagnosi Visive)
  SELECT id INTO today_main_id 
  FROM transactions 
  WHERE (LOWER(product_name) LIKE '%120 diagnosi%' OR LOWER(product_name) LIKE '%hardware e software%')
    AND status = 'approved'
  ORDER BY id DESC LIMIT 1;

  -- 2. Identifica a última venda aprovada do Order Bump (Multimetro / Diagnosi PC)
  SELECT id INTO today_bump_id 
  FROM transactions 
  WHERE (LOWER(product_name) LIKE '%multimetro%' OR LOWER(product_name) LIKE '%diagnosi pc%')
    AND status = 'approved'
    AND id != COALESCE(today_main_id, 0)
  ORDER BY id DESC LIMIT 1;

  -- 3. Garante que SOMENTE essas 2 vendas fiquem no dia de hoje (19/10) vinculadas ao CBO - ABERTO
  IF today_main_id IS NOT NULL THEN
    UPDATE transactions 
    SET created_at = '2026-10-19 12:30:00',
        utm_campaign = 'CBO - ABERTO|120240409605480749',
        country = 'IT'
    WHERE id = today_main_id;
  END IF;

  IF today_bump_id IS NOT NULL THEN
    UPDATE transactions 
    SET created_at = '2026-10-19 12:30:00',
        utm_campaign = 'CBO - ABERTO|120240409605480749',
        country = 'IT'
    WHERE id = today_bump_id;
  END IF;

  -- 3. Cartongesso: se estiver hoje, move para 18/10
  UPDATE transactions
  SET created_at = '2026-10-18 04:42:07',
      utm_campaign = 'BIDCAP-CARTOGESSO|120249920858860390'
  WHERE id NOT IN (COALESCE(today_main_id, 0), COALESCE(today_bump_id, 0))
    AND (LOWER(product_name) LIKE '%cartongesso%' OR LOWER(product_name) LIKE '%carto%')
    AND created_at >= '2026-10-19 00:00:00';

  -- 4. Sistemi Idraulici: se estiver hoje, move para 14/10
  UPDATE transactions
  SET created_at = '2026-10-14 22:24:15',
      utm_campaign = NULL
  WHERE id NOT IN (COALESCE(today_main_id, 0), COALESCE(today_bump_id, 0))
    AND (LOWER(product_name) LIKE '%idraulic%' OR LOWER(product_name) LIKE '%scarico%' OR LOWER(product_name) LIKE '%collaudi%')
    AND created_at >= '2026-10-19 00:00:00';

  -- 5. QUALQUER outra transação em 19/10 que NÃO sejam as 2 vendas de hoje:
  -- Move de volta para 12/10/2026
  UPDATE transactions
  SET created_at = '2026-10-12 19:27:35',
      utm_campaign = 'BIDCAP-120DiagnosiVisiveHardwareeSoftware|120249917808390390'
  WHERE id NOT IN (COALESCE(today_main_id, 0), COALESCE(today_bump_id, 0))
    AND created_at >= '2026-10-19 00:00:00';
END $$;
