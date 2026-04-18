ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS strategic_tension_score numeric DEFAULT 0;

CREATE OR REPLACE VIEW channel_tension AS
SELECT
  user_id,
  channel_id,
  LEAST(100, ROUND(
    (
      (COUNT(CASE WHEN is_resistance_confirmed = true THEN 1 END) * 15) +
      (COUNT(CASE WHEN verdict = 'SKIPPED' THEN 1 END) * 5) +
      (COUNT(CASE WHEN verdict = 'FAILED' THEN 1 END) * 2)
    )::numeric /
    NULLIF(COUNT(*), 0)
  )) AS tension_score,
  COUNT(*) AS total_decisions,
  COUNT(CASE WHEN verdict = 'VALIDEE' THEN 1 END) AS validated_count
FROM decisions
GROUP BY user_id, channel_id;