-- Migration 2026-10-01-manual-spend: Tabela de gastos diários manuais e seed histórico
CREATE TABLE IF NOT EXISTS daily_ad_spends (
    id SERIAL PRIMARY KEY,
    spend_date DATE NOT NULL UNIQUE,
    spend FLOAT NOT NULL DEFAULT 0.0,
    clicks INT NOT NULL DEFAULT 0,
    impressions INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Seed histórico fixo para 01/10/2026 (nunca sobrescrever CURRENT_DATE)
INSERT INTO daily_ad_spends (spend_date, spend, clicks, impressions)
VALUES ('2026-10-01'::DATE, 158.24, 92, 1315)
ON CONFLICT (spend_date) DO UPDATE 
SET spend = EXCLUDED.spend, clicks = EXCLUDED.clicks, impressions = EXCLUDED.impressions;
