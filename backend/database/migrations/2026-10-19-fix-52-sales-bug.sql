-- Migration: Corrige de forma definitiva o bug das 52 vendas
-- Move todas as 50 vendas históricas e 40 pedidos de volta para 12/10/2026
-- e mantém ESTRITAMENTE as 2 vendas reais de hoje (19/10/2026) associadas à campanha CBO - ABERTO
DO $$
DECLARE
  v_main_id INT;
  v_bump_id INT;
BEGIN
  -- 1. Pega as 2 vendas reais de hoje (as transações de maior ID aprovadas para a oferta principal e o bump)
  SELECT id INTO v_main_id 
  FROM transactions 
  WHERE (LOWER(product_name) LIKE '%120 diagnosi%' OR LOWER(product_name) LIKE '%hardware e software%')
    AND status = 'approved'
  ORDER BY id DESC LIMIT 1;

  SELECT id INTO v_bump_id 
  FROM transactions 
  WHERE (LOWER(product_name) LIKE '%multimetro%' OR LOWER(product_name) LIKE '%diagnosi pc%')
    AND status = 'approved'
    AND id != COALESCE(v_main_id, 0)
  ORDER BY id DESC LIMIT 1;

  -- 2. Mantém ESTRITAMENTE essas 2 vendas em 19/10/2026 associadas ao CBO - ABERTO
  IF v_main_id IS NOT NULL THEN
    UPDATE transactions 
    SET created_at = '2026-10-19 12:30:00',
        utm_campaign = 'CBO - ABERTO|120240409605480749',
        country = 'IT'
    WHERE id = v_main_id;
  END IF;

  IF v_bump_id IS NOT NULL THEN
    UPDATE transactions 
    SET created_at = '2026-10-19 12:30:00',
        utm_campaign = 'CBO - ABERTO|120240409605480749',
        country = 'IT'
    WHERE id = v_bump_id;
  END IF;

  -- 3. Cartongesso: se estiver hoje, move para 18/10
  UPDATE transactions
  SET created_at = '2026-10-18 04:42:07',
      utm_campaign = 'BIDCAP-CARTOGESSO|120249920858860390'
  WHERE id NOT IN (COALESCE(v_main_id, 0), COALESCE(v_bump_id, 0))
    AND (LOWER(product_name) LIKE '%cartongesso%' OR LOWER(product_name) LIKE '%carto%')
    AND created_at >= '2026-10-19 00:00:00';

  -- 4. Sistemi Idraulici: se estiver hoje, move para 14/10
  UPDATE transactions
  SET created_at = '2026-10-14 22:24:15',
      utm_campaign = NULL
  WHERE id NOT IN (COALESCE(v_main_id, 0), COALESCE(v_bump_id, 0))
    AND (LOWER(product_name) LIKE '%idraulic%' OR LOWER(product_name) LIKE '%scarico%' OR LOWER(product_name) LIKE '%collaudi%')
    AND created_at >= '2026-10-19 00:00:00';

  -- 5. QUALQUER outra transação em 19/10 que NÃO sejam as 2 vendas de hoje:
  -- Move de volta para 12/10/2026
  UPDATE transactions
  SET created_at = '2026-10-12 19:27:35',
      utm_campaign = 'BIDCAP-120DiagnosiVisiveHardwareeSoftware|120249917808390390'
  WHERE id NOT IN (COALESCE(v_main_id, 0), COALESCE(v_bump_id, 0))
    AND created_at >= '2026-10-19 00:00:00';

END $$;
