-- Migration 2026-10-01-manual-spend: Tabela de gastos diários manuais e seed R$ 43,89
CREATE TABLE IF NOT EXISTS daily_ad_spends (
    id SERIAL PRIMARY KEY,
    spend_date DATE NOT NULL UNIQUE,
    spend FLOAT NOT NULL DEFAULT 0.0,
    clicks INT NOT NULL DEFAULT 0,
    impressions INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Seed com gastos reais Meta Ads (R$ 158,24, 92 cliques, 1315 impressões)
INSERT INTO daily_ad_spends (spend_date, spend, clicks, impressions)
VALUES (CURRENT_DATE, 158.24, 92, 1315)
ON CONFLICT (spend_date) DO UPDATE 
SET spend = EXCLUDED.spend, clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions;
