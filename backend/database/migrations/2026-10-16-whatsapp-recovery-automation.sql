-- Migration: Create tables for WhatsApp Evolution API & Automated Recovery Cadence
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id SERIAL PRIMARY KEY,
    base_url VARCHAR(255) NOT NULL DEFAULT '',
    api_key VARCHAR(255) NOT NULL DEFAULT '',
    instance_name VARCHAR(100) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    auto_dispatch_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    cadence_delays_minutes VARCHAR(100) NOT NULL DEFAULT '5,120,1440',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recovery_dispatches (
    id SERIAL PRIMARY KEY,
    recovery_id INTEGER REFERENCES recoveries(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    product_name VARCHAR(255),
    step_number INTEGER DEFAULT 1,
    strategy VARCHAR(50) DEFAULT 'support',
    message_text TEXT NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    evolution_message_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recovery_dispatches_scheduled ON recovery_dispatches(scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_recovery_dispatches_rec_id ON recovery_dispatches(recovery_id);
CREATE INDEX IF NOT EXISTS idx_recovery_dispatches_email ON recovery_dispatches(customer_email);
