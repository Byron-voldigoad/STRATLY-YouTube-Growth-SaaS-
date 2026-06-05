import { google, youtube_v3 } from "googleapis";
import { supabase } from "./lib/supabase.js";

export class YouTubeDisconnectedError extends Error {
  code = "YOUTUBE_DISCONNECTED";

  constructor(message = "YOUTUBE_DISCONNECTED") {
    super(message);
    this.name = "YouTubeDisconnectedError";
  }
}

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

async function clearYouTubeTokens(userId: string): Promise<void> {
  await supabase
    .from("profiles")
    .update({
      youtube_access_token: null,
      youtube_refresh_token: null,
      youtube_token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}

function isTokenExpiringSoon(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now() + TOKEN_REFRESH_BUFFER_MS;
}

async function refreshAccessToken(
  userId: string,
  refreshToken: string,
): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET requis");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[AUTH] Token refresh failed:", data);
    if (data.error === "invalid_grant") {
      await clearYouTubeTokens(userId);
      throw new YouTubeDisconnectedError();
    }
    throw new Error(
      `Échec du rafraîchissement du token: ${data.error || response.statusText}`,
    );
  }

  const accessToken = data.access_token as string;
  const expiresIn = (data.expires_in as number) || 3600;
  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      youtube_access_token: accessToken,
      youtube_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;

  return accessToken;
}

export async function getValidYouTubeAccessToken(
  userId: string,
): Promise<string> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "youtube_access_token, youtube_refresh_token, youtube_token_expires_at",
    )
    .eq("id", userId)
    .single();

  if (error || !profile?.youtube_refresh_token) {
    throw new YouTubeDisconnectedError();
  }

  if (
    profile.youtube_access_token &&
    !isTokenExpiringSoon(profile.youtube_token_expires_at)
  ) {
    return profile.youtube_access_token;
  }

  return refreshAccessToken(userId, profile.youtube_refresh_token);
}

export async function getValidYouTubeClient(
  userId: string,
): Promise<youtube_v3.Youtube> {
  const accessToken = await getValidYouTubeAccessToken(userId);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL,
  );
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.youtube({ version: "v3", auth: oauth2Client });
}
