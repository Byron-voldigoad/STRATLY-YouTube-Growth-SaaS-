// lib/ai/gemini-service.ts - VERSION REFACTORISÉE POUR SERVEUR

// Fonction pour retenter une requête en cas d'erreur 429
async function fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Si succès, retournez la réponse
      if (response.ok) return response;
      
      // Si quota dépassé (429), attendez avant de réessayer
      if (response.status === 429) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Backoff exponentiel (max 10s)
        console.log(`⚠️ Quota dépassé. Tentative ${attempt}/${maxRetries}. Attente de ${waitTime}ms...`);
        lastError = new Error(`Quota dépassé (tentative ${attempt})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Pour les autres erreurs, lancez une exception
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorBody}`);
      
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error;
      if (attempt === maxRetries) break;
      // Wait before the next retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  console.error("All retries failed.");
  throw lastError;
}


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

export class YouTubeAIAnalyzer {
  // Le constructeur est maintenant vide
  constructor() {}

  async analyzeChannelPerformance(videos: VideoData[], channelStats: ChannelStats): Promise<string> {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith('AIza')) {
      return this.generateRealAIAnalysis(videos, channelStats);
    }
    
    // Sinon, retourne l'analyse mockée
    return this.getMockAnalysis(videos, channelStats);
  }
  
  private async generateRealAIAnalysis(videos: VideoData[], channelStats: ChannelStats): Promise<string> {
    try {
      console.log('🧠 [Gemini Service] Génération d\'une analyse de chaîne réelle avec gestion de retry...');
      
      const apiKey = process.env.GEMINI_API_KEY;
      const model = 'gemini-1.5-flash-latest';
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const sortedVideos = [...videos].sort((a, b) => b.views - a.views);
      const topVideos = sortedVideos.slice(0, 3);
      const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
      const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
      const totalEngagement = videos.reduce((sum, v) => sum + v.likes + v.comments, 0);
      const engagementRate = totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(1) : "0";
      
      const prompt = `
        You are a world-class YouTube growth strategist and data analyst. Your name is Stratly.
        Analyze the following YouTube channel data and provide a professional, actionable growth plan in French.

        ##  Channel Data
        - **Name:** ${channelStats.title}
        - **Subscribers:** ${channelStats.subscribers.toLocaleString()}
        - **Total Views (from provided videos):** ${totalViews.toLocaleString()}
        - **Average Views per Video:** ${avgViews.toLocaleString()}
        - **Engagement Rate (Likes+Comments/Views):** ${engagementRate}%
        - **Number of Recent Videos Analyzed:** ${videos.length}

        ## Top 3 Performing Videos (by views)
        ${topVideos.map((v, i) => `
        ${i+1}. "${v.video_title}"
            - Views: ${v.views.toLocaleString()}
            - Likes: ${v.likes.toLocaleString()}
            - Comments: ${v.comments.toLocaleString()}
        `).join('\n')}

        ## Your Task
        Generate a detailed analysis in Markdown format. Use emojis to make it engaging.
        Structure your response with the following sections EXACTLY:

        ### 🎯 **1. Diagnostic Exécutif**
        *(Provide a 2-sentence summary of the channel's current state and main potential.)*

        ### ✨ **2. Vos Points Forts**
        *(List 3 specific strengths based on the provided data. Be concrete. Example: "Votre format 'Samsung vs iPhone' est un succès clair, capitalisant sur une forte intention de recherche.")*

        ### ⚠️ **3. Axes d'Amélioration Prioritaires**
        *(List 3 specific areas for improvement. Provide actionable advice. Example: "L'engagement sur les vidéos moins performantes est faible. Intégrez un appel à l'action clair à 30 secondes pour encourager les likes.")*

        ### 📈 **4. Stratégie de Contenu & SEO**
        *(Suggest a content strategy and SEO improvements. Be specific.)*
        - **Thématiques à Explorer:** (Suggest 2-3 new video series or topics based on top performers).
        - **Optimisation SEO:** (Provide 2 concrete SEO tips for titles, descriptions, or tags).

        ### 🚀 **5. Plan d'Action en 3 Étapes**
        *(Provide 3 immediate, simple, and actionable steps for the creator to take.)*
        
        Begin the response directly with "### 🎯 **1. Diagnostic Exécutif**". Do not add any introductory sentence.
      `;

      const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 1024,
        }
      };

      const response = await fetchWithRetry(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }, 3);

      const responseData = await response.json();
      
      if (!responseData.candidates || !responseData.candidates[0]?.content?.parts[0]?.text) {
        console.error('❌ [Gemini Service] Réponse invalide de l\'API Gemini', responseData);
        throw new Error('Réponse invalide de l\'API Gemini');
      }
      
      const text = responseData.candidates[0].content.parts[0].text;
      return text;
      
    } catch (error) {
      console.error('❌ [Gemini Service] Erreur après toutes les tentatives:', error);
      return this.getMockAnalysis(videos, channelStats) + 
        '\n\n--- \n*⚠️ Une erreur est survenue lors de la communication avec l\'IA après plusieurs tentatives. Affichage d\'une analyse de secours.*';
    }
  }
  
  private calculateTimeSpan(videos: VideoData[]): number {
    if (videos.length < 2) return 1;
    const dates = videos.map(v => new Date(v.published_at).getTime());
    const oldest = Math.min(...dates);
    const newest = Math.max(...dates);
    const monthsDiff = (newest - oldest) / (1000 * 60 * 60 * 24 * 30);
    return Math.max(1, Math.round(monthsDiff));
  }
  
  private getMockAnalysis(videos: VideoData[], channelStats: ChannelStats): string {
    const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
    const avgViews = videos.length > 0 ? Math.round(totalViews / videos.length) : 0;
    const bestVideo = videos.length > 0 ? videos.reduce((a, b) => a.views > b.views ? a : b, videos[0]) : null;
    
    return `
## 🤖 *Mode Démo - Analyse IA non disponible*

Ceci est un exemple d'analyse. Pour obtenir une véritable analyse personnalisée de votre chaîne, veuillez configurer votre clé API Gemini.

### 🎯 **1. Diagnostic Exécutif**
Votre chaîne montre un bon potentiel sur les sujets de comparaison technologique, mais peine à fidéliser l'audience sur des formats plus larges. La clé est de capitaliser sur vos succès pour construire une base solide.

### ✨ **2. Vos Points Forts (Exemples)**
1.  **Sujets à Forte Demande** : La vidéo "${bestVideo?.video_title}" a très bien fonctionné, prouvant votre capacité à cibler les intérêts populaires.
2.  **Qualité de Production** : Vos vidéos sont propres et bien montées, ce qui est un standard nécessaire aujourd'hui.
3.  **Niche Claire** : Vous vous concentrez sur la tech, ce qui est excellent pour construire une audience fidèle.

### ⚠️ **3. Axes d'Amélioration Prioritaires (Exemples)**
1.  **Engagement Faible** : Avec seulement X commentaires en moyenne, il faut activement poser des questions à votre audience.
2.  **Miniatures non optimisées** : Les miniatures pourraient être plus contrastées et utiliser des visages pour augmenter le taux de clics.
3.  **Appels à l'action manquants** : N'oubliez pas de demander aux gens de s'abonner et d'activer les notifications.

### 🚀 **Pour activer l'IA réelle :**
1.  Allez sur **Google AI Studio** pour créer une clé API gratuite.
2.  Ajoutez \`GEMINI_API_KEY=votre_clé_ici\` à votre fichier \`.env.local\`.
3.  Redémarrez votre application.
    `;
  }
  
  async generateVideoIdeas(videos: VideoData[]): Promise<string[]> {
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith('AIza')) {
      return this.generateRealVideoIdeas(videos);
    }
    
    return this.getMockVideoIdeas(videos);
  }
  
  private async generateRealVideoIdeas(videos: VideoData[]): Promise<string[]> {
    try {
      console.log('💡 [Gemini Service] Génération d\'idées de vidéos réelles via Fetch direct...');
      const bestVideo = videos.length > 0 ? videos.reduce((a, b) => a.views > b.views ? a : b, videos[0]) : null;
      if (!bestVideo) return [];

      const apiKey = process.env.GEMINI_API_KEY;
      const model = 'gemini-1.5-flash-latest';
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const prompt = `
        You are a viral YouTube video idea generator.
        Based on the data from this channel's best performing video, generate 5 creative and specific video ideas in French.

        ## Best Performing Video Data
        - **Title:** "${bestVideo.video_title}"
        - **Stats:** ${bestVideo.views.toLocaleString()} views, ${bestVideo.likes.toLocaleString()} likes.
        - **Tags:** ${bestVideo.tags?.join(', ') || 'N/A'}

        ## Your Task
        Generate 5 video ideas. For each idea, provide the following in Markdown:
        - A catchy, SEO-optimized **Title** with 2-3 relevant hashtags.
        - A 2-sentence **Concept** explaining why it would work.
        - A list of 5-7 SEO-optimized **Tags**.

        ## Example Format for ONE idea:
        **Titre** : iPhone 16 vs Google Pixel 9 : LE DUEL INATTENDU #iphone16 #pixel9
        **Concept** : Capitalisez sur le succès des comparaisons en opposant l'iPhone à un concurrent différent mais très recherché. Cela attire à la fois l'audience Apple et l'audience Google.
        **Tags** : iphone 16, pixel 9, comparaison, tech, smartphone, apple vs google, review fr

        Now, generate 5 distinct ideas based on the provided best performing video. Start directly with the first idea. Do not add any intro.
      `;
      
      const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      const response = await fetchWithRetry(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }, 3);

      if (!response.ok) {
        const errorBody = await response.json();
        console.error('❌ [Gemini Service] Erreur Fetch (génération idées):', errorBody);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      const text = responseData.candidates[0].content.parts[0].text;
      
      // Split ideas based on a consistent pattern like "**Titre**"
      const ideas = text.split('**Titre**').filter((idea: string) => idea.trim().length > 0).map((idea: string) => '**Titre**' + idea.trim());
      return ideas.slice(0, 5);
      
    } catch (error) {
      console.error('❌ [Gemini Service] Erreur génération idées:', error);
      return this.getMockVideoIdeas(videos);
    }
  }
  
  private getMockVideoIdeas(videos: VideoData[]): string[] {
    const bestVideo = videos.length > 0 ? videos.reduce((a, b) => a.views > b.views ? a : b, videos[0]) : { video_title: '' };
    const isTech = bestVideo.video_title.toLowerCase().includes('iphone') || bestVideo.video_title.toLowerCase().includes('samsung');
    
    if (isTech) {
      return [
        `**Titre** : iPhone 16 vs Samsung S25 : Le VRAI Test ! #tech #comparaison #iphone\n**Concept** : Une comparaison approfondie des prochains flagships, avec un focus sur les fonctionnalités que personne ne mentionne. Cela génère de l'anticipation.\n**Tags** : iphone 16, samsung s25, comparaison, tech, smartphone, apple, android`,
        `**Titre** : 5 Gadgets Tech à MOINS de 50€ qui vont changer votre vie #gadget #tech #budget\n**Concept** : Un format rapide et très partageable qui attire une large audience au-delà des fans de smartphones. Parfait pour la découvrabilité.\n**Tags** : gadget, tech, pas cher, amazon, high tech`,
        `**Titre** : L'Écosystème Apple en 2025 : Est-ce que ça vaut ENCORE le coup ? #apple #ecosystem #iphone16\n**Concept** : Une analyse critique et honnête de l'écosystème Apple, qui peut générer du débat et donc de l'engagement.\n**Tags** : écosystème apple, apple, iphone, macbook, apple watch`,
        `**Titre** : J'ai remplacé mon iPhone par un Xiaomi : 30 jours plus tard... #xiaomi #iphone #experience\n**Concept** : Un retour d'expérience personnel et authentique est un format très puissant pour créer de la confiance avec l'audience.\n**Tags** : xiaomi, iphone, android, test longue durée, avis`,
        `**Titre** : Le MEILLEUR Smartphone pour la VIDÉO en 2024 ? (feat. iPhone, Samsung, Sony) #photographie #cinematic #4k\n**Concept** : Un contenu de niche à haute valeur ajoutée pour les créateurs de contenu, qui peut vous positionner comme un expert.\n**Tags** : smartphone video, camera test, iphone 16 camera, samsung s25 camera, sony xperia`,
      ];
    }
    
    return [
      `**Titre** : [AMV] ONE PIECE - Final Arc Saga | Cinematic Edit #amv #onepiece #luffy\n**Concept** : Capitaliser sur l'hype de l'arc final de One Piece pour attirer une audience massive de fans. Le format cinématique est très populaire.\n**Tags** : amv, one piece, luffy, gear 5, wano, edit`,
      `**Titre** : Jujutsu Kaisen - Le plus TRISTE moment de Shibuya (Edit 4k) #jujutsukaisen #amv #sadanime\n**Concept** : Les edits émotionnels sur des moments clés d'un animé génèrent énormément de partages et de commentaires. La 4k est un plus.\n**Tags** : jujutsu kaisen, gojo, shibuya, amv, sad edit`,
      `**Titre** : Quand les ANIMES rencontrent la PHONK | Best Remix 2024 #phonk #anime #remix\n**Concept** : La musique Phonk est extrêmement tendance. L'associer avec des scènes d'action d'animés populaires est une recette pour la viralité.\n**Tags** : phonk, anime edit, amv, aggressive phonk, drift`,
      `**Titre** : L'Évolution de l'Animation : 1990 vs 2024 (Dragon Ball, Naruto, AOT) #anime #evolution #animation\n**Concept** : Un format 'vs' qui compare l'ancien et le nouveau, suscitant la nostalgie et le débat dans les commentaires.\n**Tags** : animation, anime, evolution, then vs now, dragon ball`,
      `**Titre** : [AMV] Solo Leveling - "Arise" | EPIC Sung Jinwoo Edit #sololeveling #amv #manhwa\n**Concept** : Solo Leveling est le nouvel animé le plus populaire de l'année. Être l'un des premiers à en faire des edits de haute qualité peut vous apporter une croissance rapide.\n**Tags** : solo leveling, sung jinwoo, amv, anime, arise`,
    ];
  }
}