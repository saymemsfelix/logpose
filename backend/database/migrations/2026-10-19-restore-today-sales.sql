-- Migration: Restaura vendas reais de 19/10/2026 indevidamente retroagidas pelo seed_sync anterior
DO $$
BEGIN
  -- 1. Restaura as 2 vendas reais de hoje (120 Diagnosi Visive e Diagnosi PC con Multimetro)
  -- para 19/10/2026 e atribui à campanha ativa do Meta Ads (CBO - ABERTO)
  UPDATE transactions
  SET created_at = '2026-10-19 12:30:00',
      utm_campaign = 'CBO - ABERTO|120240409605480749',
      country = 'IT'
  WHERE external_id NOT IN (
      'HP0330641855', 'HP3880108633', 'HP2449571184', 'HP2444954197', 
      'HP2464191642', 'HP2456881413', 'HP2465345889', 'HP0725196133', 
      'HP2915202196', 'HP3087569704'
  )
  AND (
      LOWER(product_name) LIKE '%120 diagnosi%'
      OR LOWER(product_name) LIKE '%hardware e software%'
      OR LOWER(product_name) LIKE '%diagnosi pc%'
      OR LOWER(product_name) LIKE '%multimetro%'
  )
  AND created_at = '2026-10-12 19:27:35';

END $$;
