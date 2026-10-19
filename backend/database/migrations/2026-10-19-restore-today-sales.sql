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

  -- 4. Todas as outras transações de teste/histórico que foram parar em 19/10
  -- retornam para sua data histórica original (12/10/2026)
  UPDATE transactions
  SET created_at = '2026-10-12 19:27:35',
      utm_campaign = 'BIDCAP-120DiagnosiVisiveHardwareeSoftware|120249917808390390'
  WHERE id NOT IN (COALESCE(today_main_id, 0), COALESCE(today_bump_id, 0))
    AND (
      LOWER(product_name) LIKE '%120 diagnosi%' 
      OR LOWER(product_name) LIKE '%hardware e software%' 
      OR LOWER(product_name) LIKE '%diagnosi pc%'
      OR LOWER(product_name) LIKE '%multimetro%'
    )
    AND created_at >= '2026-10-19 00:00:00';
END $$;
