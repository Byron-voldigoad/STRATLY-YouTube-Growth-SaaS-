import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  generateNextDecision,
  evaluateDecision,
  acceptDecision,
  handleResistance,
  getDecisionHistory,
  calculateStrategicTensionScore,
  getChannelMode,
  checkRebootEligibility,
  generateTitleSuggestions,
  generateVideoConcepts,
  evaluateVideoConcept,
  brainstormConcept,
  generateThumbnailBrief,
  linkVideoToDecision,
  evaluateCustomTitle,
  evaluateThumbnailBase64,
} from "../decisionEngine.js";

/**
 * Crée le router des décisions.
 * Reçoit l'instance Genkit `ai` depuis index.ts pour les fonctions qui en ont besoin.
 */
export function createDecisionRoutes(ai: any): Router {
  const router = Router();

  // Génère la prochaine décision
  router.post("/next", authMiddleware, async (req, res) => {
    try {
      const { userId, channelId, auditInsights, userContext } = req.body;
      if (!userId || !channelId) {
        return res.status(400).json({ error: "userId et channelId requis" });
      }
      const decision = await generateNextDecision(ai, userId, channelId, auditInsights, userContext);
      res.json({ success: true, decision });
    } catch (error: any) {
      console.error("[NERRA] Generate decision error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur génération décision" });
    }
  });

  // Évalue une décision après publication
  router.post("/:id/evaluate", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { resultValue } = req.body;
      if (resultValue === undefined) {
        return res.status(400).json({ error: "resultValue requis" });
      }
      const result = await evaluateDecision(id, resultValue);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[NERRA] Evaluate decision error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur évaluation" });
    }
  });

  // Accepte une décision
  router.post("/:id/accept", authMiddleware, async (req, res) => {
    try {
      await acceptDecision(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[NERRA] Accept decision error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur acceptation" });
    }
  });

  // Mise à jour de l'état du workshop
  router.patch("/:id/workshop", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = { ...req.body };

      // Sécurité : on empêche de modifier l'id ou le user_id
      delete updateData.id;
      delete updateData.user_id;
      delete updateData.userId;

      const { error } = await supabase
        .from("decisions")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", req.userId);

      if (error) throw error;

      res.json({ success: true });
    } catch (error: any) {
      console.error("[NERRA] Workshop update error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur mise à jour workshop" });
    }
  });

  // Refuse une décision (gestion de la résistance)
  router.post("/:id/reject", authMiddleware, async (req, res) => {
    try {
      const result = await handleResistance(req.params.id);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[NERRA] Reject decision error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur refus" });
    }
  });

  // Historique des décisions
  router.get("/history", authMiddleware, async (req, res) => {
    try {
      const { userId, channelId } = req.query as { userId: string; channelId: string };
      if (!userId || !channelId) {
        return res.status(400).json({ error: "userId et channelId requis" });
      }
      const history = await getDecisionHistory(userId, channelId);
      res.json({ success: true, history });
    } catch (error: any) {
      console.error("[NERRA] History error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur historique" });
    }
  });

  // Score de tension stratégique
  router.get("/tension-score", authMiddleware, async (req, res) => {
    try {
      const { userId, channelId } = req.query as { userId: string; channelId: string };
      if (!userId || !channelId) {
        return res.status(400).json({ error: "userId et channelId requis" });
      }
      const tension = await calculateStrategicTensionScore(userId, channelId);
      res.json({ success: true, ...tension });
    } catch (error: any) {
      console.error("[NERRA] Tension score error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur tension score" });
    }
  });

  // Mode actuel (ASSISTED / PILOT)
  router.get("/mode", authMiddleware, async (req, res) => {
    try {
      const { userId, channelId } = req.query as { userId: string; channelId: string };
      if (!userId || !channelId) {
        return res.status(400).json({ error: "userId et channelId requis" });
      }
      const modeInfo = await getChannelMode(userId, channelId);
      const reboot = await checkRebootEligibility(userId, channelId);
      res.json({ success: true, ...modeInfo, reboot });
    } catch (error: any) {
      console.error("[NERRA] Mode error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur mode" });
    }
  });

  // Génère les suggestions de titres
  router.post("/:id/titles", authMiddleware, async (req, res) => {
    try {
      const { userContext } = req.body;
      const result = await generateTitleSuggestions(ai, req.params.id, userContext);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[NERRA] Title suggestions error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur génération titres" });
    }
  });

  // Génère les suggestions de concepts
  router.post("/:id/concepts", authMiddleware, async (req, res) => {
    try {
      const { userNotes } = req.body;
      const result = await generateVideoConcepts(ai, req.params.id, userNotes);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[NERRA] Concept suggestions error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur génération concepts" });
    }
  });

  // Évalue un concept personnalisé
  router.post("/:id/evaluate-concept", authMiddleware, async (req, res) => {
    try {
      const { concept } = req.body;
      if (!concept) {
        return res.status(400).json({ error: "concept requis" });
      }
      const result = await evaluateVideoConcept(ai, req.params.id, concept);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[NERRA] Concept evaluation error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur évaluation concept" });
    }
  });

  // Brainstorm : développe un concept
  router.post("/:id/brainstorm", authMiddleware, async (req, res) => {
    try {
      const { concept, userNotes } = req.body;
      if (!concept) {
        return res.status(400).json({ error: "concept requis" });
      }
      const result = await brainstormConcept(ai, req.params.id, concept, userNotes);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[NERRA] Brainstorm error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur brainstorm" });
    }
  });

  // Évalue un titre personnalisé
  router.post("/:id/evaluate-title", authMiddleware, async (req, res) => {
    try {
      const { title, userContext } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Titre requis" });
      }
      const result = await evaluateCustomTitle(ai, req.params.id, title, userContext);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[NERRA] Title evaluation error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur évaluation du titre" });
    }
  });

  // Génère un brief miniature
  router.post("/:id/thumbnail-brief", authMiddleware, async (req, res) => {
    try {
      const { videoTitle } = req.body;
      const result = await generateThumbnailBrief(ai, req.params.id, videoTitle);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[NERRA] Thumbnail brief error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur brief miniature" });
    }
  });

  // Évalue une miniature uploadée en base64
  router.post("/:id/evaluate-thumbnail", authMiddleware, async (req, res) => {
    try {
      const { base64Image } = req.body;
      if (!base64Image) {
        return res.status(400).json({ error: "base64Image requis" });
      }
      const result = await evaluateThumbnailBase64(ai, req.params.id, base64Image);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[NERRA] Thumbnail evaluation error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur évaluation de la miniature" });
    }
  });

  // Lie une vidéo YouTube à une décision
  router.post("/:id/link-video", authMiddleware, async (req, res) => {
    try {
      const { videoId, videoTitle } = req.body;
      if (!videoId) {
        return res.status(400).json({ error: "videoId requis" });
      }
      const result = await linkVideoToDecision(req.params.id, videoId, videoTitle);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("[NERRA] Link video error:", error?.message);
      res.status(500).json({ error: error?.message || "Erreur liaison vidéo" });
    }
  });

  return router;
}
