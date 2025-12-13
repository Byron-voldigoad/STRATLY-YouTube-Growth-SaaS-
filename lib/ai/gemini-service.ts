// lib/ai/gemini-service.ts - VERSION AMÉLIORÉE
import { GoogleGenerativeAI } from '@google/generative-ai';

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
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;
  
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (apiKey && apiKey.startsWith('AIza')) {
      console.log('🔑 Gemini API configurée - Mode IA réel activé');
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    } else {
      console.log('🤖 Mode démo activé - Configure GEMINI_API_KEY pour l\'IA réelle');
    }
  }
  
  async analyzeChannelPerformance(videos: VideoData[], channelStats: ChannelStats): Promise<string> {
    // Si l'IA est configurée, utilise la vraie IA
    if (this.model) {
      return this.generateRealAIAnalysis(videos, channelStats);
    }
    
    // Sinon, retourne l'analyse mockée
    return this.getMockAnalysis(videos, channelStats);
  }
  
  private async generateRealAIAnalysis(videos: VideoData[], channelStats: ChannelStats): Promise<string> {
    try {
      console.log('🧠 Génération d\'analyse IA réelle...');
      
      // Trie les vidéos par performance
      const sortedVideos = [...videos].sort((a, b) => b.views - a.views);
      const topVideos = sortedVideos.slice(0, 3);
      
      // Calcule des métriques
      const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
      const avgViews = Math.round(totalViews / videos.length);
      const totalEngagement = videos.reduce((sum, v) => sum + v.likes + v.comments, 0);
      const engagementRate = ((totalEngagement / totalViews) * 100).toFixed(1);
      
      // Détecte le type de contenu
      const isAMV = videos.some(v => 
        v.video_title.toLowerCase().includes('amv') || 
        v.video_title.toLowerCase().includes('anime') ||
        v.video_title.toLowerCase().includes('edit')
      );
      
      const channelType = isAMV ? 'AMV (Anime Music Video)' : 'Contenu varié';
      
      // Prompt optimisé pour l'analyse YouTube
      const prompt = `
        Tu es un expert en croissance YouTube avec 10 ans d'expérience.
        
        ANALYSE CETTE CHAÎNE YOUTUBE :
        
        📊 STATISTIQUES :
        - Nom : ${channelStats.title}
        - Type : ${channelType}
        - Abonnés : ${channelStats.subscribers.toLocaleString()}
        - Vues totales : ${totalViews.toLocaleString()}
        - Nombre de vidéos : ${videos.length}
        - Vues moyenne : ${avgViews}
        - Taux d'engagement : ${engagementRate}%
        
        🎬 TOP 3 VIDÉOS :
        ${topVideos.map((v, i) => `
        ${i+1}. "${v.video_title}"
            👁️ ${v.views.toLocaleString()} vues
            👍 ${v.likes} likes | 💬 ${v.comments} commentaires
            📅 ${new Date(v.published_at).toLocaleDateString('fr-FR')}
        `).join('\n')}
        
        📈 TENDANCES DÉTECTÉES :
        - Meilleure performance : "${topVideos[0]?.video_title}"
        - Vidéos avec interactions : ${videos.filter(v => v.likes > 0 || v.comments > 0).length}/${videos.length}
        - Fréquence : ${videos.length} vidéos sur ${this.calculateTimeSpan(videos)} mois
        
        🎯 TÂCHE :
        Donne une analyse PROFESSIONNELLE en français avec :
        
        1. **DIAGNOSTIC PRÉCIS** (2-3 lignes max)
        2. **3 POINTS FORTS** spécifiques à cette chaîne
        3. **3 AXES D'AMÉLIORATION** avec exemples concrets
        4. **STRATÉGIE DE CROISSANCE** personnalisée
        5. **5 ACTIONS IMMÉDIATES** à mettre en place
        
        Sois direct, concret et utilise des données spécifiques.
        Format : Markdown avec emojis pertinents.
        
        NE DIS PAS "bonjour" ou "voici mon analyse". Commence directement.
      `;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return response.text();
      
    } catch (error) {
      console.error('❌ Erreur Gemini:', error);
      return this.getMockAnalysis(videos, channelStats) + 
        '\n\n⚠️ *Erreur de l\'IA, analyse de secours affichée*';
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
    const avgViews = Math.round(totalViews / videos.length);
    const videosWithEngagement = videos.filter(v => v.likes > 0 || v.comments > 0).length;
    const bestVideo = videos.reduce((a, b) => a.views > b.views ? a : b, videos[0]);
    
    return `
## 🤖 *Mode Démo - Configure Gemini API pour l'IA réelle*

### 📊 Aperçu des performances
- **Vues totales** : ${totalViews.toLocaleString()}
- **Vues moyenne/vidéo** : ${avgViews}
- **Engagement** : ${videosWithEngagement}/${videos.length} vidéos avec interactions
- **Meilleure vidéo** : "${bestVideo.video_title.substring(0, 40)}..." (${bestVideo.views} vues)

### 🎯 Ce que l'IA réelle analyserait :
1. **Analyse sémantique** de tes titres et descriptions
2. **Recommandations personnalisées** basées sur ta niche exacte
3. **Comparaison** avec des chaînes similaires
4. **Prédictions** de croissance avec différentes stratégies
5. **Suggestions concrètes** pour chaque vidéo individuelle

### 🚀 Pour activer l'IA réelle :
1. Va sur [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crée une clé API gratuite
3. Ajoute \`GEMINI_API_KEY=ta_cle\` dans \`.env.local\`
4. Redémarre l'application

*L'IA réelle transformerait ces données brutes en insights actionnables !*
    `;
  }
  
  async generateVideoIdeas(videos: VideoData[]): Promise<string[]> {
    if (this.model) {
      return this.generateRealVideoIdeas(videos);
    }
    
    return this.getMockVideoIdeas(videos);
  }
  
  private async generateRealVideoIdeas(videos: VideoData[]): Promise<string[]> {
    try {
      const bestVideo = videos.reduce((a, b) => a.views > b.views ? a : b, videos[0]);
      const isTechChannel = bestVideo.video_title.toLowerCase().includes('iphone') || 
                           bestVideo.video_title.toLowerCase().includes('samsung');
      
      const prompt = `
        Génère 5 idées de vidéos YouTube BASÉES SUR CETTE VIDÉO PERFORMANTE :
        
        🎬 VIDÉO RÉFÉRENCE : "${bestVideo.video_title}"
        📊 STATS : ${bestVideo.views} vues, ${bestVideo.likes} likes, ${bestVideo.comments} commentaires
        
        CONTEXTE : ${isTechChannel ? 'Chaîne tech/comparaisons' : 'Chaîne AMV/animé'}
        
        CRITÈRES :
        1. Chaque idée DOIT être unique et spécifique
        2. Inclure un titre accrocheur (avec 2-3 hashtags pertinents)
        3. Description du concept (pourquoi ça pourrait marcher)
        4. 3-5 tags optimisés pour le SEO YouTube
        5. Adapté au public de cette chaîne
        
        FORMAT POUR CHAQUE IDÉE :
        - **Titre** : [Titre accrocheur] #hashtag1 #hashtag2
        - **Concept** : [2-3 lignes expliquant le concept]
        - **Tags** : tag1, tag2, tag3, tag4, tag5
        
        Génère 5 idées en français, numérotées de 1 à 5.
      `;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      // Parse la réponse
      const text = response.text();
      const ideas = text.split(/\d+\.\s+/).filter((idea: { trim: () => { (): any; new(): any; length: number; }; }) => idea.trim().length > 50);
      return ideas.slice(0, 5).map((idea: string) => idea.trim());
      
    } catch (error) {
      console.error('Erreur génération idées:', error);
      return this.getMockVideoIdeas(videos);
    }
  }
  
  private getMockVideoIdeas(videos: VideoData[]): string[] {
    const bestVideo = videos.reduce((a, b) => a.views > b.views ? a : b, videos[0]);
    const isTech = bestVideo.video_title.toLowerCase().includes('iphone');
    
    if (isTech) {
      return [
        `**Titre** : iPhone 16 vs Samsung S24 - Le Choc Ultime 2024 #tech #comparaison #iphone\n**Concept** : Comparaison détaillée des derniers flagships avec tests réels et avis honnête\n**Tags** : iphone, samsung, comparison, tech, smartphone`,
        
        `**Titre** : Les 5 ERREURS à éviter avec ton iPhone #iphone #astuces #tutorial\n**Concept** : Tutoriel sur les fonctionnalités cachées et optimisations pour iPhone\n**Tags** : iphone, tips, tutorial, ios, optimization`,
        
        `**Titre** : Samsung vs iPhone : LE DÉBAT FINAL #debate #tech #smartphone\n**Concept** : Débat structuré avec avis d'experts et votes de la communauté\n**Tags** : debate, iphone, samsung, tech, community`,
        
        `**Titre** : Test DURABILITÉ : iPhone tombe de 2m #durability #test #iphone\n**Concept** : Test de résistance réel avec slow motion et analyse des dégâts\n**Tags** : durability, test, iphone, samsung, drop test`,
        
        `**Titre** : ÉCOSYSTÈME Apple vs Samsung : lequel choisir? #ecosystem #tech #comparaison\n**Concept** : Comparaison complète des écosystèmes (montre, tablette, PC, etc.)\n**Tags** : ecosystem, apple, samsung, comparison, tech`
      ];
    }
    
    return [
      `**Titre** : [AMV] Attack on Titan x Epic Orchestra - Ultimate Battle Edit #amv #attackontitan\n**Concept** : Scènes de combat épiques synchronisées avec musique orchestrale\n**Tags** : amv, anime, edit, epic, battle`,
      
      `**Titre** : [AMV] Sad Anime Moments x Emotional Piano Mix #amv #emotional #edit\n**Concept** : Moments émotionnels d'animés avec piano mélancolique\n**Tags** : amv, emotional, sad, piano, edit`,
      
      `**Titre** : [AMV] Demon Slayer x Rock Music - Fast Paced Edit #amv #demonslayer\n**Concept** : Scènes dynamiques avec musique rock énergique\n**Tags** : amv, rock, fast, edit, action`,
      
      `**Titre** : [AMV] Best Anime Openings Remix 2024 #amv #openings #mix\n**Concept** : Compilation des meilleurs openings avec transition fluide\n**Tags** : amv, openings, mix, compilation, 2024`,
      
      `**Titre** : [AMV] Jujutsu Kaisen x LoFi Beats - Chill Study Edit #amv #lofi #chill\n**Concept** : Scènes calmes avec musique LoFi pour étudier/détente\n**Tags** : amv, lofi, chill, study, relax`
    ];
  }
}

export const youtubeAIAnalyzer = new YouTubeAIAnalyzer();