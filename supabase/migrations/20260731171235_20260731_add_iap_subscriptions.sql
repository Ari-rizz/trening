CREATE TABLE IF NOT EXISTS iap_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  transaction_id text NOT NULL,
  environment text NOT NULL DEFAULT 'Production',
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  original_purchase_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, transaction_id)
);

ALTER TABLE iap_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_iap" ON iap_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_iap" ON iap_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_iap" ON iap_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_iap" ON iap_subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
