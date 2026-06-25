import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';

@Component({
  selector: 'nerra-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- ═══════════════════════════════════════════════
         FULLPAGE — Overlay plein écran, fond sombre
         ═══════════════════════════════════════════════ -->
    @if (variant === 'fullpage') {
      <div class="nerra-overlay">
        <div class="nerra-center">
          <svg
            class="nerra-n nerra-n--lg"
            viewBox="0 0 64 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              class="nerra-stroke nerra-stroke--1"
              d="M14,64 L24,8"
            />
            <path
              class="nerra-stroke nerra-stroke--accent"
              d="M22,8 L44,64"
            />
            <path
              class="nerra-stroke nerra-stroke--3"
              d="M42,64 L54,8"
            />
          </svg>

          @if (message) {
            <p class="nerra-msg">{{ message }}</p>
          }
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════════════
         SECTION — Intégré dans un conteneur parent
         ═══════════════════════════════════════════════ -->
    @if (variant === 'section') {
      <div class="nerra-section">
        <svg
          class="nerra-n nerra-n--md"
          viewBox="0 0 64 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            class="nerra-stroke nerra-stroke--1"
            d="M14,64 L24,8"
          />
          <path
            class="nerra-stroke nerra-stroke--accent"
            d="M22,8 L44,64"
          />
          <path
            class="nerra-stroke nerra-stroke--3"
            d="M42,64 L54,8"
          />
        </svg>

        @if (message) {
          <p class="nerra-msg nerra-msg--sm">{{ message }}</p>
        }
      </div>
    }

    <!-- ═══════════════════════════════════════════════
         INLINE — Trait violet seul, pour boutons
         ═══════════════════════════════════════════════ -->
    @if (variant === 'inline') {
      <svg
        class="nerra-n nerra-n--inline"
        viewBox="0 0 64 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          class="nerra-stroke nerra-stroke--accent nerra-stroke--inline-accent"
          d="M22,8 L44,64"
        />
      </svg>
    }

    <!-- ═══════════════════════════════════════════════
         DECISION — Attente longue avec messages progressifs
         ═══════════════════════════════════════════════ -->
    @if (variant === 'decision') {
      <div class="nerra-overlay">
        <div class="nerra-center">
          <svg
            class="nerra-n nerra-n--lg"
            [class.nerra-n--complete]="complete"
            viewBox="0 0 64 72"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              class="nerra-stroke nerra-stroke--1"
              d="M14,64 L24,8"
            />
            <path
              class="nerra-stroke nerra-stroke--accent"
              d="M22,8 L44,64"
            />
            <path
              class="nerra-stroke nerra-stroke--3"
              d="M42,64 L54,8"
            />
          </svg>

          <p
            class="nerra-msg"
            [class.nerra-msg--complete]="complete"
          >
            {{ complete ? 'Décision prête.' : currentMessage }}
          </p>
        </div>
      </div>
    }
  `,
  styles: [
    `
    /* ================================================
       DESIGN TOKENS
       ================================================ */
    :host {
      --nerra-accent: #7C5CFC;
      --nerra-accent-glow: rgba(124, 92, 252, 0.3);
      --nerra-bg: #09090b;
      --nerra-stroke-color: #fafafa;
      --nerra-text: #fafafa;
      --nerra-text-muted: #71717a;
      --nerra-stroke-w: 6;
      --nerra-dash: 65;

      display: contents;
    }

    /* ================================================
       SVG — Le « N » de Nerra
       ================================================ */
    .nerra-n {
      display: block;
      overflow: visible;
    }
    .nerra-n--lg  { width: 72px; height: auto; }
    .nerra-n--md  { width: 44px; height: auto; }
    .nerra-n--inline {
      width: 18px;
      height: auto;
      display: inline-block;
      vertical-align: middle;
    }

    /* ─── Stroke base ─── */
    .nerra-stroke {
      stroke-width: var(--nerra-stroke-w);
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      stroke-dasharray: var(--nerra-dash);
      stroke-dashoffset: var(--nerra-dash);
    }

    /* Neutral strokes (left & right) */
    .nerra-stroke--1,
    .nerra-stroke--3 {
      stroke: var(--nerra-stroke-color);
      animation: nerraDrawErase 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    }

    .nerra-stroke--3 {
      animation-delay: 0.16s;
    }

    /* Accent stroke (violet diagonal) */
    .nerra-stroke--accent {
      stroke: var(--nerra-accent);
      animation: nerraDrawErase 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
      animation-delay: 0.08s;
      filter: drop-shadow(0 0 3px var(--nerra-accent-glow));
    }

    /* Inline accent — faster, standalone */
    .nerra-stroke--inline-accent {
      animation-name: nerraDrawErase;
      animation-duration: 1.0s;
      animation-delay: 0s;
    }

    /* ================================================
       KEYFRAMES — Draw → Hold → Gentle erase
       ================================================ */
    @keyframes nerraDrawErase {
      0% {
        stroke-dashoffset: var(--nerra-dash);
      }
      30% {
        stroke-dashoffset: 0;       /* fully drawn */
      }
      55% {
        stroke-dashoffset: 0;       /* hold — the decisive pause */
      }
      85% {
        stroke-dashoffset: calc(var(--nerra-dash) * -1);  /* erase forward */
      }
      100% {
        stroke-dashoffset: calc(var(--nerra-dash) * -1);  /* stay erased briefly */
      }
    }

    /* ================================================
       COMPLETE STATE — Décision prise
       ================================================ */
    .nerra-n--complete .nerra-stroke {
      animation: none;
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 0.5s cubic-bezier(0.16, 1, 0.3, 1),
                  filter 0.5s ease;
    }

    .nerra-n--complete .nerra-stroke--accent {
      filter: drop-shadow(0 0 6px var(--nerra-accent-glow));
    }

    /* ================================================
       OVERLAY — Fullpage & Decision backdrop
       ================================================ */
    .nerra-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--nerra-bg);
    }

    .nerra-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }

    /* ================================================
       SECTION — Inline container loader
       ================================================ */
    .nerra-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 48px 24px;
      min-height: 200px;
    }

    /* Adapt section strokes to current theme */
    :host-context(:root:not(.dark)) .nerra-section .nerra-stroke--1,
    :host-context(:root:not(.dark)) .nerra-section .nerra-stroke--3 {
      stroke: #27272a;
    }

    :host-context(:root.dark) .nerra-section .nerra-stroke--1,
    :host-context(:root.dark) .nerra-section .nerra-stroke--3 {
      stroke: #d4d4d8;
    }

    /* ================================================
       MESSAGES
       ================================================ */
    .nerra-msg {
      font-family: 'Outfit', 'Inter', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.01em;
      color: var(--nerra-text-muted);
      text-align: center;
      animation: nerraMsgFade 0.4s ease-out;
    }

    .nerra-msg--sm {
      font-size: 13px;
    }

    .nerra-msg--complete {
      color: var(--nerra-accent);
      font-weight: 600;
      animation: nerraMsgReveal 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes nerraMsgFade {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes nerraMsgReveal {
      from { opacity: 0; transform: translateY(6px) scale(0.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ─── Section message adapts to theme ─── */
    :host-context(:root:not(.dark)) .nerra-section .nerra-msg {
      color: #71717a;
    }

    :host-context(:root.dark) .nerra-section .nerra-msg {
      color: #a1a1aa;
    }
  `,
  ],
})
export class NerraLoaderComponent implements OnInit, OnDestroy {
  /** Which loader variant to render */
  @Input() variant: 'fullpage' | 'section' | 'inline' | 'decision' = 'fullpage';

  /** Static message displayed below the N (fullpage/section) */
  @Input() message = '';

  /** Progressive messages for the decision variant */
  @Input() messages: string[] = [];

  /** Decision complete — freezes animation, violet stays lit */
  @Input() complete = false;

  /** Currently displayed decision message */
  currentMessage = '';

  private _interval: ReturnType<typeof setInterval> | null = null;
  private _msgIndex = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.variant === 'decision' && this.messages.length > 0) {
      this.currentMessage = this.messages[0];
      this._interval = setInterval(() => {
        this._msgIndex = (this._msgIndex + 1) % this.messages.length;
        this.currentMessage = this.messages[this._msgIndex];
        this.cdr.markForCheck();
      }, 2800);
    }
  }

  ngOnDestroy(): void {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }
}
