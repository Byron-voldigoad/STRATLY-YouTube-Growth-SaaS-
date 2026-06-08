import { supabase as supabaseAdmin } from "./supabase.js";

export function logAiInteraction(
  userId: string,
  channelId: string,
  channelNiche: string | null,
  logType: string,
  prompt: string,
  response: any,
  modelUsed: string,
  latencyMs: number,
  decisionId?: string,
  score?: number | null
) {
  console.log(`[LOGGER] Attempting to log interaction: ${logType} for user ${userId}`);
  
  // Fire and forget
  (async () => {
    try {
      // Ensure response is a clean object and not null (which would fail NOT NULL constraint)
      const cleanResponse = response ? JSON.parse(JSON.stringify(response)) : {};
      
      const { error } = await supabaseAdmin.from('ai_logs').insert({
        user_id: userId,
        channel_id: channelId,
        channel_niche: channelNiche,
        log_type: logType,
        prompt: prompt,
        response: cleanResponse,
        model_used: modelUsed,
        latency_ms: latencyMs,
        decision_id: decisionId || null,
        score: score ?? null
      });
      
      if (error) {
        console.error("[LOGGER] Failed to log AI interaction:", error.message, error.details, error.hint);
      } else {
        console.log(`[LOGGER] Successfully logged interaction: ${logType}`);
      }
    } catch (err: any) {
      console.error("[LOGGER] Exception logging AI interaction:", err);
    }
  })();
}
