-- Migration 2026-10-01-ch: Suporte a clientes e transações da Suíça (+41)
DO $$
BEGIN
  UPDATE customers 
  SET country = 'CH' 
  WHERE (phone LIKE '+41%' OR phone LIKE '41%' OR phone LIKE '% 41 %');

  UPDATE transactions
  SET country = 'CH'
  WHERE customer_id IN (SELECT id FROM customers WHERE country = 'CH' OR phone LIKE '+41%' OR phone LIKE '41%');
END $$;
