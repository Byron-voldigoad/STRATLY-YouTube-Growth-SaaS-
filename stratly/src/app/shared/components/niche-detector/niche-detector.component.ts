import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenkitService, DetectedNiche, NicheOutlier, VideoData } from '../../../core/services/genkit.service';
import { YouTubeService } from '../../../core/services/youtube.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideTarget, lucideX, lucideLoader2, lucideCheck, lucideAlertCircle, lucideChevronLeft, lucideChevronRight, lucideMaximize2 } from '@ng-icons/lucide';

type PanelPosition = 'left' | 'center' | 'right';
type PanelState = 'idle' | 'loading' | 'results' | 'error';

@Component({
    selector: 'app-niche-detector',
    standalone: true,
    imports: [CommonModule, NgIconComponent],
    providers: [
        provideIcons({ lucideTarget, lucideX, lucideLoader2, lucideCheck, lucideAlertCircle, lucideChevronLeft, lucideChevronRight, lucideMaximize2 })
    ],
    template: `
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" (click)="close.emit()"></div>

    <!-- Panel -->
    <div class="fixed z-50 transition-all duration-300 ease-out"
         [class]="getPanelPositionClasses()">
        <div class="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[420px] max-h-[80vh] flex flex-col overflow-hidden">
            
            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div class="flex items-center gap-3">
                    <div class="size-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <ng-icon name="lucideTarget" class="size-5 text-indigo-600"></ng-icon>
                    </div>
                    <div>
                        <h3 class="font-bold text-slate-900 text-sm">Niche Detector</h3>
                        <p class="text-xs text-slate-500">Identifie tes thématiques</p>
                    </div>
                </div>
                <div class="flex items-center gap-1">
                    <!-- Position buttons -->
                    <button (click)="panelPosition = 'left'" 
                            class="p-1.5 rounded-lg transition-colors"
                            [class.bg-indigo-100]="panelPosition === 'left'"
                            [class.text-indigo-600]="panelPosition === 'left'"
                            [class.text-gray-400]="panelPosition !== 'left'"
                            [class.hover:bg-gray-100]="panelPosition !== 'left'"
                            title="Gauche">
                        <ng-icon name="lucideChevronLeft" class="size-4"></ng-icon>
                    </button>
                    <button (click)="panelPosition = 'center'"
                            class="p-1.5 rounded-lg transition-colors"
                            [class.bg-indigo-100]="panelPosition === 'center'"
                            [class.text-indigo-600]="panelPosition === 'center'"
                            [class.text-gray-400]="panelPosition !== 'center'"
                            [class.hover:bg-gray-100]="panelPosition !== 'center'"
                            title="Centre">
                        <ng-icon name="lucideMaximize2" class="size-4"></ng-icon>
                    </button>
                    <button (click)="panelPosition = 'right'"
                            class="p-1.5 rounded-lg transition-colors"
                            [class.bg-indigo-100]="panelPosition === 'right'"
                            [class.text-indigo-600]="panelPosition === 'right'"
                            [class.text-gray-400]="panelPosition !== 'right'"
                            [class.hover:bg-gray-100]="panelPosition !== 'right'"
                            title="Droite">
                        <ng-icon name="lucideChevronRight" class="size-4"></ng-icon>
                    </button>
                    <div class="w-px h-5 bg-gray-200 mx-1"></div>
                    <button (click)="close.emit()" class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        <ng-icon name="lucideX" class="size-4"></ng-icon>
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-5">

                <!-- État: Idle -->
                @if (state === 'idle') {
                <div class="text-center py-8 space-y-4">
                    <div class="size-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto">
                        <ng-icon name="lucideTarget" class="size-8 text-indigo-500"></ng-icon>
                    </div>
                    <div>
                        <p class="font-semibold text-slate-800">Détecte tes niches</p>
                        <p class="text-sm text-slate-500 mt-1">L'IA va analyser tes vidéos et identifier les thématiques récurrentes de ta chaîne.</p>
                    </div>
                    <button (click)="runDetection()" 
                            [disabled]="!canRunDetection"
                            class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                            [class.bg-indigo-600]="canRunDetection"
                            [class.text-white]="canRunDetection"
                            [class.hover:bg-indigo-700]="canRunDetection"
                            [class.shadow-lg]="canRunDetection"
                            [class.shadow-indigo-200]="canRunDetection"
                            [class.bg-gray-100]="!canRunDetection"
                            [class.text-gray-400]="!canRunDetection"
                            [class.cursor-not-allowed]="!canRunDetection">
                        <ng-icon name="lucideTarget" class="size-4"></ng-icon>
                        Lancer la détection
                    </button>
                    @if (!canRunDetection && lastDetectionVideoCount > 0) {
                    <p class="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                        ⚠️ Tu dois avoir publié au moins 3 nouvelles vidéos depuis la dernière détection ({{ currentVideoCount - lastDetectionVideoCount }} nouvelle(s) actuellement).
                    </p>
                    }
                </div>
                }

                <!-- État: Loading -->
                @if (state === 'loading') {
                <div class="text-center py-12 space-y-4">
                    <div class="size-12 rounded-full border-3 border-indigo-200 border-t-indigo-600 animate-spin mx-auto"></div>
                    <div>
                        <p class="font-semibold text-slate-800">Analyse en cours...</p>
                        <p class="text-sm text-slate-500">L'IA classifie tes {{ currentVideoCount }} vidéos par thème</p>
                    </div>
                </div>
                }

                <!-- État: Error -->
                @if (state === 'error') {
                <div class="text-center py-8 space-y-4">
                    <div class="size-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                        <ng-icon name="lucideAlertCircle" class="size-6 text-red-500"></ng-icon>
                    </div>
                    <div>
                        <p class="font-semibold text-red-700">Erreur de détection</p>
                        <p class="text-sm text-slate-500 mt-1">{{ errorMessage }}</p>
                    </div>
                    <button (click)="runDetection()" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">
                        Réessayer
                    </button>
                </div>
                }

                <!-- État: Résultats -->
                @if (state === 'results' && detectedNiches.length > 0) {
                <div class="space-y-4">
                    <!-- Niches détectées -->
                    <div>
                        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Niches détectées ({{ detectedNiches.length }})</p>
                        <div class="space-y-2">
                            @for (niche of detectedNiches; track niche.name) {
                            <label class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm"
                                   [class.border-indigo-300]="isNicheSelected(niche.name)"
                                   [class.bg-indigo-50]="isNicheSelected(niche.name)"
                                   [class.border-gray-200]="!isNicheSelected(niche.name)"
                                   [class.bg-white]="!isNicheSelected(niche.name)">
                                <input type="checkbox" 
                                       [checked]="isNicheSelected(niche.name)"
                                       (change)="toggleNiche(niche.name)"
                                       class="mt-0.5 size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600">
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between">
                                        <span class="font-semibold text-sm text-slate-800">{{ niche.name }}</span>
                                        <span class="text-xs font-medium px-2 py-0.5 rounded-full"
                                              [class.bg-indigo-100]="isNicheSelected(niche.name)"
                                              [class.text-indigo-700]="isNicheSelected(niche.name)"
                                              [class.bg-gray-100]="!isNicheSelected(niche.name)"
                                              [class.text-gray-600]="!isNicheSelected(niche.name)">
                                            {{ niche.videoCount }} vidéos
                                        </span>
                                    </div>
                                    <div class="flex items-center gap-2 mt-1">
                                        <span class="text-xs text-slate-500">Moy. {{ niche.avgViews | number:'1.0-0' }} vues</span>
                                        <span class="text-xs text-slate-400">·</span>
                                        <span class="text-xs text-slate-400 truncate">{{ niche.keywords.slice(0, 3).join(', ') }}</span>
                                    </div>
                                </div>
                            </label>
                            }
                        </div>
                    </div>

                    <!-- Outliers -->
                    @if (outliers.length > 0) {
                    <div>
                        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Autres ({{ outliers.length }})</p>
                        <div class="space-y-1.5">
                            @for (outlier of outliers; track outlier.id) {
                            <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm text-slate-700 truncate">{{ outlier.title }}</p>
                                    <p class="text-xs text-slate-400">{{ outlier.reason }}</p>
                                </div>
                                <span class="text-xs text-slate-500 ml-2 shrink-0">{{ outlier.views }} vues</span>
                            </div>
                            }
                        </div>
                    </div>
                    }
                </div>
                }
            </div>

            <!-- Footer (visible seulement en mode résultats) -->
            @if (state === 'results') {
            <div class="px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                <div class="flex items-center justify-between">
                    <span class="text-xs text-slate-500">{{ selectedNiches.length }} niche(s) sélectionnée(s)</span>
                    <button (click)="saveSelection()"
                            [disabled]="selectedNiches.length === 0"  
                            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                            [class.bg-indigo-600]="selectedNiches.length > 0"
                            [class.text-white]="selectedNiches.length > 0"
                            [class.hover:bg-indigo-700]="selectedNiches.length > 0"
                            [class.bg-gray-100]="selectedNiches.length === 0"
                            [class.text-gray-400]="selectedNiches.length === 0">
                        <ng-icon name="lucideCheck" class="size-4"></ng-icon>
                        Sauvegarder
                    </button>
                </div>
            </div>
            }
        </div>
    </div>
    `,
    styles: [`
        :host { display: contents; }
        .border-3 { border-width: 3px; }
    `]
})
export class NicheDetectorComponent implements OnInit {
    @Output() close = new EventEmitter<void>();

    panelPosition: PanelPosition = 'right';
    state: PanelState = 'idle';
    errorMessage = '';

    detectedNiches: DetectedNiche[] = [];
    outliers: NicheOutlier[] = [];
    selectedNiches: string[] = [];

    currentVideoCount = 0;
    lastDetectionVideoCount = 0;
    canRunDetection = true;

    private userId = '';
    private channelId = '';
    private videos: VideoData[] = [];

    constructor(
        private genkitService: GenkitService,
        private youtubeService: YouTubeService,
        private supabaseService: SupabaseService
    ) { }

    async ngOnInit() {
        await this.loadData();
        await this.loadStoredNiches();
    }

    private async loadData() {
        try {
            const user = await this.supabaseService.getUser();
            if (!user) return;
            this.userId = user.id;

            const { data: profile } = await this.supabaseService.client
                .from('profiles')
                .select('youtube_channel_id')
                .eq('id', user.id)
                .single();

            if (profile?.youtube_channel_id) {
                this.channelId = profile.youtube_channel_id;
            }

            const videoData = await this.youtubeService.getVideoAnalytics();
            if (videoData) {
                this.videos = videoData.map((v: any) => ({
                    id: v.video_id,
                    title: v.video_title,
                    views: v.views || 0,
                    likes: v.likes || 0,
                    comments: v.comments || 0,
                    publishedAt: v.published_at || new Date().toISOString()
                }));
                this.currentVideoCount = this.videos.length;
            }
        } catch (err) {
            console.error('Erreur chargement données niche detector:', err);
        }
    }

    private async loadStoredNiches() {
        if (!this.userId || !this.channelId) {
            console.warn('NicheDetector: userId ou channelId manquant, skip loadStoredNiches');
            return;
        }

        try {
            console.log('NicheDetector: Loading stored niches for', this.userId, this.channelId);
            const { data, error } = await this.supabaseService.client
                .from('user_niches')
                .select('*')
                .eq('user_id', this.userId)
                .eq('channel_id', this.channelId)
                .maybeSingle();

            if (error) {
                console.error('NicheDetector: Supabase error:', error);
                return;
            }

            console.log('NicheDetector: Stored data found:', data);

            if (data) {
                this.detectedNiches = typeof data.detected_niches === 'string'
                    ? JSON.parse(data.detected_niches)
                    : (data.detected_niches || []);
                this.selectedNiches = typeof data.selected_niches === 'string'
                    ? JSON.parse(data.selected_niches)
                    : (data.selected_niches || []);
                this.lastDetectionVideoCount = data.video_count_at_detection || 0;
                this.state = this.detectedNiches.length > 0 ? 'results' : 'idle';

                // Vérifier la condition de relance
                const newVideos = this.currentVideoCount - this.lastDetectionVideoCount;
                this.canRunDetection = newVideos >= 3 || this.lastDetectionVideoCount === 0;
                console.log('NicheDetector: Loaded', this.detectedNiches.length, 'niches,', this.selectedNiches.length, 'selected');
            } else {
                console.log('NicheDetector: Aucune donnée stockée, premier usage');
            }
        } catch (err) {
            console.error('NicheDetector: Erreur loadStoredNiches:', err);
            this.canRunDetection = true;
        }
    }

    getPanelPositionClasses(): string {
        const base = 'top-1/2 -translate-y-1/2';
        switch (this.panelPosition) {
            case 'left': return `${base} left-20`;
            case 'center': return `${base} left-1/2 -translate-x-1/2`;
            case 'right': return `${base} right-6`;
        }
    }

    isNicheSelected(name: string): boolean {
        return this.selectedNiches.includes(name);
    }

    toggleNiche(name: string) {
        if (this.isNicheSelected(name)) {
            this.selectedNiches = this.selectedNiches.filter(n => n !== name);
        } else {
            this.selectedNiches = [...this.selectedNiches, name];
        }
    }

    async runDetection() {
        if (this.videos.length === 0) {
            this.errorMessage = 'Aucune vidéo trouvée. Connecte d\'abord ta chaîne YouTube.';
            this.state = 'error';
            return;
        }

        this.state = 'loading';
        try {
            const response = await this.genkitService.detectNiches(
                this.userId,
                this.channelId,
                this.videos
            );

            this.detectedNiches = response.result.niches;
            this.outliers = response.result.outliers;
            this.selectedNiches = this.detectedNiches.map(n => n.name);
            this.lastDetectionVideoCount = this.currentVideoCount;
            this.canRunDetection = false;
            this.state = 'results';
        } catch (err: any) {
            this.errorMessage = err?.message || 'Erreur lors de la détection de niches.';
            this.state = 'error';
        }
    }

    async saveSelection() {
        try {
            await this.supabaseService.client
                .from('user_niches')
                .upsert({
                    user_id: this.userId,
                    channel_id: this.channelId,
                    detected_niches: JSON.stringify(this.detectedNiches),
                    selected_niches: JSON.stringify(this.selectedNiches),
                    video_count_at_detection: this.lastDetectionVideoCount,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id, channel_id' });

            this.close.emit();
        } catch (err) {
            console.error('Erreur sauvegarde niches:', err);
        }
    }
}
