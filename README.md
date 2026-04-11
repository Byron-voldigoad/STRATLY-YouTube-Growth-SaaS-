# 🧠 NERRA — Système de Pilotage Stratégique YouTube

> **"L'utilisateur ne publie plus sans Nerra."**

**Nerra** est un système de pilotage stratégique pour les créateurs YouTube. Contrairement aux outils d'analytics classiques, Nerra ne se contente pas d'informer — **il décide**.

> ⚠️ **Ce projet est un logiciel propriétaire.** Toute reproduction, distribution ou utilisation non autorisée est strictement interdite. Voir la section [Licence](#-licence) ci-dessous.

---

## 🎯 Vision et Positionnement

Les créateurs YouTube sont inondés de données, mais continuent de prendre leurs décisions à l'intuition. Nerra résout ce problème en imposant des décisions stratégiques basées sur l'apprentissage continu et des données réelles.

### Sans vs Avec Nerra

| Aspect | Le créateur sans Nerra | Le créateur avec Nerra |
| :--- | :--- | :--- |
| **Prise de décision** | 5h de fouilles | Décision imposée en 30 secondes |
| **Optimisation** | À l'aveugle / intuition | Recommandations basées sur des données réelles |
| **Plan de croissance** | Au hasard des tendances | Protocole expérimental structuré |
| **Résultat** | Essais-erreurs non appris | Chaque vidéo améliore le système |

### Ce que Nerra n'est PAS

- ❌ Un simple dashboard d'analytics
- ❌ Un assistant IA générique (type ChatGPT)
- ❌ Un outil de suggestions ponctuelles (type vidIQ/TubeBuddy)

### Ce que Nerra EST

- ✅ Une **autorité** qui impose des décisions stratégiques
- ✅ Un système d'**apprentissage continu** calibré sur vos résultats réels
- ✅ Un moteur de **mémoire décisionnelle** unique à chaque créateur

---

## 🛡️ Moat Concurrentiel — La Mémoire Décisionnelle

L'avantage défensif de Nerra repose sur la **mémoire décisionnelle**. Contrairement à ChatGPT qui repart de zéro à chaque session, Nerra accumule un historique des décisions et de leurs résultats réels sur 6 mois pour calibrer ses conseils.

### Ce que l'utilisateur perd s'il se désabonne

- 🔒 L'historique interprété de ses expériences *(impossible à reconstituer ailleurs)*
- 🔒 Son score de confiance personnalisé *(nécessite 6 mois pour recalibrer)*
- 🔒 La continuité de l'apprentissage automatique
- 🔒 Son "tableau de résistance" *(leviers de croissance identifiés mais ignorés)*

---

## ⚗️ Système Décisionnel et Protocoles

**Principe fondateur :** Une expérience ne recommande pas une vidéo, mais définit une **hypothèse claire** avec une **variable unique**.

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

1. **🟡 Mode ASSISTED** *(Par défaut)* — Formule des hypothèses.
   - S'active si la chaîne a moins de 15 décisions vérifiées.
2. **🟢 Mode PILOT** — Impose une décision unique par semaine.
   - S'active après 3 décisions `VALIDÉES` consécutives.
   - *Downgrade automatique* vers ASSISTED après 2 échecs consécutifs.

---

## 🧲 Gestion de la Résistance et Rétention

Nerra utilise la **friction psychologique** pour créer une dépendance stratégique à long terme. Si l'utilisateur ignore une recommandation :

| Étape | Action de Nerra |
| :--- | :--- |
| **1er refus** | Reformule avec un angle différent |
| **2ème refus** | Affiche le `strategic_tension_score` en rouge |
| **3ème refus** | Marque le levier comme "résistance confirmée" → Tableau des **Leviers non utilisés** (culpabilité productive) |

---

## 🛠️ Stack Technique

| Couche | Technologie |
| :--- | :--- |
| **Frontend** | Angular 19, Tailwind CSS, Spartan UI |
| **Backend** | Node.js, Express, Genkit |
| **IA** | Llama 3.3 70B (via Groq), Google Vision AI (miniatures) |
| **Base de données** | Supabase (PostgreSQL) |
| **Données** | YouTube Data API v3 & Analytics API |

---

## 🔄 Protocole REBOOT (Chaînes Inactives > 90 jours)

Pour une chaîne dont le signal est "reset" par l'algorithme YouTube :

- **Semaine 1 :** Lancer 2 expériences rapides
  - 1 vidéo courte sur un sujet *trending*
  - 1 format classique ayant déjà fonctionné
- **Objectifs :** ≥ 200 vues (format court) ou ≥ 15% d'engagement (format classique)
- **Semaine 2 :** Reproduction du format gagnant, ou déclenchement du `TYPE_PIVOT` si échec total

---

## 🗺️ Roadmap — Phase 1

| # | Étape | Statut |
| :--- | :--- | :--- |
| 1 | Création de la table `decisions` dans Supabase (Fondation du moteur) | 🔲 |
| 2 | Développement de la fonction `evaluateDecision()` (Verdict + score) | 🔲 |
| 3 | Calcul du `strategic_tension_score` | 🔲 |
| 4 | Implémentation de l'UI "Ta prochaine décision" (Écran unique, pas de dashboard) | 🔲 |
| 5 | Renommage de **Stratly** en **Nerra** dans tout le codebase | ✅ |

---

## 👤 Auteur

**Tchango louis Miller** — Développeur & Créateur

- GitHub : [@Byron-voldigoad](https://github.com/Byron-voldigoad)

## 📄 Licence

**© 2026 Tchango louis Miller. Tous droits réservés.**

Ce logiciel et son code source sont la propriété exclusive de son auteur.

**Il est strictement interdit de :**
- Copier, reproduire ou dupliquer tout ou partie du code source
- Distribuer, publier ou partager le code sous quelque forme que ce soit
- Utiliser le code à des fins commerciales ou personnelles sans autorisation écrite
- Créer des œuvres dérivées basées sur ce code
- Utiliser ce projet comme base pour un autre produit ou service

Toute violation de ces termes pourra faire l'objet de poursuites légales.

Pour toute demande de licence ou d'utilisation, contactez l'auteur.
