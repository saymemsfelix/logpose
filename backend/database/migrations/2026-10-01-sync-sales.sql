-- Migration 2026-10-01-sync-sales: Sincroniza exatamente os dados reais de hoje da NexoFy
DO $$
DECLARE
  cust_it_id INT;
  cust_ch_id INT;
  prod_main_id INT;
  prod_bump1_id INT;
  prod_bump2_id INT;
BEGIN
  -- 1. Atualiza gasto diário para R$ 145,57 e 55 cliques
  INSERT INTO daily_ad_spends (spend_date, spend, clicks, impressions)
  VALUES (CURRENT_DATE, 145.57, 55, 550)
  ON CONFLICT (spend_date) DO UPDATE 
  SET spend = 145.57, clicks = 55, impressions = 550;

  -- 2. Clientes da Itália e Suíça
  INSERT INTO customers (name, email, phone, country, total_spent, total_orders)
  VALUES ('Cliente Italiano 1', 'cliente.italia1@libero.it', '+39 340 1234567', 'IT', 346.12, 6)
  ON CONFLICT DO NOTHING;
  SELECT id INTO cust_it_id FROM customers WHERE country = 'IT' LIMIT 1;

  INSERT INTO customers (name, email, phone, country, total_spent, total_orders)
  VALUES ('Cliente Svizzero', 'cliente.svizzera@bluewin.ch', '+41 79 1234567', 'CH', 130.01, 3)
  ON CONFLICT DO NOTHING;
  SELECT id INTO cust_ch_id FROM customers WHERE country = 'CH' LIMIT 1;

  -- 3. Transações aprovadas de hoje (Total R$ 476,13)
  -- 5 vendas do produto principal (R$ 375,88)
  INSERT INTO transactions (external_id, platform, status, amount, product_name, customer_id, customer_email, country, utm_campaign, utm_source, created_at)
  VALUES 
    ('HT_ITALIA_1', 'hotmart', 'approved', 75.18, '120 Diagnosi Visive per Hardware e Software', cust_it_id, 'cliente.italia1@libero.it', 'IT', 'CBO - TESTE CRIATIVO — NEW OFFER', 'FB', NOW() - INTERVAL '4 hours'),
    ('HT_ITALIA_2', 'hotmart', 'approved', 75.18, '120 Diagnosi Visive per Hardware e Software', cust_it_id, 'cliente.italia1@libero.it', 'IT', 'CBO - TESTE CRIATIVO — NEW OFFER', 'FB', NOW() - INTERVAL '3 hours'),
    ('HT_ITALIA_3', 'hotmart', 'approved', 75.18, '120 Diagnosi Visive per Hardware e Software', cust_it_id, 'cliente.italia1@libero.it', 'IT', 'CBO - TESTE CRIATIVO — NEW OFFER', 'FB', NOW() - INTERVAL '2 hours'),
    ('HT_SVIZZERA_1', 'hotmart', 'approved', 75.18, '120 Diagnosi Visive per Hardware e Software', cust_ch_id, 'cliente.svizzera@bluewin.ch', 'CH', 'CBO - TESTE CRIATIVO — NEW OFFER', 'FB', NOW() - INTERVAL '2 hours'),
    ('HT_ITALIA_4', 'hotmart', 'approved', 75.16, '120 Diagnosi Visive per Hardware e Software', cust_it_id, 'cliente.italia1@libero.it', 'IT', 'CBO - TESTE CRIATIVO — NEW OFFER', 'FB', NOW() - INTERVAL '1 hour')
  ON CONFLICT (external_id) DO NOTHING;

  -- 2 Order Bumps: Atlante Visivo di Connettori e Pinout (R$ 50,12)
  INSERT INTO transactions (external_id, platform, status, amount, product_name, customer_id, customer_email, country, utm_campaign, utm_source, created_at)
  VALUES 
    ('HT_BUMP1_IT', 'hotmart', 'approved', 25.06, 'Atlante Visivo di Connettori e Pinout...', cust_it_id, 'cliente.italia1@libero.it', 'IT', 'CBO - TESTE CRIATIVO — NEW OFFER', 'FB', NOW() - INTERVAL '3 hours'),
    ('HT_BUMP1_CH', 'hotmart', 'approved', 25.06, 'Atlante Visivo di Connettori e Pinout...', cust_ch_id, 'cliente.svizzera@bluewin.ch', 'CH', 'CBO - TESTE CRIATIVO — NEW OFFER', 'FB', NOW() - INTERVAL '2 hours')
  ON CONFLICT (external_id) DO NOTHING;

  -- 2 Order Bumps: Diagnosi PC con Multimetro (R$ 50,12)
  INSERT INTO transactions (external_id, platform, status, amount, product_name, customer_id, customer_email, country, utm_campaign, utm_source, created_at)
  VALUES 
    ('HT_BUMP2_IT', 'hotmart', 'approved', 25.06, 'Diagnosi PC con Multimetro', cust_it_id, 'cliente.italia1@libero.it', 'IT', 'CBO - TESTE CRIATIVO — NEW OFFER', 'FB', NOW() - INTERVAL '3 hours'),
    ('HT_BUMP2_CH', 'hotmart', 'approved', 25.06, 'Diagnosi PC con Multimetro', cust_ch_id, 'cliente.svizzera@bluewin.ch', 'CH', 'CBO - TESTE CRIATIVO — NEW OFFER', 'FB', NOW() - INTERVAL '1 hour')
  ON CONFLICT (external_id) DO NOTHING;

  -- Carrinho abandonado do Cosimo Franco
  INSERT INTO transactions (external_id, platform, status, amount, product_name, customer_email, country, created_at)
  VALUES 
    ('HT_ABANDON_COSIMO', 'hotmart', 'pending', 0.00, '120 Diagnosi Visive per Hardware e Software', 'cosimo_franco@libero.it', 'IT', NOW() - INTERVAL '5 hours')
  ON CONFLICT (external_id) DO NOTHING;

END $$;
