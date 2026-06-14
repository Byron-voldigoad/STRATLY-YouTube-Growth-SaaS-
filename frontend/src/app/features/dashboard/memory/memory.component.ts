import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideHistory,
  lucideCheckCircle,
  lucideXCircle,
  lucideSkipForward,
  lucideTarget,
} from '@ng-icons/lucide';
import { SupabaseService } from '../../../core/services/supabase.service';
import { DecisionService } from '../../../core/services/decision.service';
import { getDecisionUIStatus, DecisionUIStatus } from '../../../shared/utils/decision-status.util';
import { EXPERIMENT_LABELS, ExperimentType } from '../../../core/models/decision.model';

@Component({
  selector: 'app-memory',
  standalone: true,
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      lucideHistory,
      lucideCheckCircle,
      lucideXCircle,
      lucideSkipForward,
      lucideTarget,
    }),
  ],
  templateUrl: './memory.component.html',
  styleUrl: './memory.component.css',
})
export class MemoryComponent implements OnInit {
  decisions: (any & { uiStatus: DecisionUIStatus })[] = [];
  isLoadingDecisions = false;

  get historyDecisions() {
    return this.decisions.filter(d => d.uiStatus.label !== 'EN ÉVALUATION');
  }

  getExperimentLabel(type: ExperimentType | string): string {
    return EXPERIMENT_LABELS[type as ExperimentType] || type;
  }

  constructor(
    private supabase: SupabaseService,
    private decisionService: DecisionService,
  ) {}

  async ngOnInit() {
    await this.loadDecisions();
  }

  async loadDecisions() {
    this.isLoadingDecisions = true;
    try {
      const profile = await this.supabase.getProfile();
      if (!profile?.youtube_channel_id) return;

      const history = await this.decisionService.getHistory(profile.id, profile.youtube_channel_id);

      this.decisions = (history || []).map((d) => ({
        ...d,
        uiStatus: getDecisionUIStatus(d),
      }));
    } catch (err) {
      console.error('[MEMORY] loadDecisions error:', err);
    } finally {
      this.isLoadingDecisions = false;
    }
  }
}
