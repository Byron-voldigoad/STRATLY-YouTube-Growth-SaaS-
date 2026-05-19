CREATE TABLE public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id text NOT NULL,
  channel_niche text,
  log_type text NOT NULL,
  -- valeurs possibles : 'audit', 'decision_generation',
  -- 'workshop_concept', 'workshop_brainstorm',
  -- 'workshop_title', 'workshop_thumbnail', 'niche_detection'
  prompt text NOT NULL,
  response jsonb NOT NULL,
  model_used text NOT NULL,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX ai_logs_user_id_idx ON ai_logs(user_id);
CREATE INDEX ai_logs_channel_id_idx ON ai_logs(channel_id);
CREATE INDEX ai_logs_log_type_idx ON ai_logs(log_type);
CREATE INDEX ai_logs_created_at_idx ON ai_logs(created_at);

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own logs"
  ON ai_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert logs"
  ON ai_logs FOR INSERT
  WITH CHECK (true);