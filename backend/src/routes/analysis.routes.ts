import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

export function createAnalysisRoutes(): Router {
  const router = Router();

  // Récupère la dernière analyse AI
  router.get("/latest", authMiddleware, async (req, res) => {
    try {
      const { userId, channelId, type } = req.query as { userId: string; channelId: string; type?: string };
      if (!userId || !channelId) {
        return res.status(400).json({ error: "userId et channelId requis" });
      }
      const analysisType = type || "channel";

      const { data, error } = await supabase
        .from("ai_analyses")
        .select("analysis_text, updated_at")
        .eq("user_id", userId)
        .eq("channel_id", channelId)
        .eq("analysis_type", analysisType)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return res.json({ success: true, result: null });
      }

      res.json({ success: true, result: JSON.parse(data.analysis_text), updatedAt: data.updated_at });
    } catch (error: any) {
      console.error("[NERRA] Fetch latest analysis error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur récupération analyse" });
    }
  });

  return router;
}
