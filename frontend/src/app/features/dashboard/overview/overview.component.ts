import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  lucideSparkles,
  lucideArrowRight,
} from '@ng-icons/lucide';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { curveBasis } from 'd3-shape';
import { YouTubeService } from '../../../core/services/youtube.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, NgIconComponent, NgxChartsModule],
  providers: [
    provideIcons({
      lucideUsers,
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
      lucideSparkles,
      lucideArrowRight,
    }),
  ],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit {
  isLoading = true;
  isImporting = false;
  hasData = false;
  userName = '';

  kpis: { label: string; value: string; trend: number; icon: string; color: string }[] = [
    { label: 'Abonnés', value: '--', trend: 0, icon: 'lucideUsers', color: 'indigo' },
    { label: 'Vues totales', value: '--', trend: 0, icon: 'lucideEye', color: 'violet' },
    { label: 'Watch Time', value: '--', trend: 0, icon: 'lucideClock', color: 'amber' },
    { label: 'Vidéos', value: '--', trend: 0, icon: 'lucideVideo', color: 'emerald' },
  ];

  curve: any = curveBasis;
  colorScheme = 'cool';
  colorSchemeViews = 'cool';

  subscribersSeries: any[] = [];
  viewsData: any[] = [];
  recentVideos: any[] = [];

  constructor(
    private youtubeService: YouTubeService,
    private supabase: SupabaseService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  async ngOnInit() {
    // Load user name
    try {
      const user = await this.supabase.getUser();
      if (user) {
        this.userName = user.user_metadata?.['full_name']
            || user.user_metadata?.['name']
            || user.email?.split('@')[0]
            || 'Créateur';
      }
    } catch {
      this.userName = 'Créateur';
    }

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
        this.recentVideos = (videos || []).slice(0, 5);
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
        color: 'indigo',
      },
      {
        label: 'Vues totales',
        value: this.formatNumber(latest.total_views),
        trend: viewsTrend,
        icon: 'lucideEye',
        color: 'violet',
      },
      {
        label: 'Dernière vidéo',
        value: this.daysSinceLastVideo(videos) + 'j',
        trend: 0,
        icon: 'lucideClock',
        color: 'amber',
      },
      {
        label: 'Vidéos',
        value: latest.total_videos?.toString() || '--',
        trend: 0,
        icon: 'lucideVideo',
        color: 'emerald',
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

  getKpiGradient(color: string): string {
    const map: Record<string, string> = {
      indigo: 'from-indigo-500/10 to-indigo-500/5',
      violet: 'from-violet-500/10 to-violet-500/5',
      amber: 'from-amber-500/10 to-amber-500/5',
      emerald: 'from-emerald-500/10 to-emerald-500/5',
    };
    return map[color] || map['indigo'];
  }

  getKpiIconBg(color: string): string {
    const map: Record<string, string> = {
      indigo: 'bg-indigo-100 text-indigo-600',
      violet: 'bg-violet-100 text-violet-600',
      amber: 'bg-amber-100 text-amber-600',
      emerald: 'bg-emerald-100 text-emerald-600',
    };
    return map[color] || map['indigo'];
  }
}
