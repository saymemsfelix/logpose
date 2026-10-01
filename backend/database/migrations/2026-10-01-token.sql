-- Migration 2026-10-01-token: Atualiza token oficial de System User e ativa CONTA BR 3k
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM facebook_accounts WHERE account_id = 'act_949690764845924'
  ) THEN
    INSERT INTO facebook_accounts (label, account_id, access_token, business_id, token_valid)
    VALUES (
      'CONTA BR 3k',
      'act_949690764845924',
      'EAAQNi9yZBwRUBSrDuVbjcMGeIs8jAGv0i3oR5KjGiKwdKzR6lngSCQW075XamzQDBmsESsAqilbfhoYZCSmZBBYQ5eRhkvGZBpEM2BJgO0YctpQ772KZARnbjVZBgZCuT8g3cqQAxCQMFKXq8AYJwQfG3V9osqJJ14ZCYJ2AgTjEOWgmQ0r89w4uSrWwqbud3toxIAZDZD',
      'BM 4KBRL',
      true
    );
  ELSE
    UPDATE facebook_accounts
    SET label = 'CONTA BR 3k',
        access_token = 'EAAQNi9yZBwRUBSrDuVbjcMGeIs8jAGv0i3oR5KjGiKwdKzR6lngSCQW075XamzQDBmsESsAqilbfhoYZCSmZBBYQ5eRhkvGZBpEM2BJgO0YctpQ772KZARnbjVZBgZCuT8g3cqQAxCQMFKXq8AYJwQfG3V9osqJJ14ZCYJ2AgTjEOWgmQ0r89w4uSrWwqbud3toxIAZDZD',
        business_id = 'BM 4KBRL',
        token_valid = true
    WHERE account_id = 'act_949690764845924';
  END IF;
END $$;
