import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSparkles,
  lucideLoader2,
  lucideCheck,
  lucideX,
  lucideTrendingUp,
  lucideTrendingDown,
  lucideAlertTriangle,
  lucideShield,
  lucideZap,
  lucideTarget,
  lucideFlame,
  lucideHistory,
  lucideChevronRight,
  lucideMessageCircle,
} from '@ng-icons/lucide';
import { DecisionService } from '../../../core/services/decision.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  Decision,
  TensionScore,
  ChannelModeInfo,
  ExperimentType,
  EXPERIMENT_LABELS,
  METRIC_LABELS,
  ResistanceResult,
  AuditInsights,
  UserContext,
} from '../../../core/models/decision.model';

@Component({
  selector: 'app-decision',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmCardImports, NgIconComponent],
  providers: [
    provideIcons({
      lucideSparkles,
      lucideLoader2,
      lucideCheck,
      lucideX,
      lucideTrendingUp,
      lucideTrendingDown,
      lucideAlertTriangle,
      lucideShield,
      lucideZap,
      lucideTarget,
      lucideFlame,
      lucideHistory,
      lucideChevronRight,
      lucideMessageCircle,
    }),
  ],
  template: `
    <div class="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-12">

      <!-- Header Bar : Mode + Tension Score -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div class="absolute right-0 top-0 w-64 h-64 rounded-full pointer-events-none blur-[80px]"
          [ngClass]="modeInfo?.mode === 'PILOT' ? 'bg-emerald-500/15' : 'bg-indigo-500/10'"
        ></div>

        <div class="flex flex-col gap-1 relative z-10">
          <div class="flex items-center gap-3">
            <h2 class="text-3xl font-black tracking-tight text-slate-900">
              Ta prochaine décision
            </h2>
            @if (modeInfo) {
              <span
                class="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider"
                [ngClass]="modeInfo.mode === 'PILOT'
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-indigo-100 text-indigo-700 border border-indigo-200'"
              >
                <ng-icon [name]="modeInfo.mode === 'PILOT' ? 'lucideZap' : 'lucideShield'" class="w-3 h-3 inline-block mr-1"></ng-icon>
                {{ modeInfo.mode }}
              </span>
            }
          </div>
          <p class="text-slate-500 font-medium text-sm">
            {{ modeInfo?.reason || 'Chargement...' }}
          </p>
        </div>

        <!-- Tension Score -->
        @if (tensionScore) {
          <div class="relative z-10 flex items-center gap-4">
            <div class="text-right">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tension stratégique</p>
              <p class="text-3xl font-black"
                [ngClass]="tensionScore.score > 60 ? 'text-rose-600' : tensionScore.score > 30 ? 'text-amber-600' : 'text-emerald-600'"
              >
                {{ tensionScore.score }}
              </p>
            </div>
            <div class="w-16 h-16 rounded-2xl flex items-center justify-center"
              [ngClass]="tensionScore.score > 60 ? 'bg-rose-50 border border-rose-200' : tensionScore.score > 30 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'"
            >
              <ng-icon name="lucideFlame" class="w-7 h-7"
                [ngClass]="tensionScore.score > 60 ? 'text-rose-500' : tensionScore.score > 30 ? 'text-amber-500' : 'text-emerald-500'"
              ></ng-icon>
            </div>
          </div>
        }
      </div>

      <!-- REBOOT Alert -->
      @if (modeInfo?.reboot?.eligible) {
        <div class="p-6 rounded-2xl bg-rose-50 border-2 border-rose-200 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div class="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <ng-icon name="lucideAlertTriangle" class="w-6 h-6 text-rose-600"></ng-icon>
          </div>
          <div>
            <h4 class="font-black text-rose-900 text-lg">Protocole REBOOT activé</h4>
            <p class="text-rose-700 text-sm mt-1">{{ modeInfo?.reboot?.recommendation }}</p>
          </div>
        </div>
      }

      <!-- User Context Popup -->
      @if (showContextPopup) {
        <div class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 space-y-6 animate-in zoom-in-95 duration-300">
            <div class="text-center">
              <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <ng-icon name="lucideMessageCircle" class="w-8 h-8 text-indigo-500"></ng-icon>
              </div>
              <h3 class="text-2xl font-black text-slate-900">Avant de décider...</h3>
              <p class="text-slate-500 mt-2">Nerra a besoin de contexte pour adapter sa décision.</p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">As-tu déjà une vidéo en préparation ?</label>
                <div class="flex gap-3">
                  <button
                    (click)="userCtx.hasVideoInProgress = true"
                    class="flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all"
                    [ngClass]="userCtx.hasVideoInProgress ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                  >Oui</button>
                  <button
                    (click)="userCtx.hasVideoInProgress = false; userCtx.videoInProgressTitle = ''; userCtx.videoInProgressTopic = ''"
                    class="flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all"
                    [ngClass]="!userCtx.hasVideoInProgress ? 'bg-slate-50 border-slate-300 text-slate-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'"
                  >Non, je pars de zéro</button>
                </div>
              </div>

              @if (userCtx.hasVideoInProgress) {
                <div class="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Titre de la vidéo</label>
                    <input
                      type="text"
                      [(ngModel)]="userCtx.videoInProgressTitle"
                      placeholder="Ex: TOP 10 des meilleurs combats Naruto"
                      class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sujet / Thème</label>
                    <input
                      type="text"
                      [(ngModel)]="userCtx.videoInProgressTopic"
                      placeholder="Ex: Anime, classement, Naruto"
                      class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                    />
                  </div>
                </div>
              }

              <div>
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notes additionnelles (optionnel)</label>
                <textarea
                  [(ngModel)]="userCtx.additionalNotes"
                  placeholder="Ex: Je veux tester un nouveau format court..."
                  rows="2"
                  class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 resize-none"
                ></textarea>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                (click)="showContextPopup = false"
                class="flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >Annuler</button>
              <button
                (click)="confirmAndGenerate()"
                class="flex-1 py-3 px-4 rounded-xl font-black text-sm bg-slate-900 text-white hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/10"
              >
                <ng-icon name="lucideSparkles" class="w-4 h-4 inline-block mr-1"></ng-icon>
                Générer la décision
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading) {
        <div class="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
          <div class="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm mb-4">
            <ng-icon name="lucideLoader2" class="w-8 h-8 text-indigo-500 animate-spin"></ng-icon>
          </div>
          <p class="text-slate-500 font-bold tracking-tight">Nerra analyse votre chaîne...</p>
        </div>
      }

      <!-- Generating State -->
      @else if (isGenerating) {
        <div class="flex flex-col items-center justify-center min-h-[400px] bg-white border border-slate-200 rounded-3xl shadow-sm">
          <div class="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6 border border-indigo-100">
            <ng-icon name="lucideSparkles" class="w-10 h-10 text-indigo-400 animate-pulse"></ng-icon>
          </div>
          <p class="text-xl font-black text-slate-900 mb-2">Nerra décide pour vous...</p>
          <p class="text-sm text-slate-500">L'IA analyse vos données et votre historique.</p>
        </div>
      }

      <!-- Decision Card -->
      @else if (currentDecision) {
        <div class="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          <!-- Decision Header -->
          <div class="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-100 border border-indigo-200">
                <ng-icon name="lucideTarget" class="w-5 h-5 text-indigo-600"></ng-icon>
              </div>
              <div>
                <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  {{ getExperimentLabel(currentDecision.experiment_type) }}
                </span>
              </div>
              <!-- Status Badge -->
              <span class="ml-auto px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider"
                [ngClass]="{
                  'bg-amber-100 text-amber-700 border border-amber-200': !currentDecision.accepted_at && currentDecision.verdict === 'PENDING',
                  'bg-blue-100 text-blue-700 border border-blue-200': currentDecision.accepted_at && currentDecision.verdict === 'PENDING',
                  'bg-emerald-100 text-emerald-700 border border-emerald-200': currentDecision.verdict === 'VALIDATED',
                  'bg-rose-100 text-rose-700 border border-rose-200': currentDecision.verdict === 'FAILED'
                }"
              >
                @if (!currentDecision.accepted_at && currentDecision.verdict === 'PENDING') {
                  Hypothèse
                } @else if (currentDecision.accepted_at && currentDecision.verdict === 'PENDING') {
                  Acceptée ✓
                } @else {
                  {{ currentDecision.verdict }}
                }
              </span>
            </div>

            <h3 class="text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {{ currentDecision.hypothesis }}
            </h3>
          </div>

          <!-- Decision Details -->
          <div class="p-6 md:p-8 space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Variable testée</p>
                <p class="text-sm font-bold text-slate-900">{{ currentDecision.variable }}</p>
              </div>
              <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Métrique cible</p>
                <p class="text-sm font-bold text-slate-900">{{ getMetricLabel(currentDecision.target_metric) }}</p>
              </div>
              <div class="p-4 rounded-2xl border"
                [ngClass]="currentDecision.baseline_value !== null ? 'bg-slate-50 border-slate-100' : 'bg-amber-50/50 border-amber-100'"
              >
                <p class="text-[10px] font-bold uppercase tracking-wider mb-1"
                  [ngClass]="currentDecision.baseline_value !== null ? 'text-slate-400' : 'text-amber-400'"
                >Baseline</p>
                @if (currentDecision.baseline_value !== null) {
                  <p class="text-sm font-bold text-slate-900">{{ formatBaseline(currentDecision.baseline_value, currentDecision.target_metric) }}</p>
                  <p class="text-[10px] text-slate-400 mt-0.5">{{ getBaselineContext(currentDecision.target_metric) }}</p>
                } @else {
                  <p class="text-sm font-bold text-amber-600">N/A</p>
                  <p class="text-[10px] text-amber-500 mt-0.5">Donnée non disponible via l'API</p>
                }
              </div>
            </div>

            <!-- AI Reasoning -->
            @if (currentDecision.ai_reasoning) {
              <div class="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <div class="flex items-center gap-2 mb-3">
                  <ng-icon name="lucideSparkles" class="w-4 h-4 text-indigo-500"></ng-icon>
                  <span class="text-xs font-bold text-indigo-600 uppercase tracking-wider">Raisonnement Nerra</span>
                </div>
                <p class="text-sm text-slate-700 leading-relaxed">{{ currentDecision.ai_reasoning }}</p>
              </div>
            }

            <!-- Resistance Warning -->
            @if (resistanceMessage) {
              <div class="p-4 rounded-2xl border-2 animate-in fade-in duration-300"
                [ngClass]="resistanceLevel === 2 ? 'bg-rose-50 border-rose-300' : 'bg-amber-50 border-amber-200'"
              >
                <p class="text-sm font-bold"
                  [ngClass]="resistanceLevel === 2 ? 'text-rose-700' : 'text-amber-700'"
                >
                  {{ resistanceMessage }}
                </p>
              </div>
            }

            <!-- ═══════════════════════════════════════════════ -->
            <!-- STATE 1: PENDING (pas encore acceptée) -->
            <!-- ═══════════════════════════════════════════════ -->
            @if (!currentDecision.accepted_at && currentDecision.verdict === 'PENDING') {
              <div class="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  (click)="onAccept()"
                  [disabled]="isActioning"
                  class="flex-1 flex items-center justify-center gap-3 px-8 py-4 text-base font-black text-white bg-slate-900 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/20 hover:shadow-emerald-500/25 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:transform-none group"
                >
                  <ng-icon name="lucideCheck" class="w-5 h-5 group-hover:scale-110 transition-transform"></ng-icon>
                  J'accepte cette décision
                </button>
                <button
                  (click)="onReject()"
                  [disabled]="isActioning"
                  class="flex items-center justify-center gap-3 px-8 py-4 text-base font-bold text-slate-600 bg-white border-2 border-slate-200 rounded-2xl hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-all disabled:opacity-50 group"
                >
                  <ng-icon name="lucideX" class="w-5 h-5 group-hover:scale-110 transition-transform"></ng-icon>
                  Refuser
                </button>
              </div>
            }

            <!-- ═══════════════════════════════════════════════ -->
            <!-- STATE 2: ACCEPTED — Atelier Vidéo (3 étapes) -->
            <!-- ═══════════════════════════════════════════════ -->
            @else if (currentDecision.accepted_at && currentDecision.verdict === 'PENDING') {
              <div class="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

                <!-- Step Progress Bar -->
                <div class="flex items-center gap-2">
                  @for (step of [1, 2, 3, 4, 5]; track step) {
                    <div class="flex-1 h-2 rounded-full transition-all duration-500"
                      [ngClass]="{
                        'bg-indigo-500': workshopStep >= step,
                        'bg-slate-200': workshopStep < step
                      }"
                    ></div>
                  }
                  <span class="text-xs font-bold text-slate-400 ml-2">{{ workshopStep }}/5</span>
                </div>

                <!-- ═══ STEP 1: Idéation — Concept de vidéo ═══ -->
                @if (workshopStep === 1) {
                  <div class="p-6 rounded-2xl bg-white border-2 border-violet-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div class="flex items-center gap-3 mb-5">
                      <div class="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <span class="text-lg font-black text-violet-600">1</span>
                      </div>
                      <div>
                        <h4 class="font-black text-slate-900">Trouver le concept</h4>
                        <p class="text-sm text-slate-500">Nerra propose 3 idées de vidéos basées sur votre stratégie</p>
                      </div>
                    </div>

                    @if (isLoadingWorkshop) {
                      <div class="flex items-center justify-center py-8">
                        <ng-icon name="lucideLoader2" class="w-6 h-6 text-violet-400 animate-spin"></ng-icon>
                        <span class="ml-3 text-sm text-slate-500 font-medium">Nerra génère des concepts...</span>
                      </div>
                    } @else if (conceptSuggestions.length > 0) {
                      <div class="space-y-3 mb-4">
                        @for (concept of conceptSuggestions; track concept; let i = $index) {
                          <button
                            (click)="selectedConcept = concept; customConcept = concept"
                            class="w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm"
                            [ngClass]="selectedConcept === concept
                              ? 'border-violet-400 bg-violet-50/50 shadow-sm'
                              : 'border-slate-200 hover:border-violet-200'"
                          >
                            <div class="flex items-start gap-3">
                              <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                                [ngClass]="selectedConcept === concept ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500'"
                              >{{ i + 1 }}</div>
                              <span class="text-sm font-bold text-slate-900">{{ concept }}</span>
                            </div>
                          </button>
                        }
                      </div>

                      @if (conceptReasoning) {
                        <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                          <p class="text-xs text-slate-500 italic">{{ conceptReasoning }}</p>
                        </div>
                      }

                      <div class="space-y-3">
                        <div>
                          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ou décrivez votre propre idée</label>
                          <textarea
                            [(ngModel)]="customConcept"
                            placeholder="Ex: Un edit Solo Leveling avec la scène du double dungeon où Jin Woo affronte Igris..."
                            rows="3"
                            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 resize-none"
                          ></textarea>
                        </div>
                        <div class="flex gap-3">
                          <button
                            (click)="loadConceptSuggestions()"
                            [disabled]="isLoadingWorkshop || isEvaluatingConcept"
                            class="px-4 py-2.5 rounded-xl text-xs font-bold border-2 border-slate-200 text-slate-600 hover:border-violet-200 hover:bg-violet-50 transition-all disabled:opacity-50"
                          >
                            Régénérer
                          </button>
                          @if (!conceptSuggestions.includes(customConcept)) {
                            <button
                              (click)="evaluateConcept()"
                              [disabled]="!customConcept || isEvaluatingConcept"
                              class="flex-1 px-6 py-2.5 rounded-xl text-sm font-black border-2 border-violet-600 text-violet-600 hover:bg-violet-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              @if (isEvaluatingConcept) {
                                <ng-icon name="lucideLoader2" class="w-4 h-4 animate-spin"></ng-icon>
                              }
                              L'avis de Nerra
                            </button>
                          } @else {
                            <button
                              (click)="confirmConcept()"
                              [disabled]="!customConcept"
                              class="flex-1 px-6 py-2.5 rounded-xl text-sm font-black bg-slate-900 text-white hover:bg-violet-600 transition-all shadow-lg disabled:opacity-50"
                            >
                              Valider cette idée →
                            </button>
                          }
                        </div>

                        <!-- Évaluation du concept -->
                        @if (conceptEvaluation) {
                          <div class="p-4 rounded-xl border-2 animate-in fade-in slide-in-from-top-2 duration-300"
                            [ngClass]="conceptEvaluation.score >= 7 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'"
                          >
                            <div class="flex items-center justify-between mb-2">
                              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Avis de Nerra</span>
                              <span class="text-lg font-black"
                                [ngClass]="conceptEvaluation.score >= 7 ? 'text-emerald-600' : 'text-amber-600'"
                              >{{ conceptEvaluation.score }}/10</span>
                            </div>
                            <p class="text-sm font-medium text-slate-700 mb-3">{{ conceptEvaluation.feedback }}</p>
                            <button
                              (click)="confirmConcept()"
                              class="w-full py-2 rounded-xl text-sm font-black text-white shadow-sm transition-all"
                              [ngClass]="conceptEvaluation.score >= 7 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'"
                            >
                              Valider cette idée →
                            </button>
                          </div>
                        }
                      </div>
                    } @else {
                      <button
                        (click)="loadConceptSuggestions()"
                        [disabled]="isLoadingWorkshop"
                        class="w-full py-4 rounded-xl font-bold text-sm bg-violet-50 text-violet-600 border-2 border-violet-100 hover:bg-violet-100 transition-all"
                      >
                        Générer des idées de vidéos
                      </button>
                    }
                  </div>
                }

                <!-- ═══ STEP 2: Brainstorm ═══ -->
                @else if (workshopStep === 2) {
                  <div class="p-6 rounded-2xl bg-white border-2 border-sky-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div class="flex items-center gap-3 mb-5">
                      <div class="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                        <span class="text-lg font-black text-sky-600">2</span>
                      </div>
                      <div>
                        <h4 class="font-black text-slate-900">Développer l'idée</h4>
                        <p class="text-sm text-slate-500">Nerra détaille votre concept en scènes, style et accroche</p>
                      </div>
                    </div>

                    @if (isLoadingWorkshop) {
                      <div class="flex items-center justify-center py-8">
                        <ng-icon name="lucideLoader2" class="w-6 h-6 text-sky-400 animate-spin"></ng-icon>
                        <span class="ml-3 text-sm text-slate-500 font-medium">Nerra brainstorm en cours...</span>
                      </div>
                    } @else if (brainstormData) {
                      <div class="space-y-4">

                        <!-- Concept raffiné -->
                        <div class="p-4 rounded-xl bg-sky-50/50 border border-sky-100">
                          <p class="text-[10px] font-bold text-sky-500 uppercase tracking-wider mb-2">Concept raffiné</p>
                          <p class="text-sm font-bold text-slate-900">{{ brainstormData.refinedConcept }}</p>
                        </div>

                        <!-- Accroche -->
                        <div class="p-4 rounded-xl bg-rose-50/50 border border-rose-100">
                          <p class="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2">🎬 Hook (3 premières secondes)</p>
                          <p class="text-sm font-bold text-slate-900">{{ brainstormData.hookSuggestion }}</p>
                        </div>

                        <!-- Scènes -->
                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Scènes / Moments clés</p>
                          <div class="space-y-2">
                            @for (scene of brainstormData.scenes; track scene; let i = $index) {
                              <div class="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-100">
                                <span class="w-6 h-6 rounded-md bg-sky-100 text-sky-600 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{{ i + 1 }}</span>
                                <p class="text-sm text-slate-700">{{ scene }}</p>
                              </div>
                            }
                          </div>
                        </div>

                        <!-- Style + Durée + Musique -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">⏱ Durée</p>
                            <p class="text-sm font-bold text-slate-900">{{ brainstormData.duration }}</p>
                          </div>
                          <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">✂️ Montage</p>
                            <p class="text-sm font-bold text-slate-900">{{ brainstormData.style }}</p>
                          </div>
                          <div class="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">🎵 Musique</p>
                            <p class="text-sm font-bold text-slate-900">{{ brainstormData.musicDirection }}</p>
                          </div>
                        </div>

                        <!-- Notes utilisateur -->
                        <div>
                          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vos ajustements (optionnel)</label>
                          <textarea
                            [(ngModel)]="brainstormNotes"
                            placeholder="Ex: Je préfère utiliser la scène du combat contre l'ombre d'Igris à la place..."
                            rows="3"
                            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-300 resize-none"
                          ></textarea>
                        </div>

                        <div class="flex gap-3">
                          <button
                            (click)="workshopStep = 1"
                            class="px-4 py-2.5 rounded-xl text-xs font-bold border-2 border-slate-200 text-slate-600 hover:border-slate-300 transition-all"
                          >
                            Retour
                          </button>
                          <button
                            (click)="reloadBrainstorm()"
                            [disabled]="isLoadingWorkshop"
                            class="px-4 py-2.5 rounded-xl text-xs font-bold border-2 border-sky-200 text-sky-600 hover:bg-sky-50 transition-all disabled:opacity-50"
                          >
                            Raffiner avec Nerra
                          </button>
                          <button
                            (click)="confirmBrainstorm()"
                            class="flex-1 px-6 py-2.5 rounded-xl text-sm font-black bg-slate-900 text-white hover:bg-sky-600 transition-all shadow-lg"
                          >
                            Passer aux titres →
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }

                <!-- ═══ STEP 3: Atelier Titre ═══ -->
                @else if (workshopStep === 3) {
                  <div class="p-6 rounded-2xl bg-white border-2 border-indigo-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div class="flex items-center gap-3 mb-5">
                      <div class="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <span class="text-lg font-black text-indigo-600">3</span>
                      </div>
                      <div>
                        <h4 class="font-black text-slate-900">Choisir le titre</h4>
                        <p class="text-sm text-slate-500">Nerra propose 3 titres optimisés pour votre vidéo</p>
                      </div>
                    </div>

                    @if (isLoadingWorkshop) {
                      <div class="flex items-center justify-center py-8">
                        <ng-icon name="lucideLoader2" class="w-6 h-6 text-indigo-400 animate-spin"></ng-icon>
                        <span class="ml-3 text-sm text-slate-500 font-medium">Nerra génère des titres...</span>
                      </div>
                    } @else if (titleSuggestions.length > 0) {
                      <div class="space-y-3 mb-4">
                        @for (title of titleSuggestions; track title; let i = $index) {
                          <button
                            (click)="selectedTitle = title; customTitle = title"
                            class="w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-sm"
                            [ngClass]="selectedTitle === title
                              ? 'border-indigo-400 bg-indigo-50/50 shadow-sm'
                              : 'border-slate-200 hover:border-indigo-200'"
                          >
                            <div class="flex items-center gap-3">
                              <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                                [ngClass]="selectedTitle === title ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'"
                              >{{ i + 1 }}</div>
                              <span class="text-sm font-bold text-slate-900">{{ title }}</span>
                            </div>
                          </button>
                        }
                      </div>

                      @if (titleReasoning) {
                        <div class="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                          <p class="text-xs text-slate-500 italic">{{ titleReasoning }}</p>
                        </div>
                      }

                      <div class="space-y-3">
                        <div>
                          <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ou personnalisez</label>
                          <input
                            type="text"
                            [(ngModel)]="customTitle"
                            placeholder="Entrez votre propre titre..."
                            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                          />
                        </div>
                        <div class="flex gap-3">
                          <button
                            (click)="workshopStep = 2"
                            class="px-4 py-2.5 rounded-xl text-xs font-bold border-2 border-slate-200 text-slate-600 hover:border-slate-300 transition-all"
                          >
                            Retour
                          </button>
                          <button
                            (click)="loadTitleSuggestions()"
                            [disabled]="isLoadingWorkshop || isEvaluatingTitle"
                            class="px-4 py-2.5 rounded-xl text-xs font-bold border-2 border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all disabled:opacity-50"
                          >
                            Régénérer
                          </button>
                          @if (!titleSuggestions.includes(customTitle)) {
                            <button
                              (click)="evaluateTitle()"
                              [disabled]="!customTitle || isEvaluatingTitle"
                              class="flex-1 px-6 py-2.5 rounded-xl text-sm font-black border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              @if (isEvaluatingTitle) {
                                <ng-icon name="lucideLoader2" class="w-4 h-4 animate-spin"></ng-icon>
                              }
                              L'avis de Nerra
                            </button>
                          } @else {
                            <button
                              (click)="confirmTitle()"
                              [disabled]="!customTitle || isEvaluatingTitle"
                              class="flex-1 px-6 py-2.5 rounded-xl text-sm font-black bg-slate-900 text-white hover:bg-indigo-600 transition-all shadow-lg disabled:opacity-50"
                            >
                              Valider ce titre →
                            </button>
                          }
                        </div>

                        <!-- Évaluation personnalisée du titre -->
                        @if (titleEvaluation) {
                          <div class="p-4 rounded-xl border-2 animate-in fade-in slide-in-from-top-2 duration-300"
                            [ngClass]="titleEvaluation.score >= 7 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'"
                          >
                            <div class="flex items-center justify-between mb-2">
                              <span class="text-xs font-bold uppercase tracking-wider text-slate-500">Avis de Nerra</span>
                              <span class="text-lg font-black"
                                [ngClass]="titleEvaluation.score >= 7 ? 'text-emerald-600' : 'text-amber-600'"
                              >{{ titleEvaluation.score }}/10</span>
                            </div>
                            <p class="text-sm font-medium text-slate-700 mb-3">{{ titleEvaluation.feedback }}</p>
                            <!-- Bouton pour valider quand même après évaluation -->
                            <button
                              (click)="confirmTitle()"
                              class="w-full py-2 rounded-xl text-sm font-black text-white shadow-sm transition-all"
                              [ngClass]="titleEvaluation.score >= 7 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'"
                            >
                              Valider ce titre →
                            </button>
                          </div>
                        }
                      </div>
                    } @else {
                      <button
                        (click)="loadTitleSuggestions()"
                        [disabled]="isLoadingWorkshop"
                        class="w-full py-4 rounded-xl font-bold text-sm bg-indigo-50 text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-100 transition-all"
                      >
                        Générer des suggestions de titres
                      </button>
                    }
                  </div>
                }

                <!-- ═══ STEP 4: Brief Miniature ═══ -->
                @else if (workshopStep === 4) {
                  <div class="p-6 rounded-2xl bg-white border-2 border-amber-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div class="flex items-center gap-3 mb-5">
                      <div class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                        <span class="text-lg font-black text-amber-600">4</span>
                      </div>
                      <div>
                        <h4 class="font-black text-slate-900">Brief miniature</h4>
                        <p class="text-sm text-slate-500">Un guide créatif pour concevoir votre miniature</p>
                      </div>
                    </div>

                    @if (isLoadingWorkshop) {
                      <div class="flex items-center justify-center py-8">
                        <ng-icon name="lucideLoader2" class="w-6 h-6 text-amber-400 animate-spin"></ng-icon>
                        <span class="ml-3 text-sm text-slate-500 font-medium">Nerra prépare le brief...</span>
                      </div>
                    } @else if (thumbnailBrief) {
                      <div class="space-y-4">
                        <!-- Visual Elements -->
                        <div class="p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                          <p class="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">Éléments visuels clés</p>
                          <div class="flex flex-wrap gap-2">
                            @for (element of thumbnailBrief.visualElements; track element) {
                              <span class="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs font-bold text-slate-700">{{ element }}</span>
                            }
                          </div>
                        </div>

                        <!-- Color Palette -->
                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Palette de couleurs</p>
                          <div class="flex flex-wrap gap-2">
                            @for (color of thumbnailBrief.colorPalette; track color) {
                              <span class="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700">{{ color }}</span>
                            }
                          </div>
                        </div>

                        <!-- Text Overlay -->
                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Texte sur la miniature</p>
                          <p class="text-sm font-bold text-slate-900">{{ thumbnailBrief.textOverlay }}</p>
                        </div>

                        <!-- Composition -->
                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Composition</p>
                          <p class="text-sm text-slate-700">{{ thumbnailBrief.composition }}</p>
                        </div>

                        <!-- Generation Prompt -->
                        @if (thumbnailBrief.generationPrompt) {
                          <div class="p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                            <div class="flex items-center justify-between mb-2">
                              <p class="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Prompt IA Générative (Midjourney / DALL-E)</p>
                            </div>
                            <p class="text-xs text-indigo-900 font-mono italic">{{ thumbnailBrief.generationPrompt }}</p>
                          </div>
                        }

                        <!-- Upload Thumbnail for Evaluation -->
                        <div class="p-4 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/30">
                          <div class="flex flex-col items-center text-center">
                            <p class="text-xs font-bold text-amber-700 mb-2">Vous avez déjà une miniature ?</p>
                            <label class="cursor-pointer px-4 py-2 bg-white border border-amber-300 text-amber-600 text-xs font-bold rounded-lg hover:bg-amber-50 transition-colors">
                              Importer pour analyse
                              <input type="file" accept="image/*" class="hidden" (change)="onThumbnailSelected($event)" [disabled]="isEvaluatingThumbnail">
                            </label>
                            @if (isEvaluatingThumbnail) {
                              <p class="text-xs text-amber-500 mt-2 flex items-center justify-center gap-2">
                                <ng-icon name="lucideLoader2" class="w-3 h-3 animate-spin"></ng-icon>
                                Analyse visuelle en cours...
                              </p>
                            }
                          </div>
                          
                          @if (thumbnailEvaluation) {
                            <div class="mt-4 p-3 rounded-lg bg-white border border-amber-200">
                              <div class="flex items-center justify-between mb-1">
                                <span class="text-xs font-bold uppercase text-slate-500">Note</span>
                                <span class="text-sm font-black" [ngClass]="thumbnailEvaluation.score >= 7 ? 'text-emerald-600' : 'text-amber-600'">
                                  {{ thumbnailEvaluation.score }}/10
                                </span>
                              </div>
                              <p class="text-xs font-medium text-slate-700">{{ thumbnailEvaluation.feedback }}</p>
                            </div>
                          }
                        </div>

                        <!-- Inspiration / Why -->
                        <div class="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                          <div class="flex items-center gap-2 mb-1">
                            <ng-icon name="lucideSparkles" class="w-3 h-3 text-slate-500"></ng-icon>
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pourquoi ce brief ?</span>
                          </div>
                          <p class="text-xs text-slate-600 italic">{{ thumbnailBrief.inspiration }}</p>

                          <!-- Vidéos de référence avec miniatures -->
                          @if (thumbnailBrief.referencedVideos && thumbnailBrief.referencedVideos.length > 0) {
                            <div class="pt-3 border-t border-slate-200">
                              <p class="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">Miniatures de référence</p>
                              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                @for (refVideo of thumbnailBrief.referencedVideos; track refVideo.title) {
                                  <div class="group rounded-xl overflow-hidden border border-slate-200 bg-white hover:shadow-md hover:border-amber-300 transition-all">
                                    <div class="aspect-video bg-slate-100 overflow-hidden relative">
                                      <img [src]="refVideo.thumbnailUrl" [alt]="refVideo.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                      <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                                        <span class="text-[9px] font-bold text-white/90">{{ refVideo.engagement }} eng.</span>
                                      </div>
                                    </div>
                                    <div class="p-2">
                                      <p class="text-[10px] font-bold text-slate-800 leading-tight line-clamp-2">{{ refVideo.title }}</p>
                                      <p class="text-[9px] text-slate-400 mt-0.5">{{ refVideo.views | number:'1.0-0' }} vues</p>
                                    </div>
                                  </div>
                                }
                              </div>
                            </div>
                          }
                        </div>

                        <div class="flex gap-3">
                          <button
                            (click)="workshopStep = 3"
                            class="px-4 py-3 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                          >
                            Retour
                          </button>
                          <button
                            (click)="workshopStep = 5; discoverVideos()"
                            class="flex-1 py-3 rounded-xl text-sm font-black bg-slate-900 text-white hover:bg-indigo-600 transition-all shadow-lg"
                          >
                            Continuer →
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }

                <!-- ═══ STEP 5: Lier la vidéo YouTube ═══ -->
                @else if (workshopStep === 5) {
                  <div class="p-6 rounded-2xl bg-white border-2 border-emerald-100 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div class="flex items-center gap-3 mb-5">
                      <div class="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <span class="text-lg font-black text-emerald-600">5</span>
                      </div>
                      <div>
                        <h4 class="font-black text-slate-900">Lier votre vidéo</h4>
                        <p class="text-sm text-slate-500">Collez le lien YouTube une fois la vidéo publiée</p>
                      </div>
                    </div>

                    @if (linkMessage) {
                      <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-200 mb-4 animate-in fade-in duration-300">
                        <p class="text-sm font-bold text-emerald-700">{{ linkMessage }}</p>
                      </div>
                    }

                    <div class="space-y-4">
                      <!-- Section Découverte Automatique -->
                      @if (isDiscoveringVideos) {
                        <div class="p-8 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                          <div class="w-8 h-8 rounded-full border-2 border-slate-300 border-t-emerald-600 animate-spin mb-3"></div>
                          <p class="text-sm font-bold text-slate-500 italic">Recherche de vidéos récentes sur ta chaîne...</p>
                        </div>
                      } @else if (discoveredVideos.length > 0) {
                        <div class="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div class="flex items-center justify-between">
                            <label class="block text-xs font-black text-emerald-500 uppercase tracking-wider">Vidéos récentes détectées</label>
                            <button (click)="discoverVideos()" class="text-[10px] font-bold text-slate-400 hover:text-emerald-500 transition-colors uppercase">
                              Rafraîchir
                            </button>
                          </div>
                          
                          <div class="grid gap-2">
                            @for (v of discoveredVideos; track v.id) {
                              <button
                                (click)="linkDiscoveredVideo(v)"
                                class="flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left bg-white group"
                                [ngClass]="v.isMatch ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 hover:border-emerald-200'"
                              >
                                <div class="w-20 h-12 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden relative border border-slate-200">
                                  <img [src]="v.thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                  @if (v.isMatch) {
                                    <div class="absolute inset-0 bg-emerald-600/10 flex items-center justify-center">
                                      <ng-icon name="lucideCheck" class="text-white w-6 h-6 drop-shadow-md"></ng-icon>
                                    </div>
                                  }
                                </div>
                                <div class="flex-1 min-w-0">
                                  <p class="text-sm font-black text-slate-900 truncate pr-4">{{ v.title }}</p>
                                  <p class="text-[10px] font-bold text-slate-400 uppercase italic">
                                    {{ v.isMatch ? 'Match détecté (Titre)' : 'Publiée récemment' }}
                                  </p>
                                </div>
                                <ng-icon name="lucideChevronRight" class="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all"></ng-icon>
                              </button>
                            }
                          </div>
                          
                          <div class="flex items-center gap-2 py-2 px-1">
                            <div class="h-px bg-slate-100 flex-1"></div>
                            <span class="text-[10px] font-bold text-slate-300 uppercase italic">Ou lier manuellement</span>
                            <div class="h-px bg-slate-100 flex-1"></div>
                          </div>
                        </div>
                      }

                      <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lien YouTube de la vidéo</label>
                        <input
                          type="text"
                          [(ngModel)]="videoUrl"
                          placeholder="https://www.youtube.com/watch?v=..."
                          class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300"
                        />
                      </div>

                      <div class="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <p class="text-xs text-slate-500">
                          <strong class="text-slate-700">Comment ça marche :</strong> Nerra récupérera automatiquement les métriques
                          (vues, engagement, etc.) de votre vidéo et évaluera si l'expérience a fonctionné. Pas besoin d'entrer quoi que ce soit manuellement !
                        </p>
                      </div>

                      <div class="flex gap-3 mt-4">
                        <button
                          (click)="workshopStep = 4"
                          class="px-4 py-3 rounded-xl text-sm font-bold border-2 border-slate-200 text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
                        >
                          Retour
                        </button>
                        <button
                          (click)="onLinkVideo()"
                          [disabled]="isActioning || !videoUrl"
                          class="flex-1 py-3 rounded-xl text-sm font-black bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          @if (isActioning) {
                            <ng-icon name="lucideLoader2" class="w-4 h-4 animate-spin"></ng-icon>
                          }
                          Lier et évaluer automatiquement
                        </button>
                      </div>

                      <p class="text-center text-xs text-slate-400">
                        Pas encore publiée ?
                        <button (click)="onSkip()" class="font-bold hover:text-slate-600 transition-colors underline">
                          Passer pour l'instant
                        </button>
                      </p>
                    </div>
                  </div>
                }

              </div>
            }

            <!-- ═══════════════════════════════════════════════ -->
            <!-- STATE 3: EVALUATED (verdict rendu) -->
            <!-- ═══════════════════════════════════════════════ -->
            @else if (currentDecision.verdict === 'VALIDATED' || currentDecision.verdict === 'FAILED') {
              <div class="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <!-- Verdict Banner -->
                <div class="p-6 rounded-2xl border-2"
                  [ngClass]="currentDecision.verdict === 'VALIDATED'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-rose-50 border-rose-200'"
                >
                  <div class="flex items-center gap-4">
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center"
                      [ngClass]="currentDecision.verdict === 'VALIDATED' ? 'bg-emerald-100' : 'bg-rose-100'"
                    >
                      <ng-icon
                        [name]="currentDecision.verdict === 'VALIDATED' ? 'lucideTrendingUp' : 'lucideTrendingDown'"
                        class="w-7 h-7"
                        [ngClass]="currentDecision.verdict === 'VALIDATED' ? 'text-emerald-600' : 'text-rose-600'"
                      ></ng-icon>
                    </div>
                    <div>
                      <h4 class="text-xl font-black"
                        [ngClass]="currentDecision.verdict === 'VALIDATED' ? 'text-emerald-900' : 'text-rose-900'"
                      >
                        {{ currentDecision.verdict === 'VALIDATED' ? 'Expérience validée !' : 'Expérience échouée' }}
                      </h4>
                      <p class="text-sm mt-1"
                        [ngClass]="currentDecision.verdict === 'VALIDATED' ? 'text-emerald-600' : 'text-rose-600'"
                      >
                        @if (lastEvaluationImprovement !== null) {
                          {{ lastEvaluationImprovement >= 0 ? '+' : '' }}{{ lastEvaluationImprovement }}% par rapport à la baseline
                        } @else if (currentDecision.result_value !== null && currentDecision.baseline_value) {
                          Résultat : {{ currentDecision.result_value }} (baseline : {{ currentDecision.baseline_value }})
                        } @else {
                          Résultat enregistré.
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Results Comparison -->
                @if (currentDecision.baseline_value !== null && currentDecision.result_value !== null) {
                  <div class="grid grid-cols-2 gap-4">
                    <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Avant</p>
                      <p class="text-2xl font-black text-slate-900">{{ formatBaseline(currentDecision.baseline_value, currentDecision.target_metric) }}</p>
                    </div>
                    <div class="p-4 rounded-2xl border text-center"
                      [ngClass]="currentDecision.verdict === 'VALIDATED' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'"
                    >
                      <p class="text-[10px] font-bold uppercase tracking-wider mb-1"
                        [ngClass]="currentDecision.verdict === 'VALIDATED' ? 'text-emerald-400' : 'text-rose-400'"
                      >Après</p>
                      <p class="text-2xl font-black"
                        [ngClass]="currentDecision.verdict === 'VALIDATED' ? 'text-emerald-600' : 'text-rose-600'"
                      >{{ formatBaseline(currentDecision.result_value, currentDecision.target_metric) }}</p>
                    </div>
                  </div>
                }

                <!-- Generate Next -->
                <button
                  (click)="onGenerateNext()"
                  [disabled]="isGenerating"
                  class="w-full flex items-center justify-center gap-3 px-8 py-4 text-base font-black text-white bg-slate-900 rounded-2xl hover:bg-indigo-600 transition-all shadow-lg shadow-slate-900/20 group"
                >
                  <ng-icon name="lucideSparkles" class="w-5 h-5 group-hover:rotate-12 transition-transform"></ng-icon>
                  Générer la prochaine décision
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Empty State: Generate First Decision -->
      @else {
        <div class="flex flex-col items-center justify-center min-h-[400px] bg-white border border-slate-200 rounded-3xl shadow-sm p-8 text-center relative overflow-hidden">
          <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=')] opacity-50"></div>

          <div class="relative z-10 w-24 h-24 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-8 shadow-inner transform -rotate-6 hover:rotate-0 transition-transform duration-500">
            <ng-icon name="lucideTarget" class="w-12 h-12 text-indigo-500"></ng-icon>
          </div>

          <h3 class="relative z-10 text-3xl font-black text-slate-900 mb-3 tracking-tight">
            Prêt à piloter votre chaîne ?
          </h3>
          <p class="relative z-10 text-slate-500 max-w-md mb-10 font-medium leading-relaxed">
            Nerra va analyser vos données et décider de votre prochaine expérience stratégique.
          </p>

          <button
            (click)="openContextPopup()"
            [disabled]="isGenerating"
            class="relative z-10 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-indigo-600 hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-slate-900/10 group"
          >
            <ng-icon name="lucideSparkles" class="w-5 h-5 group-hover:rotate-12 transition-transform"></ng-icon>
            Générer ma première décision
          </button>
        </div>
      }

      <!-- Stats Cards -->
      @if (tensionScore && tensionScore.totalDecisions > 0) {
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white border border-slate-200 rounded-2xl p-5 text-center">
            <p class="text-3xl font-black text-slate-900">{{ tensionScore.totalDecisions }}</p>
            <p class="text-xs font-bold text-slate-400 uppercase mt-1">Décisions</p>
          </div>
          <div class="bg-white border border-emerald-200 rounded-2xl p-5 text-center">
            <p class="text-3xl font-black text-emerald-600">{{ tensionScore.validatedCount }}</p>
            <p class="text-xs font-bold text-emerald-400 uppercase mt-1">Validées</p>
          </div>
          <div class="bg-white border border-rose-200 rounded-2xl p-5 text-center">
            <p class="text-3xl font-black text-rose-600">{{ tensionScore.failedCount }}</p>
            <p class="text-xs font-bold text-rose-400 uppercase mt-1">Échouées</p>
          </div>
          <div class="bg-white border border-slate-200 rounded-2xl p-5 text-center">
            <p class="text-3xl font-black text-slate-500">{{ tensionScore.skippedCount }}</p>
            <p class="text-xs font-bold text-slate-400 uppercase mt-1">Ignorées</p>
          </div>
        </div>
      }

      <!-- Decision History (last 5) -->
      @if (decisionHistory.length > 0) {
        <div class="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-100">
            <h3 class="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ng-icon name="lucideHistory" class="w-5 h-5 text-slate-400"></ng-icon>
              Historique récent
            </h3>
          </div>
          <div class="divide-y divide-slate-100">
            @for (decision of decisionHistory.slice(0, 5); track decision.id) {
              <div class="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors group cursor-pointer"
                (click)="viewDecision(decision)"
              >
                <!-- Verdict dot -->
                <div class="w-3 h-3 rounded-full shrink-0"
                  [ngClass]="{
                    'bg-emerald-500': decision.verdict === 'VALIDATED',
                    'bg-rose-500': decision.verdict === 'FAILED',
                    'bg-blue-500': decision.verdict === 'PENDING' && decision.accepted_at,
                    'bg-indigo-500 animate-pulse': decision.verdict === 'PENDING' && !decision.accepted_at,
                    'bg-slate-300': decision.verdict === 'SKIPPED'
                  }"
                ></div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-slate-900 truncate">{{ decision.hypothesis }}</p>
                  <p class="text-xs text-slate-500 mt-0.5">
                    {{ getExperimentLabel(decision.experiment_type) }} · {{ getMetricLabel(decision.target_metric) }}
                  </p>
                </div>

                <!-- Verdict badge -->
                <span class="px-2.5 py-1 rounded-md text-xs font-bold uppercase"
                  [ngClass]="{
                    'bg-emerald-50 text-emerald-700': decision.verdict === 'VALIDATED',
                    'bg-rose-50 text-rose-700': decision.verdict === 'FAILED',
                    'bg-blue-50 text-blue-700': decision.verdict === 'PENDING' && decision.accepted_at,
                    'bg-indigo-50 text-indigo-700': decision.verdict === 'PENDING' && !decision.accepted_at,
                    'bg-slate-100 text-slate-500': decision.verdict === 'SKIPPED'
                  }"
                >
                  @if (decision.verdict === 'PENDING' && decision.accepted_at) {
                    EN COURS
                  } @else {
                    {{ decision.verdict }}
                  }
                </span>

                <ng-icon name="lucideChevronRight" class="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors"></ng-icon>
              </div>
            }
          </div>
        </div>
      }

      <!-- Resisted Levers Table -->
      @if (tensionScore && tensionScore.resistedLevers.length > 0) {
        <div class="bg-white border-2 border-rose-200 rounded-3xl shadow-sm overflow-hidden">
          <div class="p-6 border-b border-rose-100 bg-rose-50/30">
            <h3 class="text-lg font-bold text-rose-900 tracking-tight flex items-center gap-2">
              <ng-icon name="lucideAlertTriangle" class="w-5 h-5 text-rose-500"></ng-icon>
              Leviers non utilisés (résistances confirmées)
            </h3>
            <p class="text-sm text-rose-600 mt-1">Ces leviers de croissance ont été identifiés mais refusés 3 fois.</p>
          </div>
          <div class="divide-y divide-rose-100">
            @for (lever of tensionScore.resistedLevers; track lever.created_at) {
              <div class="p-5 flex items-center gap-4">
                <div class="w-2 h-8 rounded-full bg-rose-400"></div>
                <div>
                  <p class="text-sm font-bold text-slate-900">{{ lever.hypothesis }}</p>
                  <p class="text-xs text-rose-500">{{ getExperimentLabel(lever.experiment_type) }}</p>
                </div>
              </div>
            }
          </div>
        </div>
      }

    </div>
  `,
})
export class DecisionComponent implements OnInit {
  isLoading = true;
  isGenerating = false;
  isActioning = false;
  showContextPopup = false;

  currentDecision: Decision | null = null;
  decisionHistory: Decision[] = [];
  tensionScore: TensionScore | null = null;
  modeInfo: ChannelModeInfo | null = null;

  resistanceMessage: string | null = null;
  resistanceLevel = 0;

  // Evaluation
  evaluationValue: number | null = null;
  lastEvaluationImprovement: number | null = null;

  // Workshop (atelier vidéo post-acceptation)
  workshopStep = 1;
  isLoadingWorkshop = false;
  titleSuggestions: string[] = [];
  titleReasoning = '';
  selectedTitle = '';
  customTitle = '';
  titleEvaluation: { score: number; feedback: string } | null = null;
  isEvaluatingTitle = false;

  // Concept workshop (idéation)
  conceptSuggestions: string[] = [];
  conceptReasoning = '';
  selectedConcept = '';
  customConcept = '';
  conceptEvaluation: { score: number; feedback: string } | null = null;
  isEvaluatingConcept = false;

  // Brainstorm workshop
  brainstormData: {
    scenes: string[];
    style: string;
    duration: string;
    musicDirection: string;
    hookSuggestion: string;
    refinedConcept: string;
  } | null = null;
  brainstormNotes = '';

  thumbnailBrief: {
    visualElements: string[];
    colorPalette: string[];
    textOverlay: string;
    composition: string;
    inspiration: string;
    generationPrompt: string;
    referencedVideos: { title: string; thumbnailUrl: string; views: number; engagement: string }[];
  } | null = null;

  uploadedThumbnailBase64: string | null = null;
  thumbnailEvaluation: { score: number; feedback: string } | null = null;
  isEvaluatingThumbnail = false;

  videoUrl = '';
  linkMessage = '';

  // État de découverte automatique
  discoveredVideos: any[] = [];
  isDiscoveringVideos = false;

  // Contexte utilisateur pour la popup
  userCtx: UserContext = {
    hasVideoInProgress: false,
    videoInProgressTitle: '',
    videoInProgressTopic: '',
    additionalNotes: '',
  };

  // Audit insights transmis via query params (depuis la page AI Insights)
  auditInsights: AuditInsights | null = null;

  private userId: string | null = null;
  private channelId: string | null = null;

  constructor(
    private decisionService: DecisionService,
    private supabase: SupabaseService,
    private route: ActivatedRoute,
  ) {}

  async ngOnInit() {
    try {
      // Récupérer les audit insights transmis via state (depuis AI Insights)
      const navState = history.state;
      if (navState?.auditInsights) {
        this.auditInsights = navState.auditInsights;
        console.log('[NERRA] Audit insights received from AI Insights page');
      }

      const profile = await this.supabase.getProfile();
      if (!profile?.youtube_channel_id) {
        this.isLoading = false;
        return;
      }

      this.userId = profile.id;
      this.channelId = profile.youtube_channel_id;

      // Récupérer le contexte utilisateur sauvegardé s'il existe
      const savedUserCtx = sessionStorage.getItem('nerra_user_ctx');
      if (savedUserCtx) {
        try {
          this.userCtx = JSON.parse(savedUserCtx);
        } catch (e) {
          console.error("Could not parse saved user context");
        }
      }

      await this.loadDashboardData();

      // Si on arrive depuis l'audit avec des insights, ouvrir directement la popup
      if (this.auditInsights && !this.currentDecision) {
        this.showContextPopup = true;
      } else {
        // Sinon, vérifier si l'utilisateur a déjà répondu dans la session courante
        const hasAnswered = sessionStorage.getItem('nerra_context_answered');
        if (!hasAnswered && (!this.decisionHistory || this.decisionHistory.length === 0)) {
           // Demander systématiquement s'il n'y a pas eu de réponse
           this.showContextPopup = true;
        }
      }
    } catch (err) {
      console.error('[NERRA] Init error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async loadDashboardData() {
    if (!this.userId || !this.channelId) return;

    try {
      // Charger en parallèle : mode, tension, historique
      const [modeInfo, tensionScore, history] = await Promise.all([
        this.decisionService.getChannelMode(this.userId, this.channelId),
        this.decisionService.getTensionScore(this.userId, this.channelId),
        this.decisionService.getHistory(this.userId, this.channelId),
      ]);

      this.modeInfo = modeInfo;
      this.tensionScore = tensionScore;
      this.decisionHistory = history;

      // Vérifier s'il y a une décision PENDING
      const pending = history.find((d) => d.verdict === 'PENDING');
      if (pending) {
        this.currentDecision = pending;
      } else {
        // Chercher la dernière décision évaluée pour l'afficher
        const lastEvaluated = history.find((d) => d.verdict === 'VALIDATED' || d.verdict === 'FAILED');
        if (lastEvaluated && !this.currentDecision) {
          this.currentDecision = lastEvaluated;
        }
      }
    } catch (err) {
      console.error('[NERRA] Load data error:', err);
    }
  }

  openContextPopup() {
    this.showContextPopup = true;
  }

  async confirmAndGenerate() {
    sessionStorage.setItem('nerra_context_answered', 'true');
    sessionStorage.setItem('nerra_user_ctx', JSON.stringify(this.userCtx));
    this.showContextPopup = false;
    await this.generateDecision();
  }

  async generateDecision() {
    if (!this.userId || !this.channelId) return;

    this.isGenerating = true;
    this.resistanceMessage = null;
    this.resistanceLevel = 0;
    this.lastEvaluationImprovement = null;

    try {
      // Passer le contexte utilisateur et les insights de l'audit
      const userContext: UserContext | undefined = this.userCtx.hasVideoInProgress || this.userCtx.additionalNotes
        ? this.userCtx
        : undefined;

      this.currentDecision = await this.decisionService.getNextDecision(
        this.userId,
        this.channelId,
        this.auditInsights || undefined,
        userContext,
      );
      // Refresh history
      this.decisionHistory = await this.decisionService.getHistory(
        this.userId,
        this.channelId,
      );
    } catch (err) {
      console.error('[NERRA] Generate error:', err);
      alert("Erreur lors de la génération. Le backend est-il lancé ?");
    } finally {
      this.isGenerating = false;
    }
  }

  async onAccept() {
    if (!this.currentDecision) return;

    this.isActioning = true;
    try {
      await this.decisionService.acceptDecision(this.currentDecision.id);
      this.currentDecision.accepted_at = new Date().toISOString();
      this.resistanceMessage = null;
      this.resistanceLevel = 0;
      this.evaluationValue = null;

      // Reset workshop state
      this.workshopStep = this.userCtx.hasVideoInProgress ? 3 : 1;
      this.conceptSuggestions = [];
      this.conceptReasoning = '';
      this.selectedConcept = '';
      this.customConcept = '';
      this.conceptEvaluation = null;
      this.brainstormData = null;
      this.brainstormNotes = '';
      this.titleSuggestions = [];
      this.titleReasoning = '';
      this.selectedTitle = '';
      this.customTitle = '';
      this.thumbnailBrief = null;
      this.videoUrl = '';
      this.linkMessage = '';

      // Refresh tout
      await this.loadDashboardData();
      // Mais garder la décision acceptée comme courante
      if (this.currentDecision) {
        const refreshed = this.decisionHistory.find((d) => d.id === this.currentDecision!.id);
        if (refreshed) {
          this.currentDecision = refreshed;
        }
      }

      if (this.workshopStep === 1) {
        this.loadConceptSuggestions();
      } else {
        this.loadTitleSuggestions();
      }
    } catch (err) {
      console.error('[NERRA] Accept error:', err);
    } finally {
      this.isActioning = false;
    }
  }

  async onReject() {
    if (!this.currentDecision) return;

    this.isActioning = true;
    try {
      const result: ResistanceResult = await this.decisionService.rejectDecision(
        this.currentDecision.id,
      );

      this.resistanceLevel = result.level;
      this.resistanceMessage = result.message;

      if (result.level === 3) {
        // Résistance confirmée — on retire la décision et on permet d'en générer une nouvelle
        this.currentDecision = null;
        await this.loadDashboardData();
      } else if (result.level === 1) {
        // 1er refus → générer une reformulation
        await this.generateDecision();
      }
    } catch (err) {
      console.error('[NERRA] Reject error:', err);
    } finally {
      this.isActioning = false;
    }
  }

  async onEvaluate() {
    if (!this.currentDecision || this.evaluationValue === null) return;

    this.isActioning = true;
    try {
      const result = await this.decisionService.evaluateDecision(
        this.currentDecision.id,
        this.evaluationValue,
      );

      this.lastEvaluationImprovement = result.improvement;

      // Mettre à jour la décision courante avec le verdict
      this.currentDecision.verdict = result.verdict;
      this.currentDecision.result_value = this.evaluationValue;

      // Refresh les données
      await this.loadDashboardData();
      // Garder la décision évaluée comme courante pour afficher le verdict
      const refreshed = this.decisionHistory.find((d) => d.id === this.currentDecision!.id);
      if (refreshed) {
        this.currentDecision = refreshed;
      }
    } catch (err) {
      console.error('[NERRA] Evaluate error:', err);
      alert("Erreur lors de l'évaluation.");
    } finally {
      this.isActioning = false;
    }
  }

  async onSkip() {
    if (!this.currentDecision) return;

    this.isActioning = true;
    try {
      // Marquer comme SKIPPED via reject 3 fois n'est pas idéal,
      // on utilise plutôt un appel direct
      await this.decisionService.rejectDecision(this.currentDecision.id);
      await this.decisionService.rejectDecision(this.currentDecision.id);
      await this.decisionService.rejectDecision(this.currentDecision.id);

      this.currentDecision = null;
      this.evaluationValue = null;
      this.lastEvaluationImprovement = null;
      await this.loadDashboardData();

      // Ouvrir le popup de contexte pour une nouvelle décision
      this.showContextPopup = true;
    } catch (err) {
      console.error('[NERRA] Skip error:', err);
    } finally {
      this.isActioning = false;
    }
  }

  async onGenerateNext() {
    this.currentDecision = null;
    this.evaluationValue = null;
    this.lastEvaluationImprovement = null;
    this.workshopStep = 1;
    this.titleSuggestions = [];
    this.thumbnailBrief = null;
    this.videoUrl = '';
    this.linkMessage = '';
    this.openContextPopup();
  }

  viewDecision(decision: Decision) {
    this.currentDecision = decision;
    this.evaluationValue = null;
    this.lastEvaluationImprovement = null;
    this.resistanceMessage = null;
    this.resistanceLevel = 0;
    // Reset workshop if viewing a different accepted decision
    if (decision.accepted_at && decision.verdict === 'PENDING') {
      this.workshopStep = 1;
      this.conceptSuggestions = [];
      this.titleSuggestions = [];
      this.thumbnailBrief = null;
      this.videoUrl = '';
      this.linkMessage = '';
      this.loadConceptSuggestions();
    }
  }

  // ─── Workshop Methods ─────────────────────────────────────

  async loadConceptSuggestions() {
    if (!this.currentDecision) return;

    this.isLoadingWorkshop = true;
    try {
      const result = await this.decisionService.generateConcepts(
        this.currentDecision.id,
        this.userCtx.additionalNotes || undefined,
      );
      this.conceptSuggestions = result.concepts;
      this.conceptReasoning = result.reasoning;
      // Pre-select first concept
      if (result.concepts.length > 0) {
        this.selectedConcept = result.concepts[0];
        this.customConcept = result.concepts[0];
      }
    } catch (err) {
      console.error('[NERRA] Concept suggestions error:', err);
    } finally {
      this.isLoadingWorkshop = false;
    }
  }

  confirmConcept() {
    // Transfer the selected concept into the user context topic
    this.userCtx.videoInProgressTopic = this.customConcept;
    this.conceptEvaluation = null;
    // Move to brainstorm step
    this.workshopStep = 2;
    this.loadBrainstorm();
  }

  async loadBrainstorm() {
    if (!this.currentDecision) return;

    this.isLoadingWorkshop = true;
    this.brainstormData = null;
    try {
      this.brainstormData = await this.decisionService.brainstormConcept(
        this.currentDecision.id,
        this.customConcept,
        this.brainstormNotes || undefined,
      );
    } catch (err) {
      console.error('[NERRA] Brainstorm error:', err);
    } finally {
      this.isLoadingWorkshop = false;
    }
  }

  reloadBrainstorm() {
    this.loadBrainstorm();
  }

  confirmBrainstorm() {
    // Enrich the topic with the refined concept for title generation
    if (this.brainstormData?.refinedConcept) {
      this.userCtx.videoInProgressTopic = this.brainstormData.refinedConcept;
    }
    this.workshopStep = 3;
    this.loadTitleSuggestions();
  }

  async evaluateConcept() {
    if (!this.currentDecision || !this.customConcept) return;

    this.isEvaluatingConcept = true;
    this.conceptEvaluation = null;

    try {
      this.conceptEvaluation = await this.decisionService.evaluateConcept(
        this.currentDecision.id,
        this.customConcept,
      );
    } catch (err) {
      console.error('[NERRA] Concept evaluation error:', err);
    } finally {
      this.isEvaluatingConcept = false;
    }
  }

  async loadTitleSuggestions() {
    if (!this.currentDecision) return;

    this.isLoadingWorkshop = true;
    try {
      const result = await this.decisionService.getTitleSuggestions(
        this.currentDecision.id,
        { topic: this.userCtx.videoInProgressTopic, notes: this.userCtx.additionalNotes }
      );
      this.titleSuggestions = result.titles;
      this.titleReasoning = result.reasoning;
      // Pre-select first title
      if (result.titles.length > 0) {
        this.selectedTitle = result.titles[0];
        this.customTitle = result.titles[0];
      }
    } catch (err) {
      console.error('[NERRA] Title suggestions error:', err);
    } finally {
      this.isLoadingWorkshop = false;
    }
  }

  async evaluateTitle() {
    if (!this.currentDecision || !this.customTitle) return;

    this.isEvaluatingTitle = true;
    this.titleEvaluation = null;

    try {
      this.titleEvaluation = await this.decisionService.evaluateTitle(
        this.currentDecision.id,
        this.customTitle,
        { topic: this.userCtx.videoInProgressTopic, notes: this.userCtx.additionalNotes }
      );
    } catch (err) {
      console.error('[NERRA] Title evaluation error:', err);
    } finally {
      this.isEvaluatingTitle = false;
    }
  }

  async confirmTitle() {
    if (!this.currentDecision || !this.customTitle) return;

    // Sauvegarder le titre choisi dans la décision
    this.currentDecision.video_title = this.customTitle;

    // Passer à l'étape 4 et charger le brief miniature
    this.workshopStep = 4;
    this.isLoadingWorkshop = true;
    try {
      this.thumbnailBrief = await this.decisionService.getThumbnailBrief(
        this.currentDecision.id,
        this.customTitle
      );
    } catch (err) {
      console.error('[NERRA] Thumbnail brief error:', err);
    } finally {
      this.isLoadingWorkshop = false;
    }
  }

  async onThumbnailSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("L'image est trop volumineuse (max 10 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      this.uploadedThumbnailBase64 = e.target?.result as string;
      await this.evaluateUploadedThumbnail();
    };
    reader.readAsDataURL(file);
  }

  async evaluateUploadedThumbnail() {
    if (!this.currentDecision || !this.uploadedThumbnailBase64) return;

    this.isEvaluatingThumbnail = true;
    this.thumbnailEvaluation = null;

    try {
      this.thumbnailEvaluation = await this.decisionService.evaluateThumbnail(
        this.currentDecision.id,
        this.uploadedThumbnailBase64
      );
    } catch (err) {
      console.error('[NERRA] Thumbnail evaluation error:', err);
      alert("Erreur lors de l'évaluation de la miniature.");
    } finally {
      this.isEvaluatingThumbnail = false;
    }
  }

  async discoverVideos() {
    if (!this.currentDecision) return;
    this.isDiscoveringVideos = true;
    this.discoveredVideos = [];
    try {
      this.discoveredVideos = await this.decisionService.discoverRecentVideos(this.currentDecision.id);
      console.log('[NERRA] Discovered videos:', this.discoveredVideos);
    } catch (err) {
      console.error('[NERRA] Video discovery error:', err);
    } finally {
      this.isDiscoveringVideos = false;
    }
  }

  async linkDiscoveredVideo(video: any) {
    if (!this.currentDecision) return;
    this.videoUrl = video.id;
    await this.onLinkVideo();
  }

  extractVideoId(url: string): string | null {
    // youtube.com/watch?v=XXX
    const match1 = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match1) return match1[1];
    // youtu.be/XXX
    const match2 = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match2) return match2[1];
    // youtube.com/shorts/XXX
    const match3 = url.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match3) return match3[1];
    // If it's already a video ID (11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
    return null;
  }

  async onLinkVideo() {
    if (!this.currentDecision || !this.videoUrl) return;

    const videoId = this.extractVideoId(this.videoUrl);
    if (!videoId) {
      this.linkMessage = 'Lien YouTube invalide. Formats acceptés : youtube.com/watch?v=..., youtu.be/..., ou un ID vidéo.';
      return;
    }

    this.isActioning = true;
    this.linkMessage = '';
    try {
      const result = await this.decisionService.linkVideo(
        this.currentDecision.id,
        videoId,
        this.currentDecision.video_title || undefined,
      );
      this.linkMessage = result.message;

      // Refresh to check if evaluation happened
      await this.loadDashboardData();
      const refreshed = this.decisionHistory.find((d) => d.id === this.currentDecision!.id);
      if (refreshed) {
        this.currentDecision = refreshed;
      }
    } catch (err) {
      console.error('[NERRA] Link video error:', err);
      this.linkMessage = 'Erreur lors de la liaison de la vidéo.';
    } finally {
      this.isActioning = false;
    }
  }

  getExperimentLabel(type: ExperimentType): string {
    return EXPERIMENT_LABELS[type] || type;
  }

  getMetricLabel(metric: string): string {
    return METRIC_LABELS[metric] || metric;
  }

  getMetricUnit(metric: string): string {
    switch (metric) {
      case 'engagement_rate':
      case 'ctr':
      case 'watch_time_30s':
        return '%';
      case 'views_7days':
      case 'avg_views':
        return 'vues';
      default:
        return '';
    }
  }

  getMetricPlaceholder(metric: string): string {
    switch (metric) {
      case 'engagement_rate':
        return 'Ex: 8.5';
      case 'ctr':
        return 'Ex: 4.2';
      case 'watch_time_30s':
        return 'Ex: 45';
      case 'views_7days':
      case 'avg_views':
        return 'Ex: 150';
      default:
        return 'Valeur mesurée';
    }
  }

  formatBaseline(value: number, metric: string): string {
    if (metric === 'engagement_rate') {
      return value.toFixed(2) + '%';
    }
    if (metric === 'ctr') {
      return value.toFixed(2) + '%';
    }
    if (metric === 'watch_time_30s') {
      // Si la valeur est < 1, c'est probablement un ratio (0.05 = 5%)
      if (value < 1) {
        return (value * 100).toFixed(1) + '%';
      }
      return value.toFixed(1) + '%';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k vues';
    }
    return Math.round(value).toLocaleString('fr-FR');
  }

  getBaselineContext(metric: string): string {
    switch (metric) {
      case 'engagement_rate':
        return 'Moyenne de vos 3 dernières vidéos';
      case 'ctr':
        return 'Taux de clic moyen récent';
      case 'watch_time_30s':
        return 'Rétention moyenne à 30s';
      case 'views_7days':
        return 'Moyenne de vos 3 dernières vidéos (7j)';
      case 'avg_views':
        return 'Moyenne de vos 3 dernières vidéos';
      default:
        return 'Basé sur votre historique récent';
    }
  }
}

