import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService, AiLog } from '../../../core/services/supabase.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { NerraLoaderComponent } from '../../../shared/components/nerra-loader/nerra-loader.component';
import {
  lucideTerminal,
  lucideChevronDown,
  lucideChevronUp,
  lucideRefreshCw,
  lucideAlertCircle,
  lucideLoader,
} from '@ng-icons/lucide';

@Component({
  selector: 'app-ai-logs',
  standalone: true,
  imports: [CommonModule, NgIconComponent, NerraLoaderComponent],
  providers: [
    provideIcons({
      lucideTerminal,
      lucideChevronDown,
      lucideChevronUp,
      lucideRefreshCw,
      lucideAlertCircle,
      lucideLoader,
    }),
  ],
  templateUrl: './ai-logs.component.html',
})
export class AiLogsComponent implements OnInit {
  private supabase = inject(SupabaseService);

  logs = signal<AiLog[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  expandedId = signal<string | null>(null);

  async ngOnInit() {
    await this.loadLogs();
  }

  async loadLogs() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.supabase.getRecentAiLogs(50);
      this.logs.set(data);
    } catch (err: any) {
      this.error.set(err?.message ?? 'Erreur lors du chargement des logs');
    } finally {
      this.loading.set(false);
    }
  }

  toggleRow(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  isExpanded(id: string): boolean {
    return this.expandedId() === id;
  }

  scoreClass(score: number | null): string {
    if (score === null) return 'text-zinc-500';
    if (score >= 7) return 'text-emerald-400 font-bold';
    if (score < 4) return 'text-rose-400 font-bold';
    return 'text-amber-400 font-bold';
  }

  scoreBadgeClass(score: number | null): string {
    if (score === null) return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    if (score >= 7) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
    if (score < 4) return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  }

  logTypeBadge(logType: string): string {
    const map: Record<string, string> = {
      workshop_concept: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      workshop_brainstorm: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      workshop_concepts: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      decision_generation: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      title_generation: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      audit: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      niche_detection: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
    };
    return map[logType] ?? 'bg-zinc-800 text-zinc-400 border border-zinc-700';
  }

  formatJson(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
}
