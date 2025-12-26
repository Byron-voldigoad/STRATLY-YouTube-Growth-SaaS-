// lib/ai/openai-service.ts

import OpenAI from "openai";

// NOTE: The fetchWithRetry function is not needed when using the official OpenAI client,
// as it has its own built-in retry mechanism with exponential backoff.

interface VideoData {
  video_title: string;
  views: number;
  likes: number;
  comments: number;
  published_at: string;
  tags?: string[];
}

interface ChannelStats {
  title: string;
  subscribers: number;
  totalViews: number;
}

export class OpenAIAnalyzer {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      // In a real app, you might throw an error or handle this more gracefully.
      // For now, we allow construction but methods will use mock data.
      console.warn("⚠️ OPENAI_API_KEY is not set. AI analysis will be mocked.");
      this.openai = new OpenAI({ apiKey: "mock_key_if_not_provided" }); // Prevent crash
    } else {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 3, // Corresponds to the old fetchWithRetry logic
      });
    }
  }

  private isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async analyzeChannelPerformance(
    videos: VideoData[],
    channelStats: ChannelStats
  ): Promise<string> {
    if (this.isConfigured()) {
      return this.generateRealAIAnalysis(videos, channelStats);
    }
    return this.getMockAnalysis(videos, channelStats);
  }

  private async generateRealAIAnalysis(
    videos: VideoData[],
    channelStats: ChannelStats
  ): Promise<string> {
    try {
      console.log("🧠 [OpenAI Service] Generating real channel analysis...");

      const sortedVideos = [...videos].sort((a, b) => b.views - a.views);
      const topVideos = sortedVideos.slice(0, 3);
      const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
      const avgViews =
        videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
      const totalEngagement = videos.reduce(
        (sum, v) => sum + v.likes + v.comments,
        0
      );
      const engagementRate =
        totalViews > 0
          ? ((totalEngagement / totalViews) * 100).toFixed(1)
          : "0";

      const systemPrompt = `You are a world-class YouTube growth strategist and data analyst. Your name is Stratly. Analyze the following YouTube channel data and provide a professional, actionable growth plan in French. Generate a detailed analysis in Markdown format. Use emojis to make it engaging. Structure your response with the following sections EXACTLY:

### 🎯 **1. Diagnostic Exécutif**
*(Provide a 2-sentence summary of the channel's current state and main potential.)*

### ✨ **2. Vos Points Forts**
*(List 3 specific strengths based on the provided data. Be concrete.)*

### ⚠️ **3. Axes d'Amélioration Prioritaires**
*(List 3 specific areas for improvement. Provide actionable advice.)*

### 📈 **4. Stratégie de Contenu & SEO**
*(Suggest a content strategy and SEO improvements.)*
- **Thématiques à Explorer:** (Suggest 2-3 new video series or topics).
- **Optimisation SEO:** (Provide 2 concrete SEO tips).

### 🚀 **5. Plan d'Action en 3 Étapes**
*(Provide 3 immediate, simple, and actionable steps.)*

Begin the response directly with "### 🎯 **1. Diagnostic Exécutif**". Do not add any introductory sentence.`;

      const topVideosContent = topVideos
        .map(
          (v, i) => `
        ${i + 1}. "${v.video_title}"
            - Views: ${v.views.toLocaleString()}
            - Likes: ${v.likes.toLocaleString()}
            - Comments: ${v.comments.toLocaleString()}
        `
        )
        .join("\n");

      const userPrompt = `
        ## Channel Data
        - **Name:** ${channelStats.title}
        - **Subscribers:** ${channelStats.subscribers.toLocaleString()}
        - **Total Views (from provided videos):** ${totalViews.toLocaleString()}
        - **Average Views per Video:** ${avgViews.toLocaleString()}
        - **Engagement Rate (Likes+Comments/Views):** ${engagementRate}%
        - **Number of Recent Videos Analyzed:** ${videos.length}

        ## Top 3 Performing Videos (by views)
        ${topVideosContent}
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106", // A cost-effective and powerful model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.8,
      });

      const text = completion.choices[0]?.message?.content;
      if (!text) {
        console.error(
          "❌ [OpenAI Service] Invalid response from OpenAI API",
          completion
        );
        throw new Error("Invalid response from OpenAI API");
      }

      return text;
    } catch (error) {
      console.error("❌ [OpenAI Service] Error during analysis:", error);
      return (
        this.getMockAnalysis(videos, channelStats) +
        "\n\n--- \n*⚠️ Une erreur est survenue lors de la communication avec l'IA. Affichage d'une analyse de secours.*"
      );
    }
  }

  private getMockAnalysis(
    videos: VideoData[],
    channelStats: ChannelStats
  ): string {
    const bestVideo =
      videos.length > 0
        ? videos.reduce((a, b) => (a.views > b.views ? a : b), videos[0])
        : null;

    return `
## 🤖 *Mode Démo - Analyse IA non disponible*

Ceci est un exemple d'analyse. Pour obtenir une véritable analyse personnalisée de votre chaîne, veuillez configurer votre clé API OpenAI.

### 🎯 **1. Diagnostic Exécutif**
Votre chaîne montre un bon potentiel sur les sujets de comparaison technologique, mais peine à fidéliser l'audience sur des formats plus larges. La clé est de capitaliser sur vos succès pour construire une base solide.

### ✨ **2. Vos Points Forts (Exemples)**
1.  **Sujets à Forte Demande** : La vidéo "${bestVideo?.video_title}" a très bien fonctionné, prouvant votre capacité à cibler les intérêts populaires.
2.  **Qualité de Production** : Vos vidéos sont propres et bien montées.
3.  **Niche Claire** : Vous vous concentrez sur la tech, ce qui est excellent.

### ⚠️ **3. Axes d'Amélioration (Exemples)**
1.  **Engagement Faible** : Il faut activement poser des questions à votre audience.
2.  **Miniatures non optimisées** : Les miniatures pourraient être plus contrastées.
3.  **Appels à l'action manquants** : Demandez aux gens de s'abonner.

### 🚀 **Pour activer l'IA réelle :**
1.  Créez une clé API sur [platform.openai.com](https://platform.openai.com/).
2.  Ajoutez \`OPENAI_API_KEY=votre_clé_ici\` à votre fichier \`.env.local\`.
3.  Redémarrez votre application.
    `;
  }

  async generateVideoIdeas(videos: VideoData[]): Promise<string[]> {
    if (this.isConfigured()) {
      return this.generateRealVideoIdeas(videos);
    }
    return this.getMockVideoIdeas();
  }

  private async generateRealVideoIdeas(videos: VideoData[]): Promise<string[]> {
    try {
      console.log("💡 [OpenAI Service] Generating real video ideas...");
      const bestVideo =
        videos.length > 0
          ? videos.reduce((a, b) => (a.views > b.views ? a : b), videos[0])
          : null;
      if (!bestVideo) return [];

      const systemPrompt = `You are a viral YouTube video idea generator. Based on the data from a channel's best performing video, generate 5 creative and specific video ideas in French.

Your task is to generate 5 video ideas. For each idea, provide the following in Markdown format:
- A catchy, SEO-optimized **Title** with 2-3 relevant hashtags
- A 2-sentence **Concept** explaining why it would work.
- A list of 5-7 SEO-optimized **Tags**.

## Example Format for ONE idea:
**Titre** : iPhone 16 vs Google Pixel 9 : LE DUEL INATTENDU #iphone16 #pixel9
**Concept** : Capitalisez sur le succès des comparaisons en opposant l'iPhone à un concurrent différent mais très recherché. Cela attire à la fois l'audience Apple et l'audience Google.
**Tags** : iphone 16, pixel 9, comparaison, tech, smartphone, apple vs google, review fr

Now, generate 5 distinct ideas. Start directly with the first idea. Do not add any intro.`;

      const userPrompt = `
        ## Best Performing Video Data
        - **Title:** "${bestVideo.video_title}"
        - **Stats:** ${bestVideo.views.toLocaleString()} views, ${bestVideo.likes.toLocaleString()} likes.
        - **Tags:** ${bestVideo.tags?.join(", ") || "N/A"}
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo-1106",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const text = completion.choices[0]?.message?.content;
      if (!text) {
        console.error(
          "❌ [OpenAI Service] Invalid response from OpenAI API for video ideas."
        );
        throw new Error("Invalid response from OpenAI API");
      }

      const ideas = text
        .split("**Titre**")
        .filter((idea) => idea.trim().length > 0)
        .map((idea) => "**Titre**" + idea.trim());
      return ideas.slice(0, 5);
    } catch (error) {
      console.error("❌ [OpenAI Service] Error generating video ideas:", error);
      return this.getMockVideoIdeas();
    }
  }

  private getMockVideoIdeas(): string[] {
    return [
      `**Titre** : iPhone 16 vs Samsung S25 : Le VRAI Test ! #tech #comparaison #iphone\n**Concept** : Une comparaison approfondie des prochains flagships, avec un focus sur les fonctionnalités que personne ne mentionne. Cela génère de l'anticipation.\n**Tags** : iphone 16, samsung s25, comparaison, tech, smartphone, apple, android`,
      `**Titre** : 5 Gadgets Tech à MOINS de 50€ qui vont changer votre vie #gadget #tech #budget\n**Concept** : Un format rapide et très partageable qui attire une large audience au-delà des fans de smartphones. Parfait pour la découvrabilité.\n**Tags** : gadget, tech, pas cher, amazon, high tech`,
      `**Titre** : L'Écosystème Apple en 2025 : Est-ce que ça vaut ENCORE le coup ? #apple #ecosystem #iphone16\n**Concept** : Une analyse critique et honnête de l'écosystème Apple, qui peut générer du débat et donc de l'engagement.\n**Tags** : écosystème apple, apple, iphone, macbook, apple watch`,
      `**Titre** : J'ai remplacé mon iPhone par un Xiaomi : 30 jours plus tard... #xiaomi #iphone #experience\n**Concept** : Un retour d'expérience personnel et authentique est un format très puissant pour créer de la confiance avec l'audience.\n**Tags** : xiaomi, iphone, android, test longue durée, avis`,
      `**Titre** : Le MEILLEUR Smartphone pour la VIDÉO en 2024 ? (feat. iPhone, Samsung, Sony) #photographie #cinematic #4k\n**Concept** : Un contenu de niche à haute valeur ajoutée pour les créateurs de contenu, qui peut vous positionner comme un expert.\n**Tags** : smartphone video, camera test, iphone 16 camera, samsung s25 camera, sony xperia`,
    ];
  }
}
