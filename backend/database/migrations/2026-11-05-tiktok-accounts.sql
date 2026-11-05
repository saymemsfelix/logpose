-- Cria tabela de contas TikTok Ads para sincronização multicanal
CREATE TABLE IF NOT EXISTS tiktok_accounts (
    id SERIAL PRIMARY KEY,
    label VARCHAR(255) NOT NULL,
    advertiser_id VARCHAR(100) UNIQUE NOT NULL,
    app_id VARCHAR(100),
    secret VARCHAR(255),
    access_token VARCHAR(500) NOT NULL,
    token_valid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

