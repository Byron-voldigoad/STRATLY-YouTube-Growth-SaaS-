# 🤖 Agent Context — Nerra

> Ce fichier fournit le contexte nécessaire aux agents IA pour travailler efficacement sur ce projet.

---

## 📋 Résumé du Projet

**Nerra** est un **système de pilotage stratégique** pour créateurs YouTube. Contrairement aux outils d'analytics classiques (vidIQ, TubeBuddy) ou aux assistants IA génériques (ChatGPT), Nerra ne se contente pas d'informer — **il décide**.

**Promesse produit :** *"L'utilisateur ne publie plus sans Nerra."*

### Positionnement Clé

- **Ce que Nerra n'est PAS :** Un dashboard d'analytics, un assistant IA générique, un outil de suggestions ponctuelles.
- **Ce que Nerra EST :** Une autorité qui impose des décisions stratégiques basées sur l'apprentissage continu et des données réelles.
- **Moat concurrentiel :** La **mémoire décisionnelle** — Nerra accumule un historique des décisions et de leurs résultats réels sur 6 mois pour calibrer ses conseils. Cette donnée est impossible à reconstituer ailleurs.

- **Auteur** : Tchango Louis Miller (@Byron-voldigoad)
- **Licence** : Propriétaire — Tous droits réservés © 2026
- **Langue principale du code** : Anglais (commentaires et UI en français)

---

## 🧠 Système Décisionnel (Cœur du Produit)

### Principe Fondateur

Une expérience ne recommande pas une vidéo, mais définit une **hypothèse claire** avec une **variable unique**.

> **Règle d'or :** 1 expérience = 1 seule variable modifiée. Nerra refuse les protocoles multi-variables.

### Les 7 types d'expériences standardisés

| Type | Variable | Métrique clé |
| :--- | :--- | :--- |
| `TYPE_HOOK` | Durée/style de l'intro | `watch_time_30s` |
| `TYPE_NICHE` | Sujet ciblé | `views_7days` |
| `TYPE_FORMAT` | Long vs Short | `engagement_rate` |
| `TYPE_TITRE` | Structure/mots-clés | `ctr` |
| `TYPE_MINIATURE` | Texte/contraste | `ctr` |
| `TYPE_FREQUENCE` | Rythme de publication | `avg_views` |
| `TYPE_PIVOT` | Direction stratégique | `engagement_rate` |

### Modes de Fonctionnement

1. **Mode ASSISTED** *(Par défaut)* — Formule des hypothèses. S'active si la chaîne a < 15 décisions vérifiées.
2. **Mode PILOT** — Impose une décision unique par semaine. S'active après 3 décisions `VALIDÉES` consécutives.
   - *Downgrade automatique* vers ASSISTED après 2 échecs consécutifs.

### Gestion de la Résistance

Si l'utilisateur ignore une recommandation :
- **1er refus :** Reformulation avec un angle différent.
- **2ème refus :** Affichage du `strategic_tension_score` en rouge.
- **3ème refus :** Levier marqué "résistance confirmée" → tableau des **Leviers non utilisés** (culpabilité productive).

### Protocole REBOOT (Chaînes Inactives > 90 jours)

- **Semaine 1 :** 2 expériences rapides (1 courte trending + 1 format classique ayant fonctionné).
- **Objectifs :** ≥ 200 vues (court) ou ≥ 15% engagement (classique).
- **Semaine 2 :** Reproduction du gagnant ou `TYPE_PIVOT` si échec total.

---

## 🏗️ Architecture

Le projet est organisé en **monorepo** avec deux sous-projets :

```
monthly-youtube-growth/
├── nerra/            # Frontend — Angular 19
├── backend/          # Backend — Node.js + Express 5 + Genkit
├── .env.local        # Variables d'environnement (Supabase, etc.)
├── *.sql             # Scripts de migration SQL (RLS, triggers)
└── agent.md          # Ce fichier
```

### Frontend (`/nerra`)

| Technologie       | Version / Détail                     |
|--------------------|--------------------------------------|
| Framework          | **Angular 19** (standalone components) |
| Styling            | **Tailwind CSS 3** + PostCSS        |
| UI Components      | **Spartan UI** (Spartan-ng brain + ui-core) |
| Icônes             | **ng-icons** (Lucide icons)          |
| Graphiques         | **ngx-charts** (@swimlane)           |
| Markdown           | **ngx-markdown** + marked            |
| Auth & DB          | **@supabase/supabase-js**            |
| Utilities          | class-variance-authority, clsx, tailwind-merge |
| TypeScript         | ~5.6                                  |

#### Structure Angular

```
nerra/src/app/
├── app.component.ts       # Composant racine
├── app.config.ts          # Configuration (providers)
├── app.routes.ts          # Routing principal
├── core/
│   ├── guards/            # Auth guards (authGuard, guestGuard)
│   └── services/          # Services injectables (auth, API, etc.)
├── features/
│   ├── auth/              # Login, Signup, Callback (OAuth)
│   ├── dashboard/         # Overview, AI Insights, Connect, Layout
│   └── landing/           # Landing page publique
└── shared/
    ├── components/        # Composants réutilisables
    └── ui/                # Composants UI primitifs (Spartan-based)
```

#### Routes

| Route                    | Composant                  | Guard       |
|--------------------------|----------------------------|-------------|
| `/`                      | LandingComponent           | —           |
| `/login`                 | LoginComponent             | guestGuard  |
| `/signup`                | SignupComponent            | guestGuard  |
| `/auth/callback`         | CallbackComponent          | —           |
| `/dashboard`             | DashboardLayoutComponent   | authGuard   |
| `/dashboard/ai-insights` | AiInsightsComponent        | authGuard   |
| `/dashboard/connect`     | ConnectComponent           | authGuard   |
| `/dashboard/connect/callback` | CallbackComponent     | authGuard   |

### Backend (`/backend`)

| Technologie   | Version / Détail                          |
|---------------|------------------------------------------|
| Runtime       | **Node.js** avec **tsx** (TypeScript)     |
| Framework     | **Express 5**                             |
| IA            | **Genkit** + Groq (Llama 3.3 70B via genkitx-openai) + Google Vision AI (miniatures) |
| Auth & DB     | **@supabase/supabase-js**                 |
| API YouTube   | **googleapis** (YouTube Data API v3 & Analytics API) |
| TypeScript    | ~5.9                                      |

#### Structure Backend

```
backend/src/
└── index.ts          # Point d'entrée unique (serveur Express + flows Genkit)
```

#### Scripts

| Commande            | Description                                  |
|---------------------|----------------------------------------------|
| `npm run dev`       | Lance le serveur en dev avec tsx              |
| `npm run build`     | Compile TypeScript                            |
| `npm start`         | Lance le build compilé                        |
| `npm run genkit:ui` | Lance Genkit avec son UI de debug             |

### Base de Données (Supabase)

- **PostgreSQL** hébergé sur Supabase
- **Row Level Security (RLS)** activé — les politiques sont définies dans les fichiers `.sql` à la racine
- **Supabase Auth** pour la gestion des utilisateurs
- **Google OAuth 2.0** pour la connexion YouTube
- **Table `decisions`** — Fondation du moteur décisionnel (stocke les hypothèses, résultats et scores)

---

## 🎨 Conventions de Design

### UI / UX

- **Design premium et moderne** : glassmorphism, gradients subtils, micro-animations
- **Dark mode** supporté comme thème principal
- **Typographie** : polices modernes (Inter, système)
- **Palette de couleurs** : dégradés violet/bleu harmonieux, pas de couleurs plates génériques
- **Pages d'auth** : layout split-screen (formulaire + panneau marketing avec mockup dashboard CSS)
- **Responsive** : mobile-first avec adaptations desktop
- **UI décisionnelle** : L'interface principale est un écran unique "Ta prochaine décision", PAS un dashboard classique

### Spartan UI

Les composants UI primitifs (boutons, inputs, dialogs, etc.) utilisent **Spartan UI** :
- Brain packages : `@spartan-ng/brain` (logique headless)
- UI packages : `@spartan-ng/ui-core` (styles)
- CVA (class-variance-authority) pour les variants de composants
- `clsx` + `tailwind-merge` pour la composition de classes

---

## 💻 Conventions de Code

### Angular

- **Standalone components** exclusivement (pas de NgModules)
- **Lazy loading** via `loadComponent` dans les routes
- **Signals** et APIs modernes d'Angular 19 préférés
- **Guards fonctionnels** (`CanActivateFn`)
- Nommage des fichiers : `kebab-case` (ex: `login.component.ts`)

### TypeScript

- **Strict mode** activé
- Pas de `any` sauf cas justifié
- Interfaces préférées aux types pour les objets
- Imports relatifs dans chaque sous-projet

### Styling

- **Tailwind CSS** comme système de styling principal
- Classes utilitaires avec `tailwind-merge` pour éviter les conflits
- Pas de CSS vanilla sauf pour les animations complexes ou le theming global

### Git

- `.gitignore` configuré pour exclure `node_modules/`, `dist/`, `.angular/`, `.env`
- Ne jamais commit les fichiers `.env` ou `.env.local`

---

## 🚀 Commandes de Développement

### Frontend

```bash
cd nerra
npm install        # Installer les dépendances
npm start          # ng serve — Lance le dev server (http://localhost:4200)
npm run build      # ng build — Build de production
npm test           # ng test — Lance les tests unitaires
```

### Backend

```bash
cd backend
npm install        # Installer les dépendances
npm run dev        # Lance le serveur Express en dev
npm run genkit:ui  # Lance Genkit avec UI de debug
```

---

## ⚠️ Points d'Attention

1. **Sécurité** : Les clés API (Supabase, Google, Groq) sont dans `.env.local` (racine) et `backend/.env`. Ne jamais les exposer.
2. **RLS** : Toute modification de schéma DB doit respecter les politiques RLS existantes. Tester les opérations avec différents rôles.
3. **OAuth Flow** : Le flux Google OAuth passe par Supabase Auth puis redirige vers `/auth/callback` côté frontend.
4. **Genkit Flows** : Les flows IA sont définis dans `backend/src/index.ts`. Ils utilisent Groq (Llama 3.3 70B) par défaut.
5. **Mémoire Décisionnelle** : Tout développement doit préserver l'intégrité de la table `decisions` et de l'historique des expériences. C'est le cœur du moat produit.
6. **Variable Unique** : Toute logique d'expérimentation doit enforcer la règle 1 expérience = 1 variable. Ne jamais permettre de protocoles multi-variables.
7. **Propriété intellectuelle** : Ce code est propriétaire. Ne jamais le publier ou le partager sans autorisation.

---

## 🗺️ Roadmap — Phase 1

| # | Étape | Statut |
| :--- | :--- | :--- |
| 1 | Création de la table `decisions` dans Supabase | 🔲 |
| 2 | Développement de `evaluateDecision()` (Verdict + score) | 🔲 |
| 3 | Calcul du `strategic_tension_score` | 🔲 |
| 4 | UI "Ta prochaine décision" (écran unique) | 🔲 |
| 5 | Renommage de Stratly en Nerra dans tout le codebase | ✅ |

---

## 📐 Patterns à Suivre

### Créer un nouveau composant Angular

```typescript
// feature-name.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-feature-name',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-name.component.html',
  styleUrl: './feature-name.component.css',
})
export class FeatureNameComponent {
  // Utiliser les signals Angular 19
}
```

### Ajouter une nouvelle route

1. Créer le composant dans `features/<nom>/`
2. Ajouter la route dans `app.routes.ts` avec `loadComponent`
3. Ajouter le guard approprié (`authGuard` ou `guestGuard`)

### Ajouter un nouveau flow Genkit

1. Définir le flow dans `backend/src/index.ts`
2. Exposer l'endpoint via Express
3. Appeler depuis le frontend via un service Angular
