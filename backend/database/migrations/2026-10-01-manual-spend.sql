-- Migration 2026-10-01-manual-spend: Tabela de gastos diários manuais e seed R$ 43,89
CREATE TABLE IF NOT EXISTS daily_ad_spends (
    id SERIAL PRIMARY KEY,
    spend_date DATE NOT NULL UNIQUE,
    spend FLOAT NOT NULL DEFAULT 0.0,
    clicks INT NOT NULL DEFAULT 0,
    impressions INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Seed de R$ 43,89 e 21 cliques para a data atual
INSERT INTO daily_ad_spends (spend_date, spend, clicks, impressions)
VALUES (CURRENT_DATE, 43.89, 21, 150)
ON CONFLICT (spend_date) DO UPDATE 
SET spend = EXCLUDED.spend, clicks = EXCLUDED.clicks;
