"use client";

import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Calendar,
  Target,
  Upload,
  User,
  Video,
  Check,
  X,
  Youtube,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [channelInfo, setChannelInfo] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Fonction pour rafraîchir le token
  const refreshYouTubeToken = async (refreshToken: string, userId: string) => {
    if (!refreshToken) {
      console.error("No refresh token available");
      setYoutubeConnected(false);
      return false;
    }

    try {
      const response = await fetch("/api/youtube/refresh-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
          user_id: userId,
        }),
      });

      if (response.ok) {
        console.log("Token refreshed successfully");
        // Recharger la page pour réessayer
        window.location.reload();
        return true;
      } else {
        console.error("Failed to refresh token");
        setYoutubeConnected(false);
        return false;
      }
    } catch (error) {
      console.error("Error refreshing token:", error);
      setYoutubeConnected(false);
      return false;
    }
  };

  // Récupérer d'abord l'utilisateur, PUIS vérifier YouTube
  useEffect(() => {
    const getUserAndYouTube = async () => {
      const supabase = createClient();

      // 1. Récupérer l'utilisateur
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // 2. Vérifier la connexion YouTube
      try {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select(
            "youtube_access_token, youtube_channel_id, youtube_token_expires_at, youtube_refresh_token"
          )
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          setLoading(false);
          return;
        }

        console.log("Profile data:", profile);

        // Debug logs
        console.log("=== DASHBOARD DEBUG ===");
        console.log("User:", user?.email);
        console.log(
          "YouTube Access Token:",
          profile?.youtube_access_token ? "PRESENT" : "NULL"
        );
        console.log(
          "YouTube Channel ID:",
          profile?.youtube_channel_id || "NULL"
        );
        console.log(
          "YouTube Refresh Token:",
          profile?.youtube_refresh_token ? "PRESENT" : "NULL"
        );
        console.log("========================");

        // Vérifier si le token existe ET s'il n'est pas expiré
        const isTokenValid =
          profile.youtube_access_token &&
          (!profile.youtube_token_expires_at ||
            new Date(profile.youtube_token_expires_at) > new Date());

        if (isTokenValid && profile.youtube_channel_id) {
          setYoutubeConnected(true);

          // 3. Récupérer les infos YouTube avec timeout
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout

            const response = await fetch(
              `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${profile.youtube_channel_id}`,
              {
                headers: {
                  Authorization: `Bearer ${profile.youtube_access_token}`,
                  Accept: "application/json",
                },
                signal: controller.signal,
              }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
              console.error(
                "YouTube API error:",
                response.status,
                response.statusText
              );
              const errorText = await response.text();
              console.error("Error response:", errorText);

              // Vérifier si c'est une erreur 401 (token expiré)
              if (response.status === 401) {
                console.log("Token expired, trying to refresh...");
                // Essayer de rafraîchir le token
                await refreshYouTubeToken(
                  profile.youtube_refresh_token,
                  user.id
                );
                return;
              }

              throw new Error(`YouTube API returned ${response.status}`);
            }

            const data = await response.json();
            console.log("YouTube API success:", data);

            if (data.items?.[0]) {
              setChannelInfo(data.items[0].snippet);
              setStats(data.items[0].statistics);
              setYoutubeConnected(true);
            }
          } catch (error: any) {
            console.error("Fetch error:", error);

            if (error.name === "AbortError") {
              setErrorMessage(
                "YouTube API request timeout. Please try again."
              );
            } else if (error.message.includes("Failed to fetch")) {
              setErrorMessage(
                "Network error. Please check your internet connection."
              );
            } else {
              setErrorMessage("Error fetching YouTube data: " + error.message);
            }

            setYoutubeConnected(false);
          }
        } else {
          console.log("YouTube not connected or token expired");
          console.log("Token exists:", !!profile.youtube_access_token);
          console.log("Token expiry:", profile.youtube_token_expires_at);
          console.log("Channel ID:", profile.youtube_channel_id);
          setYoutubeConnected(false);
        }
      } catch (error) {
        console.error("Error in YouTube check:", error);
        setErrorMessage("Error checking YouTube connection");
      } finally {
        setLoading(false);
      }
    };

    getUserAndYouTube();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleReconnectYouTube = () => {
    router.push("/dashboard/connect");
  };

  const handleRefresh = () => {
    setLoading(true);
    setErrorMessage("");
    setChannelInfo(null);
    setStats(null);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg"></div>
              <span className="text-xl font-bold text-gray-900">Stratly</span>
            </div>

            <div className="flex items-center space-x-4">
              <button className="flex items-center space-x-2 text-gray-700 hover:text-blue-600">
                <User className="w-5 h-5" />
                <span>{user?.email}</span>
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.email?.split("@")[0]}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's your YouTube growth dashboard
          </p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-700">{errorMessage}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleReconnectYouTube}
                    className="text-sm font-medium text-yellow-700 hover:text-yellow-600 underline"
                  >
                    Reconnect YouTube
                  </button>
                  <button
                    onClick={handleRefresh}
                    className="text-sm font-medium text-yellow-700 hover:text-yellow-600 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* YouTube Connection Status */}
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              YouTube Connection
            </h3>
            {youtubeConnected && channelInfo ? (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="w-5 h-5" />
                Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600">
                <X className="w-5 h-5" />
                Not Connected
              </span>
            )}
          </div>

          {youtubeConnected && channelInfo ? (
            <div>
              <div className="flex items-center space-x-3 mb-4">
                {channelInfo.thumbnails?.default && (
                  <img
                    src={channelInfo.thumbnails.default.url}
                    alt="YouTube Channel"
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-semibold text-lg">{channelInfo.title}</p>
                  <p className="text-gray-600">
                    {channelInfo.customUrl || channelInfo.title}
                  </p>
                </div>
              </div>

              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-600">Subscribers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {parseInt(stats.subscriberCount || "0").toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Views</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {parseInt(stats.viewCount || "0").toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Videos</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {parseInt(stats.videoCount || "0").toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600">Channel Created</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(channelInfo.publishedAt).getFullYear()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                Connect your YouTube channel to import analytics and generate
                growth plans.
              </p>
              <button
                onClick={() => router.push("/dashboard/connect")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                Connect YouTube Channel
              </button>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Monthly Views</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats ? "--" : "--"}
                </p>
              </div>
              <BarChart3 className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Subscribers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats
                    ? parseInt(stats.subscriberCount || "0").toLocaleString()
                    : "--"}
                </p>
              </div>
              <Target className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Videos</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats
                    ? parseInt(stats.videoCount || "0").toLocaleString()
                    : "--"}
                </p>
              </div>
              <Video className="w-10 h-10 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => router.push("/dashboard/analyze")}
              className="bg-white p-4 rounded-lg border hover:border-blue-500 hover:shadow transition text-left"
            >
              <h3 className="font-semibold text-gray-900">
                Generate Monthly Report
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Get AI-powered insights
              </p>
            </button>

            <button className="bg-white p-4 rounded-lg border hover:border-blue-500 hover:shadow transition text-left">
              <h3 className="font-semibold text-gray-900">Video Ideas</h3>
              <p className="text-sm text-gray-600 mt-1">
                Get content suggestions
              </p>
            </button>

            <button className="bg-white p-4 rounded-lg border hover:border-blue-500 hover:shadow transition text-left">
              <h3 className="font-semibold text-gray-900">Analytics</h3>
              <p className="text-sm text-gray-600 mt-1">View detailed stats</p>
            </button>
          </div>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">Debug Info</h3>
            <pre className="text-xs text-yellow-700 overflow-auto">
              YouTube Connected: {youtubeConnected.toString()}
              {"\n"}
              Channel ID: {channelInfo ? "Present" : "Not found"}
              {"\n"}
              Stats: {stats ? "Present" : "Not found"}
              {"\n"}
              User: {user?.email || "Not loaded"}
              {"\n"}
              Error: {errorMessage || "None"}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}