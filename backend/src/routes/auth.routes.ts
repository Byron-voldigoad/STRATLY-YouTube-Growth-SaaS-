import { Router } from "express";
import { google } from "googleapis";
import { supabase } from "../lib/supabase.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

export function createAuthRoutes(): Router {
  const router = Router();

  // Échange le code OAuth YouTube contre des tokens et sauvegarde le profil
  router.post("/youtube/callback", authMiddleware, async (req, res) => {
    try {
      const { code, userId } = req.body;

      if (!code || !userId) {
        return res
          .status(400)
          .json({ success: false, error: "Code et userId requis" });
      }

      // 1. Échanger le code contre des tokens
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_CALLBACK_URL,
      );
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        console.warn(
          "⚠️ No refresh_token received from Google. User may need to revoke access and re-authorize.",
        );
      }

      // 2. Récupérer les infos de la chaîne
      oauth2Client.setCredentials(tokens);
      const youtube = google.youtube({ version: "v3", auth: oauth2Client });
      const channelRes = await youtube.channels.list({
        mine: true,
        part: ["snippet", "statistics"],
      });
      const channel = channelRes.data.items?.[0];
      if (!channel) {
        return res
          .status(404)
          .json({ success: false, error: "Chaîne YouTube non trouvée" });
      }

      // 3. Sauvegarder dans Supabase
      const updateData: Record<string, any> = {
        youtube_access_token: tokens.access_token,
        youtube_channel_id: channel.id,
        youtube_channel_title: channel.snippet?.title,
        youtube_channel_thumbnail: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url,
        updated_at: new Date().toISOString(),
      };

      // Ne mettre à jour le refresh_token QUE s'il est présent
      if (tokens.refresh_token) {
        updateData.youtube_refresh_token = tokens.refresh_token;
      }

      const { error: dbError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

      if (dbError) {
        return res.status(500).json({
          success: false,
          error: "Erreur de sauvegarde: " + dbError.message,
        });
      }

      res.json({
        success: true,
        channelTitle: channel.snippet?.title,
        hasRefreshToken: !!tokens.refresh_token,
      });
    } catch (error: any) {
      console.error("[NERRA] OAuth callback error:", error?.message || error);
      res
        .status(500)
        .json({ success: false, error: error?.message || "Erreur OAuth" });
    }
  });

  return router;
}
