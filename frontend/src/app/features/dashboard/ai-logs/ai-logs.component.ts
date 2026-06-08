import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService, AiLog } from '../../../core/services/supabase.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
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
  imports: [CommonModule, NgIconComponent],
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
    if (score === null) return 'text-slate-400';
    if (score >= 7) return 'text-emerald-600 font-bold';
    if (score < 4) return 'text-rose-600 font-bold';
    return 'text-amber-500 font-bold';
  }

  scoreBadgeClass(score: number | null): string {
    if (score === null) return 'bg-slate-100 text-slate-400';
    if (score >= 7) return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    if (score < 4) return 'bg-rose-50 text-rose-700 ring-1 ring-rose-200';
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }

  logTypeBadge(logType: string): string {
    const map: Record<string, string> = {
      workshop_concept: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
      workshop_brainstorm: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
      workshop_concepts: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
      decision_generation: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
      title_generation: 'bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200',
      audit: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
      niche_detection: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200',
    };
    return map[logType] ?? 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
  }

  formatJson(data: any): string {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }
}
