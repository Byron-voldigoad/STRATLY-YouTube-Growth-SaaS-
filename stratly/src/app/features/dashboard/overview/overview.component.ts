import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideUsers, lucideEye, lucideClock, lucideVideo, lucideTrendingUp, lucideTrendingDown, lucideLoader2, lucideRefreshCw, lucidePlay, lucideMessageSquare, lucideHeart } from '@ng-icons/lucide';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { curveBasis } from 'd3-shape';
import { YouTubeService } from '../../../core/services/youtube.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, HlmCardImports, NgIconComponent, NgxChartsModule],
  providers: [
    provideIcons({
      lucideUsers, lucTrendingUp: lucideTrendingUp, lucideTrendingUp,
      lucideTrendingDown, lucideLoader2, lucideRefreshCw,
      lucidePlay, lucideMessageSquare, lucideHeart, lucideEye, lucideClock, lucideVideo,
      lucUsers: lucideUsers, lucEye: lucideEye, lucClock: lucideClock, lucVideo: lucideVideo,
      lucTrendingDown: lucideTrendingDown, lucLoader2: lucideLoader2, lucRefreshCw: lucideRefreshCw,
      lucPlay: lucidePlay, lucMessageSquare: lucideMessageSquare, lucHeart: lucideHeart
    })
  ],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500 pb-12">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-1">
          <h2 class="text-3xl font-bold tracking-tight text-slate-900 font-heading">Vue d'ensemble</h2>
          <p class="text-sm text-muted-foreground">Analysez la croissance de votre chaîne en temps réel.</p>
        </div>
        <button class="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white border border-border/50 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                [disabled]="isImporting"
                (click)="triggerSync()">
          <ng-icon [name]="isImporting ? 'lucideLoader2' : 'lucideRefreshCw'" 
                   [class]="isImporting ? 'animate-spin' : ''"></ng-icon>
          {{ isImporting ? 'Synchronisation...' : 'Synchroniser' }}
        </button>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        @for (kpi of kpis; track kpi.label) {
          <section hlmCard class="border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
            <div hlmCardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 hlmCardTitle class="text-sm font-medium text-muted-foreground">{{ kpi.label }}</h3>
              <div class="size-8 rounded-lg bg-slate-50 flex items-center justify-center border border-border/5">
                <ng-icon [name]="kpi.icon" class="size-4 text-slate-600"></ng-icon>
              </div>
            </div>
            <div hlmCardContent>
              <div class="text-2xl font-bold text-slate-900">{{ kpi.value }}</div>
              <p class="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                @if (kpi.trend !== 0) {
                  <ng-icon [name]="kpi.trend > 0 ? 'lucideTrendingUp' : 'lucideTrendingDown'" 
                          [class]="kpi.trend > 0 ? 'text-green-500' : 'text-red-500'">
                  </ng-icon>
                  <span [class]="kpi.trend > 0 ? 'text-green-600' : 'text-red-500'" class="font-medium">
                    {{ kpi.trend > 0 ? '+' : '' }}{{ kpi.trend }}%
                  </span>
                  ce mois
                } @else {
                  Stable ce mois
                }
              </p>
            </div>
          </section>
        }
      </div>

      <!-- Charts Section -->
      @if (isLoading) {
        <div class="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-border/50 rounded-3xl bg-slate-50/30">
          <ng-icon name="lucideLoader2" class="size-10 text-slate-300 animate-spin mb-4"></ng-icon>
          <p class="text-slate-400 font-medium italic">Chargement des données réelles...</p>
        </div>
      } @else if (hasData) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section hlmCard class="border-border/50 overflow-hidden flex flex-col shadow-sm">
            <div hlmCardHeader>
              <h3 hlmCardTitle>Évolution des abonnés</h3>
              <p hlmCardDescription>Croissance historique de votre communauté</p>
            </div>
            <div hlmCardContent class="h-[300px] w-full mt-4">
              <ngx-charts-area-chart
                [results]="subscribersSeries"
                [scheme]="'natural'"
                [xAxis]="true"
                [yAxis]="true"
                [legend]="false"
                [curve]="curve"
                [animations]="true">
              </ngx-charts-area-chart>
            </div>
          </section>

          <section hlmCard class="border-border/50 overflow-hidden flex flex-col shadow-sm">
            <div hlmCardHeader>
              <h3 hlmCardTitle>Performance des vues</h3>
              <p hlmCardDescription>Activité quotidienne agrégée</p>
            </div>
            <div hlmCardContent class="h-[300px] w-full mt-4">
              <ngx-charts-bar-vertical
                [results]="viewsData"
                [scheme]="'natural'"
                [xAxis]="true"
                [yAxis]="true"
                [legend]="false"
                [animations]="true">
              </ngx-charts-bar-vertical>
            </div>
          </section>
        </div>

        <!-- Recent Videos Section -->
        <section hlmCard class="border-border/50 shadow-sm">
          <div hlmCardHeader class="flex flex-row items-center justify-between">
            <div>
              <h3 hlmCardTitle>Dernières vidéos</h3>
              <p hlmCardDescription>Performances de vos 5 dernières publications</p>
            </div>
          </div>
          <div hlmCardContent class="pt-6">
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-border/50">
                    <th class="pb-3 text-sm font-semibold text-slate-500 px-4">Vidéo</th>
                    <th class="pb-3 text-sm font-semibold text-slate-500 px-4">Publication</th>
                    <th class="pb-3 text-sm font-semibold text-slate-500 px-4 text-center">Vues</th>
                    <th class="pb-3 text-sm font-semibold text-slate-500 px-4 text-center">Engagement</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/30">
                  @for (video of recentVideos; track video.video_id) {
                    <tr class="hover:bg-slate-50/50 transition-colors group">
                      <td class="py-4 px-4">
                        <div class="flex items-center gap-4">
                          <div class="relative w-20 aspect-video rounded-lg overflow-hidden bg-slate-100 shrink-0 shadow-sm">
                            <img [src]="video.thumbnail_url" class="absolute inset-0 w-full h-full object-cover">
                            <div class="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ng-icon name="lucidePlay" class="size-4 text-white"></ng-icon>
                            </div>
                          </div>
                          <p class="font-bold text-slate-900 text-sm line-clamp-2 max-w-[200px]">{{ video.video_title }}</p>
                        </div>
                      </td>
                      <td class="py-4 px-4 text-sm text-slate-500 italic">
                        {{ video.published_at | date:'dd MMM yyyy' }}
                      </td>
                      <td class="py-4 px-4 text-center">
                        <span class="font-bold text-slate-900">{{ formatNumber(video.views) }}</span>
                      </td>
                      <td class="py-4 px-4">
                        <div class="flex items-center justify-center gap-4 text-xs font-medium text-slate-400">
                          <span class="flex items-center gap-1">
                            <ng-icon name="lucideHeart" class="size-3 text-red-500/50"></ng-icon>
                            {{ video.likes || 0 }}
                          </span>
                          <span class="flex items-center gap-1">
                            <ng-icon name="lucideMessageSquare" class="size-3 text-blue-500/50"></ng-icon>
                            {{ video.comments || 0 }}
                          </span>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </section>
      } @else {
        <div class="flex flex-col items-center justify-center min-h-[400px] border border-dashed border-border/50 rounded-3xl bg-slate-50/30 text-center p-8">
          <div class="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-6 shadow-inner">
            <ng-icon name="lucideEye" class="size-8 text-slate-300"></ng-icon>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2 font-heading">Pas encore de données</h3>
          <p class="text-slate-500 max-w-sm mb-8 leading-relaxed">
            Connectez votre chaîne YouTube et lancez votre première synchronisation pour visualiser vos performances réelles ici.
          </p>
          <button (click)="triggerSync()" 
                  class="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center gap-3 shadow-xl shadow-slate-200 group">
            <ng-icon name="lucideRefreshCw" class="size-4 group-hover:rotate-180 transition-transform duration-500"></ng-icon>
            Initialiser Stratly
          </button>
        </div>
      }
    </div>
  `,
})
export class OverviewComponent implements OnInit {
  isLoading = true;
  isImporting = false;
  hasData = false;

  kpis = [
    { label: 'Abonnés', value: '--', trend: 0, icon: 'lucideUsers' },
    { label: 'Vues totales', value: '--', trend: 0, icon: 'lucideEye' },
    { label: 'Watch Time', value: '--', trend: 0, icon: 'lucideClock' },
    { label: 'Vidéos', value: '--', trend: 0, icon: 'lucideVideo' },
  ];

  chartScheme = 'cool';
  curve: any = curveBasis;

  subscribersSeries: any[] = [];
  viewsData: any[] = [];
  recentVideos: any[] = [];

  constructor(
    private youtubeService: YouTubeService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  async ngOnInit() {
    const success = this.route.snapshot.queryParamMap.get('success');
    if (success === 'youtube_connected') {
      await this.triggerSync();
      this.router.navigate([], { queryParams: { success: null }, queryParamsHandling: 'merge' });
    } else {
      await this.loadData();
    }
  }

  async loadData() {
    this.isLoading = true;
    try {
      const stats = await this.youtubeService.getChannelAnalytics();
      const videos = await this.youtubeService.getVideoAnalytics();

      if (stats && stats.length > 0) {
        this.hasData = true;
        this.formatCharts(stats);
        this.updateKPIs(stats[stats.length - 1]);
        this.recentVideos = videos || [];
      } else {
        this.hasData = false;
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async triggerSync() {
    this.isImporting = true;
    try {
      await this.youtubeService.importData();
      await this.loadData();
    } catch (err) {
      console.error('Import failed:', err);
      alert('Échec de la synchronisation. Vérifiez la console.');
    } finally {
      this.isImporting = false;
    }
  }

  formatCharts(stats: any[]) {
    this.subscribersSeries = [
      {
        name: 'Abonnés',
        series: stats.map(s => ({
          name: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
          value: s.subscribers
        }))
      }
    ];

    this.viewsData = stats.map(s => ({
      name: new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      value: s.views || 0
    })).slice(-7);
  }

  updateKPIs(latest: any) {
    if (!latest) return;
    this.kpis = [
      { label: 'Abonnés', value: this.formatNumber(latest.subscribers), trend: 0, icon: 'lucideUsers' },
      { label: 'Vues totales', value: this.formatNumber(latest.total_views), trend: 0, icon: 'lucideEye' },
      { label: 'Watch Time', value: this.formatNumber(latest.watch_time_minutes || 0), trend: 0, icon: 'lucideClock' },
      { label: 'Vidéos', value: latest.total_videos?.toString() || '--', trend: 0, icon: 'lucideVideo' },
    ];
  }

  formatNumber(num: number): string {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }
}
