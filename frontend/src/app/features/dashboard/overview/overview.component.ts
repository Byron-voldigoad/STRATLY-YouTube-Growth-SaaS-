import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideUsers,
  lucideEye,
  lucideClock,
  lucideVideo,
  lucideTrendingUp,
  lucideTrendingDown,
  lucideLoader2,
  lucideRefreshCw,
  lucidePlay,
  lucideMessageSquare,
  lucideHeart,
} from '@ng-icons/lucide';
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
      lucideUsers,
      lucTrendingUp: lucideTrendingUp,
      lucideTrendingUp,
      lucideTrendingDown,
      lucideLoader2,
      lucideRefreshCw,
      lucidePlay,
      lucideMessageSquare,
      lucideHeart,
      lucideEye,
      lucideClock,
      lucideVideo,
      lucUsers: lucideUsers,
      lucEye: lucideEye,
      lucClock: lucideClock,
      lucVideo: lucideVideo,
      lucTrendingDown: lucideTrendingDown,
      lucLoader2: lucideLoader2,
      lucRefreshCw: lucideRefreshCw,
      lucPlay: lucidePlay,
      lucMessageSquare: lucideMessageSquare,
      lucHeart: lucideHeart,
    }),
  ],
  template: `
    <div class="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-12">
      <!-- Top Header Area -->
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden"
      >
        <div
          class="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none"
        ></div>
        <div class="flex flex-col gap-1 relative z-10">
          <h2 class="text-3xl font-black tracking-tight text-slate-900">
            Vue d'ensemble
          </h2>
          <p class="text-slate-500 font-medium text-sm">
            Analysez la croissance de votre chaîne avec des données en temps
            réel.
          </p>
        </div>
        <button
          class="relative z-10 flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/20 hover:shadow-indigo-500/25 transform hover:-translate-y-0.5 group disabled:opacity-70 disabled:hover:transform-none disabled:hover:bg-slate-900"
          [disabled]="isImporting"
          (click)="triggerSync()"
        >
          <ng-icon
            [name]="isImporting ? 'lucideLoader2' : 'lucideRefreshCw'"
            [class]="
              isImporting
                ? 'animate-spin'
                : 'group-hover:rotate-180 transition-transform duration-500'
            "
          ></ng-icon>
          {{
            isImporting
              ? 'Synchronisation en cours...'
              : 'Synchroniser les données'
          }}
        </button>
      </div>

      <!-- KPI Bento Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (kpi of kpis; track kpi.label) {
          <div
            class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between h-[160px]"
          >
            <!-- Decorative blur -->
            <div
              class="absolute -right-6 -top-6 w-24 h-24 bg-slate-100 rounded-full blur-2xl group-hover:bg-indigo-100 transition-colors duration-500"
            ></div>

            <div
              class="flex flex-row items-center justify-between relative z-10"
            >
              <h3
                class="text-sm font-bold text-slate-500 tracking-wide uppercase"
              >
                {{ kpi.label }}
              </h3>
              <div
                class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors"
              >
                <ng-icon
                  [name]="kpi.icon"
                  class="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors"
                ></ng-icon>
              </div>
            </div>

            <div class="relative z-10 mt-auto">
              <div class="text-4xl font-black text-slate-900 tracking-tight">
                {{ kpi.value }}
              </div>
              <div class="mt-2 flex items-center gap-1.5 text-xs font-bold">
                @if (kpi.trend !== 0) {
                  <span
                    class="flex items-center gap-1 px-2 py-0.5 rounded-md"
                    [class]="
                      kpi.trend > 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    "
                  >
                    <ng-icon
                      [name]="
                        kpi.trend > 0
                          ? 'lucideTrendingUp'
                          : 'lucideTrendingDown'
                      "
                      class="w-3 h-3"
                    ></ng-icon>
                    {{ kpi.trend > 0 ? '+' : '' }}{{ kpi.trend }}%
                  </span>
                  <span class="text-slate-400 font-medium">ce mois</span>
                } @else {
                  <span
                    class="text-slate-400 font-medium px-1 bg-slate-50 rounded-md"
                    >Stable ce mois</span
                  >
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Charts Section -->
      @if (isLoading) {
        <div
          class="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50"
        >
          <div
            class="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm mb-4"
          >
            <ng-icon
              name="lucideLoader2"
              class="w-8 h-8 text-indigo-500 animate-spin"
            ></ng-icon>
          </div>
          <p class="text-slate-500 font-bold tracking-tight">
            Analyse des données en cours...
          </p>
        </div>
      } @else if (hasData) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-[400px]"
          >
            <div class="mb-6">
              <h3 class="text-lg font-bold text-slate-900 tracking-tight">
                Évolution des abonnés
              </h3>
              <p class="text-sm font-medium text-slate-500">
                Croissance historique de votre communauté
              </p>
            </div>
            <div class="flex-1 w-full -ml-2 -mb-2">
              <ngx-charts-area-chart
                [results]="subscribersSeries"
                [scheme]="'cool'"
                [xAxis]="true"
                [yAxis]="true"
                [legend]="false"
                [curve]="curve"
                [animations]="true"
              >
              </ngx-charts-area-chart>
            </div>
          </div>

          <div
            class="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-[400px]"
          >
            <div class="mb-6">
              <h3 class="text-lg font-bold text-slate-900 tracking-tight">
                Performance des vues
              </h3>
              <p class="text-sm font-medium text-slate-500">
                Activité quotidienne agrégée
              </p>
            </div>
            <div class="flex-1 w-full -ml-2 -mb-2">
              <ngx-charts-bar-vertical
                [results]="viewsData"
                [scheme]="'cool'"
                [xAxis]="true"
                [yAxis]="true"
                [legend]="false"
                [animations]="true"
                [barPadding]="8"
                [roundEdges]="true"
              >
              </ngx-charts-bar-vertical>
            </div>
          </div>
        </div>

        <!-- Recent Videos Section -->
        <div
          class="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden"
        >
          <div
            class="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h3 class="text-xl font-bold text-slate-900 tracking-tight">
                Dernières vidéos
              </h3>
              <p class="text-sm font-medium text-slate-500">
                Performances de vos 5 dernières publications
              </p>
            </div>
            <button
              class="text-sm font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors"
            >
              Voir tout l'historique →
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-slate-50/50">
                  <th
                    class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >
                    Vidéo
                  </th>
                  <th
                    class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider"
                  >
                    Publication
                  </th>
                  <th
                    class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center"
                  >
                    Vues
                  </th>
                  <th
                    class="py-4 px-6 text-xs font-bold text-slate-400 uppercase tracking-wider text-center"
                  >
                    Engagement
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (video of recentVideos; track video.video_id) {
                  <tr class="hover:bg-slate-50 transition-colors group">
                    <td class="py-4 px-6">
                      <div class="flex items-center gap-4">
                        <div
                          class="relative w-28 aspect-video rounded-xl overflow-hidden bg-slate-100 shrink-0 shadow-sm border border-slate-200/50 group-hover:shadow-md transition-all"
                        >
                          <img
                            [src]="video.thumbnail_url"
                            class="absolute inset-0 w-full h-full object-cover"
                          />
                          <div
                            class="absolute inset-0 bg-slate-900/20 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                          >
                            <div
                              class="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform"
                            >
                              <ng-icon
                                name="lucidePlay"
                                class="w-4 h-4 text-slate-900 ml-0.5"
                              ></ng-icon>
                            </div>
                          </div>
                        </div>
                        <p
                          class="font-bold text-slate-900 text-sm line-clamp-2 max-w-[250px] group-hover:text-indigo-600 transition-colors"
                        >
                          {{ video.video_title }}
                        </p>
                      </div>
                    </td>
                    <td class="py-4 px-6">
                      <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-slate-200"></div>
                        <span class="text-sm font-medium text-slate-500">{{
                          video.published_at | date: 'dd MMM yyyy'
                        }}</span>
                      </div>
                    </td>
                    <td class="py-4 px-6 text-center">
                      <span
                        class="inline-flex items-center justify-center px-3 py-1 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm"
                      >
                        {{ formatNumber(video.views) }}
                      </span>
                    </td>
                    <td class="py-4 px-6">
                      <div class="flex items-center justify-center gap-4">
                        <div
                          class="flex items-center gap-1.5 tooltip"
                          [title]="video.likes + ' likes'"
                        >
                          <div
                            class="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500"
                          >
                            <ng-icon
                              name="lucideHeart"
                              class="w-4 h-4"
                            ></ng-icon>
                          </div>
                          <span class="text-xs font-bold text-slate-600">{{
                            formatNumber(video.likes || 0)
                          }}</span>
                        </div>
                        <div
                          class="flex items-center gap-1.5 tooltip"
                          [title]="video.comments + ' commentaires'"
                        >
                          <div
                            class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"
                          >
                            <ng-icon
                              name="lucideMessageSquare"
                              class="w-4 h-4"
                            ></ng-icon>
                          </div>
                          <span class="text-xs font-bold text-slate-600">{{
                            formatNumber(video.comments || 0)
                          }}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      } @else {
        <!-- Empty State -->
        <div
          class="flex flex-col items-center justify-center min-h-[500px] border border-slate-200 rounded-3xl bg-white text-center p-8 shadow-sm relative overflow-hidden"
        >
          <div
            class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=')] opacity-50"
          ></div>

          <div
            class="relative z-10 w-24 h-24 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-8 shadow-inner transform -rotate-6 hover:rotate-0 transition-transform duration-500"
          >
            <ng-icon
              name="lucideYoutube"
              class="w-12 h-12 text-indigo-500"
            ></ng-icon>
          </div>

          <h3
            class="relative z-10 text-3xl font-black text-slate-900 mb-3 tracking-tight"
          >
            Dashboard en attente
          </h3>
          <p
            class="relative z-10 text-slate-500 max-w-md mb-10 font-medium leading-relaxed"
          >
            Connectez votre chaîne YouTube et lancez votre première
            synchronisation pour débloquer toute la puissance de l'analyse IA
            Nerra.
          </p>

          <button
            (click)="triggerSync()"
            class="relative z-10 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/10 group"
          >
            <ng-icon
              name="lucideRefreshCw"
              class="w-5 h-5 group-hover:rotate-180 transition-transform duration-700"
            ></ng-icon>
            Initialiser la synchronisation
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
    private router: Router,
  ) {}

  async ngOnInit() {
    const success = this.route.snapshot.queryParamMap.get('success');
    if (success === 'youtube_connected') {
      await this.triggerSync();
      this.router.navigate([], {
        queryParams: { success: null },
        queryParamsHandling: 'merge',
      });
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
        this.updateKPIs(stats, videos || []);
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
        series: stats.map((s) => ({
          name: new Date(s.date).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
          }),
          value: s.subscribers,
        })),
      },
    ];

    this.viewsData = stats
      .map((s) => ({
        name: new Date(s.date).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
        value: Math.round(s.views || 0),
      }))
      .slice(-7);
  }

  updateKPIs(stats: any[], videos: any[]) {
    if (!stats || stats.length === 0) return;

    const latest = stats[stats.length - 1];
    if (!latest) return;

    let viewsTrend = 0;
    let subsTrend = 0;
    if (stats.length >= 2) {
      const previous = stats[stats.length - 2];
      viewsTrend = previous?.views
        ? Math.round(((latest.views - previous.views) / previous.views) * 100)
        : 0;
      subsTrend = previous?.subscribers
        ? Math.round(
            ((latest.subscribers - previous.subscribers) /
              previous.subscribers) *
              100,
          )
        : 0;
    }

    this.kpis = [
      {
        label: 'Abonnés',
        value: this.formatNumber(latest.subscribers),
        trend: subsTrend,
        icon: 'lucideUsers',
      },
      {
        label: 'Vues totales',
        value: this.formatNumber(latest.total_views),
        trend: viewsTrend,
        icon: 'lucideEye',
      },
      {
        label: 'DERNIÈRE VIDÉO',
        value: this.daysSinceLastVideo(videos) + ' jours',
        trend: 0,
        icon: 'calendar',
      },
      {
        label: 'Vidéos',
        value: latest.total_videos?.toString() || '--',
        trend: 0,
        icon: 'lucideVideo',
      },
    ];
  }

  daysSinceLastVideo(videos: any[]): number {
    if (!videos || videos.length === 0) return 0;
    const sorted = [...videos].sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime(),
    );
    const diff = Date.now() - new Date(sorted[0].published_at).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  formatNumber(num: number): string {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }
}
