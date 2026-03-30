# 🤖 Agent Context — Stratly

> Ce fichier fournit le contexte nécessaire aux agents IA pour travailler efficacement sur ce projet.

---

## 📋 Résumé du Projet

**Stratly** est une plateforme SaaS d'analyse et de croissance pour créateurs YouTube, propulsée par l'intelligence artificielle. Elle permet aux créateurs de suivre leurs performances, obtenir des recommandations IA personnalisées, générer des idées de contenu optimisées et planifier leur calendrier éditorial.

- **Auteur** : Tchango Louis Miller (@Byron-voldigoad)
- **Licence** : Propriétaire — Tous droits réservés © 2026
- **Langue principale du code** : Anglais (commentaires et UI en français)

---

## 🏗️ Architecture

Le projet est organisé en **monorepo** avec deux sous-projets :

```
monthly-youtube-growth/
├── stratly/          # Frontend — Angular 19
├── backend/          # Backend — Node.js + Express 5 + Genkit
├── .env.local        # Variables d'environnement (Supabase, etc.)
├── *.sql             # Scripts de migration SQL (RLS, triggers)
└── agent.md          # Ce fichier
```

### Frontend (`/stratly`)

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
stratly/src/app/
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
| IA            | **Genkit** + Google Gemini + Groq (via genkitx-openai) |
| Auth & DB     | **@supabase/supabase-js**                 |
| API YouTube   | **googleapis** (YouTube Data API v3)      |
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

---

## 🎨 Conventions de Design

### UI / UX

- **Design premium et moderne** : glassmorphism, gradients subtils, micro-animations
- **Dark mode** supporté comme thème principal
- **Typographie** : polices modernes (Inter, système)
- **Palette de couleurs** : dégradés violet/bleu harmonieux, pas de couleurs plates génériques
- **Pages d'auth** : layout split-screen (formulaire + panneau marketing avec mockup dashboard CSS)
- **Responsive** : mobile-first avec adaptations desktop

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
cd stratly
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

1. **Sécurité** : Les clés API (Supabase, Google, Gemini, Groq) sont dans `.env.local` (racine) et `backend/.env`. Ne jamais les exposer.
2. **RLS** : Toute modification de schéma DB doit respecter les politiques RLS existantes. Tester les opérations avec différents rôles.
3. **OAuth Flow** : Le flux Google OAuth passe par Supabase Auth puis redirige vers `/auth/callback` côté frontend.
4. **Genkit Flows** : Les flows IA sont définis dans `backend/src/index.ts`. Ils utilisent Gemini par défaut avec fallback possible sur Groq.
5. **Propriété intellectuelle** : Ce code est propriétaire. Ne jamais le publier ou le partager sans autorisation.

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
