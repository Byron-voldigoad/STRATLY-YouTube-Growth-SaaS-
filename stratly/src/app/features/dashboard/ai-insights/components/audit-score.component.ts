import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-audit-score',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="relative flex items-center justify-center size-48 mx-auto">
      <!-- Background Circle -->
      <svg class="size-full -rotate-90">
        <circle
          cx="96" cy="96" r="80"
          stroke="currentColor"
          stroke-width="12"
          fill="transparent"
          class="text-slate-100"
        />
        <!-- Progress Circle -->
        <circle
          cx="96" cy="96" r="80"
          stroke="currentColor"
          stroke-width="12"
          fill="transparent"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="dashOffset"
          stroke-linecap="round"
          [class]="scoreColorClass"
          class="transition-all duration-1000 ease-out"
        />
      </svg>
      
      <!-- Score Label -->
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-5xl font-black font-heading tracking-tight" [class]="scoreTextClass">
          {{ score }}
        </span>
        <span class="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Score Global</span>
      </div>
    </div>
  `
})
export class AuditScoreComponent {
    @Input() score = 0;

    readonly circumference = 2 * Math.PI * 80;

    get dashOffset() {
        return this.circumference * (1 - this.score / 100);
    }

    get scoreColorClass() {
        if (this.score >= 70) return 'text-emerald-500';
        if (this.score >= 40) return 'text-amber-500';
        return 'text-rose-500';
    }

    get scoreTextClass() {
        if (this.score >= 70) return 'text-emerald-600';
        if (this.score >= 40) return 'text-amber-600';
        return 'text-rose-600';
    }
}
