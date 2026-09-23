-- Migration segura e idempotente para garantir CONTA BR 1.5k e Hotmart Webhook
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM facebook_accounts WHERE account_id = 'act_949690764845924'
  ) THEN
    INSERT INTO facebook_accounts (label, account_id, access_token, business_id, token_valid)
    VALUES (
      'CONTA BR 1.5k',
      'act_949690764845924',
      'EAAYeBZCzUEzsBSkX3brv7KrG1dBVNNGCGNUuSAMTc5NZAxO0LyDskVNDYPKbcfZAGZCnAS2JnNLfaXCnhbU088mFvcL9Tc4bQlXB5aZB9WycZBarZA6gCWGh8hLIsIgkRwMRGwbdWu3HqDgBlAx9fsAYnZB9WdkyprJuefoFiQwJgZB8kLHi5sogcIecT0cwZALQn6kQZDZD',
      'BM 4KBRL',
      true
    );
  ELSE
    UPDATE facebook_accounts
    SET label = 'CONTA BR 1.5k',
        business_id = 'BM 4KBRL',
        token_valid = true
    WHERE account_id = 'act_949690764845924';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM webhook_endpoints WHERE slug = 'uq_GVXf_vUiq9m0wAyUeb4SND0EjmQl8'
  ) THEN
    INSERT INTO webhook_endpoints (slug, platform, name)
    VALUES (
      'uq_GVXf_vUiq9m0wAyUeb4SND0EjmQl8',
      'hotmart',
      'Hotmart'
    );
  END IF;
END $$;


