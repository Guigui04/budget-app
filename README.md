# Foyer — Budget partagé (PWA)

Application **PWA mobile-first** de gestion budgétaire pour un **couple** partageant un
budget commun. Agrégation bancaire DSP2 (lecture seule), budgets-enveloppes,
objectifs d'épargne, détection d'abonnements, alertes Web Push. Distribuée en
**privé** (hors stores).

> Implémente le cahier des charges v1.1. Stack : React + Vite + TypeScript ·
> Supabase (Postgres + Auth + RLS + Edge Functions) · Enable Banking (AISP) ·
> Vercel.
>
> 📋 **Reprise du projet / travail restant** :
> [`docs/cahier-des-charges-suite.md`](docs/cahier-des-charges-suite.md) — document
> de passation autonome (état, conventions, tâches T1→T12, déploiement) pour qu'un
> agent (Codex…) puisse reprendre sans contexte.

---

## 🚀 Démarrage rapide (mode démo)

Sans aucune clé, l'app tourne sur un **foyer de démonstration** (données en mémoire) —
parfait pour explorer toute l'UI.

```bash
npm install
npm run dev
```

Ouvrir l'URL affichée → « Explorer en mode démo ».

## 🔌 Brancher Supabase (données réelles)

Les CLI Supabase et Vercel sont installés localement dans le projet. Sur cette
machine, utilisez les wrappers PowerShell du dossier `scripts/` :

```powershell
.\scripts\supabase-cli.ps1 --version
.\scripts\vercel-cli.ps1 --version
```

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Copier `.env.example` → `.env` et renseigner :
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_VAPID_PUBLIC_KEY=...   # clé publique Web Push
   ```
3. Appliquer le schéma :
   ```bash
   .\scripts\supabase-cli.ps1 link --project-ref <ref>
   .\scripts\supabase-cli.ps1 db push            # migrations 0001 → 0005
   ```
4. Déposer les secrets serveur (jamais dans le front) :
   ```bash
   .\scripts\supabase-cli.ps1 secrets set \
     ENABLE_BANKING_APP_ID=... \
     ENABLE_BANKING_PRIVATE_KEY="$(cat private.pem)" \
     VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:vous@exemple.fr \
     APP_URL=https://votre-app.vercel.app
   ```
5. Déployer les Edge Functions :
   ```bash
   .\scripts\supabase-cli.ps1 functions deploy bank-auth-start bank-callback bank-sync categorize detect-subscriptions alerts
   ```
6. Planifier la synchro (cron) : exécuter `supabase/migrations/0004_cron.sql`
   après avoir créé les secrets Vault (voir l'en-tête du fichier).

Dès que `VITE_SUPABASE_URL` est présent, l'app bascule automatiquement du mode
démo vers Supabase — **aucun changement de code côté UI**.

## 📦 Build & déploiement (Vercel)

```bash
npm run build      # tsc + vite build + génération PWA (sw.js, manifest)
```

Déployer sur Vercel (URL privée partagée aux 2 membres). Renseigner les variables
`VITE_*` dans le projet Vercel. SPA fallback configuré dans `vercel.json`.

---

## 🏛️ Architecture

```
PWA (Vercel) ──HTTPS──► Supabase ──JWT signé──► Enable Banking (AISP)
  · UI budgets            · Postgres + RLS         · CA / Bourso / Revolut
  · lecture seule         · Auth (2 users)
  · service worker        · Edge Functions :
  · Web Push                bank-auth-start · bank-sync (cron)
                            categorize · detect-subscriptions · alerts
```

Principes :
- **La PWA ne contient aucun secret** — uniquement la clé `anon` + session utilisateur.
- Clé privée Enable Banking + tokens bancaires **uniquement** dans les Edge Functions.
- Signature JWT **côté serveur**.
- **RLS** sur toutes les tables, cloisonnement par `household_id`.
- Accès agrégateur derrière l'interface `BankProvider` → changer d'agrégateur
  (Powens, Bridge…) sans réécrire l'app (`supabase/functions/_shared/provider.ts`).

## 🗂️ Structure

```
src/
  features/        # une page par domaine (dashboard, transactions, budgets, …)
  components/      # ui/ (primitives), charts/, layout/ (coque, nav)
  data/            # hooks React Query, sélecteurs de calcul, mode démo, mappers
  lib/             # supabase, format (EUR/FR), bank/ (client), push
  store/           # zustand : session, thème (clair/sombre), préférences
  styles/          # design tokens (2 thèmes) + styles de pages
supabase/
  migrations/      # schéma, RLS, bootstrap foyer, cron
  functions/       # Edge Functions + _shared/ (BankProvider, catégorisation)
```

## ✅ Couverture du cahier des charges

| Réf | Fonction | État |
|-----|----------|------|
| F1 | Auth + foyer partagé (RLS, code d'invitation) | ✅ |
| F2 | Connexion bancaire (Edge Function + consentement) | ✅ |
| F3 | Comptes & soldes (IBAN masqué, fraîcheur) | ✅ |
| F4 | Transactions & catégorisation (règles + heuristique, dédup) | ✅ |
| F5 | Budgets-enveloppes (suivi, alertes 80/100 %) | ✅ |
| F6 | Objectifs d'épargne (progression, épargne mensuelle) | ✅ |
| F7 | Détection d'abonnements | ✅ |
| F8 | Alertes & Web Push + centre in-app + réglages | ✅ |
| F9 | Tableau de bord & graphiques | ✅ |

## 🎨 Design

« Modern fintech, confident » — thèmes **clair (Porcelain)** et **sombre (Obsidian)**
avec bascule. Typographie `Clash Display` (titres/wordmark) + `Satoshi` (UI + chiffres
tabulaires). Carte solde « statement » toujours en ink + halo mint (signature type
Apple Card / Monzo). Accents mint électrique / coral / périwinkle / ambre.
