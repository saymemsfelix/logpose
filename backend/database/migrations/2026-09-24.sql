-- Conecta automaticamente a conta principal CONTA BR 1.5k (BM 4KBRL)
INSERT INTO facebook_accounts (label, account_id, access_token, business_id, token_valid)
VALUES (
  'CONTA BR 1.5k',
  'act_949690764845924',
  'EAAYeBZCzUEzsBSkX3brv7KrG1dBVNNGCGNUuSAMTc5NZAxO0LyDskVNDYPKbcfZAGZCnAS2JnNLfaXCnhbU088mFvcL9Tc4bQlXB5aZB9WycZBarZA6gCWGh8hLIsIgkRwMRGwbdWu3HqDgBlAx9fsAYnZB9WdkyprJuefoFiQwJgZB8kLHi5sogcIecT0cwZALQn6kQZDZD',
  'BM 4KBRL',
  true
)
ON CONFLICT (account_id) DO UPDATE SET
  label = EXCLUDED.label,
  business_id = EXCLUDED.business_id,
  token_valid = true;
