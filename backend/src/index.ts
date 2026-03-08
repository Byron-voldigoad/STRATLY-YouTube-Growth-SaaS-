console.log('--- SCRIPT STARTING ---');
import 'dotenv/config';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI, gpt4oMini } from 'genkitx-openai';  // Plugin OpenAI
import { expressHandler } from '@genkit-ai/express';
import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

console.log('--- BACKEND STARTING ---');
// Initialiser Genkit avec les plugins
const ai = genkit({
    plugins: [
        googleAI({ apiKey: process.env.GEMINI_API_KEY }),
        openAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1',
            models: [{
                name: 'llama-3.3-70b-versatile',
                info: {
                    label: 'Llama 3.3 70B',
                    supports: {
                        multiturn: true,
                        media: false,
                        tools: false,
                        systemRole: true
                    }
                },
                configSchema: z.any(),
            }]
        })
    ],
    // Modèle par défaut (avec fallback)
    model: 'openai/llama-3.3-70b-versatile',
});

// Schéma pour les données YouTube
const VideoSchema = z.object({
    id: z.string(),
    title: z.string(),
    views: z.number(),
    likes: z.number().optional(),
    comments: z.number().optional(),
    publishedAt: z.string(),
});

const ChannelStatsSchema = z.object({
    subscriberCount: z.number(),
    viewCount: z.number(),
    videoCount: z.number(),
    channelTitle: z.string().optional(),
});

// FLOW 1: Analyse de chaîne
export const analyzeChannelFlow = ai.defineFlow(
    {
        name: 'analyzeChannel',
        inputSchema: z.object({
            userId: z.string(),
            channelId: z.string(),
            videos: z.array(VideoSchema),
            channelStats: ChannelStatsSchema,
        }),
        outputSchema: z.string(),
    },
    async (input) => {
        const prompt = `
      Tu es un expert en croissance YouTube. Analyse ces données de chaîne :
      
      Statistiques de la chaîne :
      - Abonnés : ${input.channelStats.subscriberCount}
      - Vues totales : ${input.channelStats.viewCount}
      - Nombre de vidéos : ${input.channelStats.videoCount}
      
      Dernières vidéos :
      ${input.videos.map(v => `- ${v.title}: ${v.views} vues`).join('\n')}
      
      Fournis une analyse détaillée avec :
      1. Points forts
      2. Points faibles
      3. Recommandations concrètes
      
      Réponds en markdown avec des titres (##).
    `;

        const { text } = await ai.generate({
            prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 1000,
            },
        });

        // PERSISTANCE DANS SUPABASE
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabase.from('ai_analyses').upsert({
            user_id: input.userId,
            channel_id: input.channelId,
            analysis_type: 'channel',
            content: text,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, channel_id, analysis_type' });

        return text;
    }
);

// FLOW 2: Génération d'idées de vidéos
export const generateIdeasFlow = ai.defineFlow(
    {
        name: 'generateIdeas',
        inputSchema: z.object({
            userId: z.string(),
            channelId: z.string(),
            niche: z.string(),
            topVideos: z.array(z.object({ title: z.string(), views: z.number() })),
        }),
        outputSchema: z.array(z.string()),
    },
    async (input) => {
        const prompt = `
      Génère 5 idées de vidéos YouTube pour une chaîne sur "${input.niche}".
      
      Leurs vidéos les plus populaires sont :
      ${input.topVideos.map(v => `- ${v.title} (${v.views} vues)`).join('\n')}
      
      Retourne UNIQUEMENT un tableau JSON de 5 strings.
    `;

        const { output } = await ai.generate({
            prompt,
            output: {
                schema: z.array(z.string()),
                format: 'json',
            },
            config: {
                temperature: 0.9,
            },
        });

        const ideas = output || [];

        // PERSISTANCE DANS SUPABASE
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabase.from('ai_analyses').upsert({
            user_id: input.userId,
            channel_id: input.channelId,
            analysis_type: 'ideas',
            content: JSON.stringify(ideas),
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, channel_id, analysis_type' });

        return ideas;
    }
);

// FLOW 3: Importation des données YouTube
export const importYouTubeFlow = ai.defineFlow(
    {
        name: 'importYouTube',
        inputSchema: z.object({
            userId: z.string(),
        }),
        outputSchema: z.object({
            success: z.boolean(),
            videosImported: z.number(),
            message: z.string(),
            channelTitle: z.string().optional(),
        }),
    },
    async (input) => {
        // Initialiser Supabase Admin
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Récupérer les tokens de l'utilisateur
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', input.userId)
            .single();

        if (profileError || !profile?.youtube_refresh_token) {
            throw new Error('Tokens YouTube non trouvés');
        }

        // 2. Initialiser le client YouTube
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_CALLBACK_URL
        );

        oauth2Client.setCredentials({
            access_token: profile.youtube_access_token,
            refresh_token: profile.youtube_refresh_token,
        });

        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

        try {
            const channelRes = await youtube.channels.list({
                mine: true,
                part: ['snippet', 'statistics'],
            });

            const channel = channelRes.data.items?.[0];
            if (!channel) throw new Error('Chaîne introuvable');

            const videoRes = await youtube.search.list({
                forMine: true,
                type: ['video'],
                part: ['snippet'],
                maxResults: 50,
                order: 'date'
            });

            const videos = videoRes.data.items || [];
            const videoIds = videos.map(v => v.id?.videoId).filter(id => !!id) as string[];
            let videoStats: any[] = [];

            if (videoIds.length > 0) {
                const statsRes = await youtube.videos.list({
                    id: videoIds,
                    part: ['statistics', 'snippet'],
                });
                videoStats = statsRes.data.items || [];
            }

            const today = new Date().toISOString().split('T')[0];
            await supabase.from('channel_analytics').upsert({
                user_id: input.userId,
                channel_id: channel.id,
                date: today,
                subscribers: parseInt(channel.statistics?.subscriberCount || '0'),
                total_views: parseInt(channel.statistics?.viewCount || '0'),
                total_videos: parseInt(channel.statistics?.videoCount || '0'),
            }, { onConflict: 'channel_id, date' });

            const videoAnalyticData = videoStats.map(v => ({
                user_id: input.userId,
                channel_id: channel.id,
                video_id: v.id,
                video_title: v.snippet.title,
                published_at: v.snippet.publishedAt,
                views: parseInt(v.statistics.viewCount || '0'),
                likes: parseInt(v.statistics.likeCount || '0'),
                comments: parseInt(v.statistics.commentCount || '0'),
                thumbnail_url: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url,
            }));

            if (videoAnalyticData.length > 0) {
                await supabase.from('video_analytics').upsert(videoAnalyticData, { onConflict: 'video_id' });
            }

            await supabase.from('profiles').update({
                youtube_channel_title: channel.snippet?.title,
                youtube_channel_thumbnail: channel.snippet?.thumbnails?.default?.url,
                updated_at: new Date().toISOString(),
            }).eq('id', input.userId);

            return {
                success: true,
                videosImported: videoAnalyticData.length,
                message: 'Données YouTube importées avec succès',
                channelTitle: channel.snippet?.title || undefined,
            };

        } catch (error: any) {
            console.error('Import YouTube Flow Error:', error);
            throw new Error(`Erreur d'import : ${error.message}`);
        }
    }
);

// --- Server Configuration ---
const app = express();

app.use(cors({
    origin: ['http://localhost:4200'], // Angular
    credentials: true,
}));
app.use(express.json());

// Genkit Flows as Endpoints
app.post('/analyzeChannel', expressHandler(analyzeChannelFlow));
app.post('/generateIdeas', expressHandler(generateIdeasFlow));
app.post('/importYouTube', expressHandler(importYouTubeFlow));

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- YouTube OAuth Configuration ---
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
);

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Endpoint pour échanger le code OAuth contre des tokens
 */
app.post('/auth/youtube/callback', async (req, res) => {
    const { code, userId } = req.body;

    if (!code || !userId) {
        return res.status(400).json({ message: 'Code ou userId manquant' });
    }

    try {
        // 1. Échanger le code contre les tokens
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // 2. Récupérer les infos de la chaîne YouTube
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelRes = await youtube.channels.list({
            mine: true,
            part: ['snippet', 'statistics'],
        });

        const channel = channelRes.data.items?.[0];
        if (!channel) {
            throw new Error('Aucune chaîne YouTube trouvée pour ce compte');
        }

        // 3. Sauvegarder dans Supabase
        const { error } = await supabase
            .from('profiles')
            .update({
                youtube_access_token: tokens.access_token,
                youtube_refresh_token: tokens.refresh_token,
                youtube_token_expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
                youtube_channel_id: channel.id,
                youtube_channel_title: channel.snippet?.title,
                youtube_channel_thumbnail: channel.snippet?.thumbnails?.default?.url,
                updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

        if (error) throw error;

        res.json({ success: true, channelTitle: channel.snippet?.title || undefined });
    } catch (error: any) {
        console.error('YouTube OAuth Error:', error);
        res.status(500).json({
            message: 'Erreur lors de la connexion YouTube',
            details: error.message
        });
    }
});

app.listen(3400, () => {
    console.log('🚀 Genkit server running on http://localhost:3400');
    console.log('📊 Developer UI: http://localhost:4000');
});
