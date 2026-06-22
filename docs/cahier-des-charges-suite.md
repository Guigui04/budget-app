# Cahier des charges — Suite & passation (handoff Codex)

> **But de ce document.** Permettre à un agent de code (OpenAI **Codex** ou autre)
> de **reprendre le projet `budget-app` (« Foyer ») sans contexte préalable** et de
> le mener jusqu'à la mise en production. Il décrit l'état actuel, l'architecture,
> les conventions à respecter, puis **chaque tâche restante** avec fichiers cibles,
> étapes et critères d'acceptation.
>
> Document de référence amont : `Downloads/cahier-des-charges-app-budget.md`
> (le brief initial, v1.1). Le présent document en est la **continuation**.

---

## 0. TL;DR pour l'agent repreneur

- **Stack** : React 19 + Vite + TypeScript (PWA) · Supabase (Postgres/Auth/RLS/Edge
  Functions Deno) · Enable Banking (AISP, lecture seule) · Vercel.
- **L'UI est complète et fonctionne déjà en MODE DÉMO** (dataset en mémoire, sans
  backend). Lancer : `npm install && npm run dev` → « Explorer en mode démo ».
- **Le backend (schéma, RLS, Edge Functions) est écrit mais JAMAIS exécuté en réel.**
  Aucun accès Supabase ni Enable Banking n'est encore disponible.
- **Bascule démo → réel automatique** : dès que `VITE_SUPABASE_URL` et
  `VITE_SUPABASE_ANON_KEY` sont définis, `src/lib/supabase.ts` exporte
  `isSupabaseConfigured = true` et toute la couche données (`src/data/hooks.ts`,
  variable `live`) interroge Supabase au lieu du mock. **Aucun changement d'UI requis.**
- **Reste à faire** : provisionner les accès (Phase 1), coder ~6 flux qui n'ont de
  sens qu'avec le vrai backend (Phase 2), polish (Phase 3), déployer (Phase 4).
- **Vérifier après chaque tâche** : `npm run build` (= `tsc -b && vite build`) doit
  passer sans erreur, et la console navigateur doit rester propre.

---

## 1. État actuel détaillé

### 1.1 Ce qui est FAIT ✅

| Réf | Fonction | État |
|-----|----------|------|
| F1 | Auth e-mail/mot de passe + foyer partagé (RLS, code d'invitation) | UI login OK · **onboarding foyer codé (T1), à valider en réel** |
| F2 | Connexion bancaire (Edge Function `bank-auth-start`, sélecteur de banque) | départ OK · **callback codé (T2), à valider SCA réelle** |
| F3 | Comptes & soldes (IBAN masqué, fraîcheur, consentement) | OK · **refresh manuel codé (T3), à valider en réel** |
| F4 | Transactions & catégorisation (règles + heuristique, dédup `external_id`) | OK |
| F5 | Budgets-enveloppes (suivi temps réel, alertes 80/100 %) | OK |
| F6 | Objectifs d'épargne (progression, épargne mensuelle nécessaire) | OK · **lien compte épargne codé (T6), à valider en réel** |
| F7 | Détection d'abonnements (Edge Function `detect-subscriptions`) | OK |
| F8 | Alertes + centre in-app + réglages | OK · **abonnement push réel codé (T4), à valider appareil/VAPID** |
| F9 | Tableau de bord & graphiques | OK |

- Design « modern fintech » : thèmes clair (Porcelain) / sombre (Obsidian) avec
  bascule, polices Clash Display + Satoshi, accents mint/coral/périwinkle.
- PWA : `manifest`, service worker (vite-plugin-pwa), handler Web Push
  (`public/push-sw.js`), icônes générées (`scripts/gen-icons.mjs`).
- Migrations SQL + 5 Edge Functions + abstraction `BankProvider` écrites.

### 1.2 Ce qui n'est PAS fait ❌

Voir Phases 1 → 4 ci-dessous. En résumé : aucun backend réel actif, déploiement,
repo git non commité, aucun test automatisé. Les flux T1 → T6 sont codés mais
restent à valider sur Supabase, Enable Banking, VAPID et appareils réels.

### 1.3 Avancement de reprise Codex

- **T1 — Onboarding foyer : codé.** La session réelle lit désormais `users` +
  `households`, passe en statut `onboarding` si `household_id` est absent, et la
  route `/bienvenue` permet de créer un foyer ou d'en rejoindre un via code
  d'invitation. Validation finale à faire sur un projet Supabase réel.
- **T3 — Rafraîchir maintenant : codé.** L'écran Comptes expose un bouton de
  synchronisation manuelle. En Supabase, l'appel `bank-sync` est limité au foyer
  du caller authentifié ; en cron service-role, la synchro globale reste possible.
- **T4 — Abonnement Web Push réel : codé côté PWA.** La permission déclenche
  `pushManager.subscribe(...)`, puis l'abonnement JSON est enregistré dans
  `users.push_subscription`. Validation finale à faire avec une clé VAPID réelle
  et un appareil compatible.
- **T2 — Callback bancaire : codé.** La fonction `bank-callback` finalise le SCA,
  crée la connexion bancaire, upsert les comptes et déclenche une première
  synchronisation limitée au foyer.
- **T5 — Suppression RGPD & profil : codé.** Les connexions bancaires peuvent être
  supprimées avec confirmation explicite ; comptes et transactions associés sont
  supprimés par cascade. Les noms utilisateur/foyer sont éditables dans Réglages.
- **T6 — Objectif lié à compte épargne : codé.** Les objectifs peuvent être liés à
  un compte épargne et `bank-sync` recale `current_amount` sur le solde.

### 1.4 Carte du code

```
budget-app/
├─ index.html                 # polices Fontshare, metas PWA/iOS
├─ vite.config.ts             # plugin PWA (manifest, workbox, importScripts push-sw)
├─ vercel.json                # SPA fallback + no-cache sw.js
├─ .env.example               # variables (front public + secrets serveur documentés)
├─ scripts/gen-icons.mjs      # génération PNG depuis SVG (sharp)
├─ public/                    # favicon.svg, push-sw.js, icons/*
├─ src/
│  ├─ main.tsx · App.tsx      # providers (React Query, Router), routes, garde Protected
│  ├─ types/index.ts          # types domaine (camelCase) alignés au schéma
│  ├─ lib/
│  │  ├─ supabase.ts          # client + isSupabaseConfigured  ← POINT DE BASCULE
│  │  ├─ format.ts            # EUR/FR, dates, maskIban, isStale, daysUntil
│  │  ├─ push.ts              # helpers Web Push (permission, iOS/standalone)
│  │  └─ bank/client.ts       # startBankAuth() côté PWA (invoke bank-auth-start)
│  ├─ store/                  # zustand : theme.ts, session.ts, prefs.ts
│  ├─ data/
│  │  ├─ demo.ts · demoStore.ts   # dataset + store mutable (mode démo)
│  │  ├─ selectors.ts         # calculs purs (enveloppes, breakdown, evolution…)
│  │  ├─ mappers.ts           # row Postgres (snake) → type domaine (camel)
│  │  └─ hooks.ts             # React Query : lecture/écriture, branche `live` vs démo
│  ├─ components/             # ui/ · charts/ · layout/ · TransactionRow
│  ├─ features/<domaine>/     # une page par domaine (+ sheets associées)
│  └─ styles/                 # tokens.css (2 thèmes) · global.css · pages.css
└─ supabase/
   ├─ config.toml             # verify_jwt par fonction
   ├─ migrations/             # 0001_schema · 0002_rls · 0003_bootstrap · 0004_cron
   └─ functions/
      ├─ _shared/             # cors · supabaseAdmin · bankProvider(interface)
      │                       #   · enableBanking(impl) · provider(factory) · categorize
      ├─ bank-auth-start/     # démarre le consentement (JWT signé serveur)
      ├─ bank-sync/           # synchro quotidienne (cron) + manuelle
      ├─ categorize/          # recatégorise les « à classer »
      ├─ detect-subscriptions/# détection des récurrents
      └─ alerts/              # évaluation budgets + envoi Web Push
```

---

## 2. Conventions à respecter (NE PAS dévier)

Issues des règles du dépôt utilisateur — un repreneur DOIT s'y conformer :

1. **Immutabilité** : jamais de mutation en place ; toujours retourner de
   nouveaux objets/tableaux (`{...x}`, `[...xs]`). Voir `src/data/demoStore.ts`.
2. **TypeScript strict** : types explicites sur les API publiques/props ; pas de
   `any` (utiliser `unknown` + narrowing) ; `interface` pour les formes d'objet,
   `type` pour les unions. Validation des entrées avec **Zod** aux frontières.
3. **Fichiers petits et ciblés** : 200–400 lignes typiques, 800 max ; un domaine
   par dossier `features/`. Beaucoup de petits fichiers > peu de gros.
4. **Sécurité (non négociable)** : aucun secret en dur ; la PWA ne détient QUE la
   clé `anon` + session ; clé privée Enable Banking + tokens **uniquement** dans
   les Edge Functions ; ne jamais logguer token/clé/donnée brute ; RLS active.
5. **Abstraction agrégateur** : tout accès banque passe par l'interface
   `BankProvider` (`supabase/functions/_shared/bankProvider.ts`) via la factory
   `getBankProvider()`. **Ne jamais appeler Enable Banking « en dur ».**
6. **i18n-ready** : libellés en français ; éviter de coder en dur des chaînes
   réutilisables hors d'un futur dictionnaire (cf. T9).
7. **Pas de `console.log`** en code de production.
8. **Style data layer** : l'UI ne parle qu'aux hooks de `src/data/hooks.ts`. Toute
   nouvelle lecture/écriture s'ajoute là, avec la double branche `live ? supabase : démo`.

**Definition of Done d'une tâche** : code typé + `npm run build` vert + console
propre + critères d'acceptation cochés + (si applicable) fonctionne en démo ET la
branche `live` est écrite pour Supabase.

---

## 3. PHASE 1 — Provisionner les accès (l'utilisateur n'en a aucun)

> L'utilisateur souhaite ces accès mais ne les a pas. Cette phase est en partie
> **manuelle (compte/KYC)** : Codex prépare tout (commandes, fichiers, doc) et
> guide l'utilisateur pour les étapes qui exigent une action humaine (création de
> compte, SCA bancaire).

### 1.1 Supabase
1. Créer un projet sur https://supabase.com (région UE — RGPD).
2. Récupérer : `Project URL`, clé `anon`, clé `service_role`.
3. Renseigner `.env` (copie de `.env.example`) :
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
4. Installer le CLI : `npm i -g supabase` ; `supabase link --project-ref <ref>`.

### 1.2 Enable Banking (AISP)
1. Créer une application sur https://enablebanking.com (console développeur).
2. Mode **« restricted production »** : déclarer ses **propres comptes** (CA,
   BoursoBank, Revolut) — pas de KYB entreprise. ⚠️ **Point à vérifier** : statut
   des comptes de la 2ᵉ personne (zone grise « comptes propres », cf. brief §12).
3. Générer la **paire de clés RSA** ; téléverser la clé publique, **garder la clé
   privée (PEM)** pour les secrets Supabase. Noter l'**Application ID**.
4. Configurer le `redirect_url` autorisé = `https://<app-vercel>/comptes`.

### 1.3 VAPID (Web Push)
1. Générer une paire VAPID : `npx web-push generate-vapid-keys`.
2. Clé publique → `VITE_VAPID_PUBLIC_KEY` (`.env`, front).
3. Clé privée → secret serveur (jamais dans le front).

### 1.4 Activer le backend
```bash
supabase db push                                  # migrations 0001 → 0005
supabase secrets set \
  ENABLE_BANKING_APP_ID=... \
  ENABLE_BANKING_PRIVATE_KEY="$(cat private.pem)" \
  VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:... \
  VITE_VAPID_PUBLIC_KEY=... \
  APP_URL=https://<app-vercel>
supabase functions deploy bank-auth-start bank-callback bank-sync categorize detect-subscriptions alerts
# Puis exécuter supabase/migrations/0004_cron.sql après création des secrets Vault
```
**Critère d'acceptation Phase 1** : un compte créé via Supabase Auth déclenche le
trigger `handle_new_user`, l'app charge depuis Supabase (plus le mock), et une
table vide ne casse aucun écran (états vides déjà gérés).

---

## 4. PHASE 2 — Flux manquants à coder

> Tous testables d'abord en démo (sauf appels réseau réels), puis branche `live`.

### T1 — Onboarding foyer (F1)
**Objectif** : à la 1re connexion d'un utilisateur réel sans `household_id`, lui
proposer de **créer un foyer** ou **rejoindre via un code d'invitation**.

- **Fichiers** : nouveau `src/features/onboarding/OnboardingPage.tsx` ;
  route `/bienvenue` dans `App.tsx` ; logique dans `src/store/session.ts`.
- **Étapes** :
  1. Dans `session.initialize()`, après auth, si `users.household_id` est `null`
     → `status = 'onboarding'` (ajouter cet état au store).
  2. `Protected` redirige `onboarding` → `/bienvenue`.
  3. UI : 2 actions — « Créer notre foyer » (champ nom → RPC `create_household`,
     qui retourne le `invite_code` à partager) ; « Rejoindre un foyer » (champ code
     → RPC `join_household`). Appels : `supabase.rpc('create_household', { p_name })`
     et `supabase.rpc('join_household', { p_code })` (fonctions déjà en base, cf.
     `0003_bootstrap.sql`).
  4. Afficher le code d'invitation après création (copie en 1 tap).
- **Critères d'acceptation** : les 2 utilisateurs rattachés au même foyer voient les
  mêmes données ; un foyer fraîchement créé a ses 13 catégories par défaut
  (`seed_default_categories`) ; RLS empêche tout accès croisé.

### T2 — Callback bancaire (F2)
**Objectif** : finaliser le consentement après le SCA et créer la connexion + comptes.

- **Fichiers** : nouvelle Edge Function `supabase/functions/bank-callback/index.ts` ;
  gestion du retour dans `src/features/accounts/AccountsPage.tsx`.
- **Flux** : `bank-auth-start` renvoie déjà une URL SCA avec un `state` =
  `householdId:userId:uuid`. La banque redirige vers `/comptes?code=...&state=...`.
- **Étapes** :
  1. Edge Function `bank-callback` (verify_jwt=true) : lit `{ code, state, aspspId }`,
     vérifie que `state` correspond au foyer du caller (`callerHousehold`), appelle
     `provider.createSession(code)` → `{ sessionId, accounts, consentExpiresAt }`,
     insère `bank_connections` (status `active`, `consent_expires_at`) puis upsert
     les `accounts`, et déclenche une 1re synchro (`bank-sync` ou inline) pour
     importer ~24 mois d'historique si dispo.
  2. Front : sur `/comptes`, si `?code` présent → `supabase.functions.invoke('bank-callback', …)`,
     nettoyer l'URL (`history.replaceState`), invalider les queries `accounts`/`connections`.
- **Critères d'acceptation** : après SCA, la banque apparaît dans `/comptes` avec ses
  comptes et soldes ; `consent_expires_at` ≈ +90 j ; aucune clé/secret côté front ;
  reconnexion d'une banque expirée fonctionne en 1 tap.

### T3 — Rafraîchir maintenant (F3 / brief §8)
**Objectif** : synchro manuelle ponctuelle à la demande.

- **Fichiers** : `src/features/accounts/AccountsPage.tsx` (bouton),
  `src/data/hooks.ts` (mutation `useManualSync`), `src/lib/bank/client.ts` (helper).
- **Étapes** : bouton « Rafraîchir » → `supabase.functions.invoke('bank-sync')` →
  invalider `accounts`/`transactions`/`alerts`. Indiquer l'état de chargement et le
  résultat. Respecter les limites d'appels (désactiver le bouton ~quelques minutes).
- **Critères d'acceptation** : nouvelles transactions importées sans doublon ; une
  recatégorisation manuelle antérieure n'est pas écrasée (déjà géré côté `bank-sync`).

### T4 — Abonnement Web Push réel (F8)
**Objectif** : passer de « permission accordée » à un **abonnement push enregistré**.

- **Fichiers** : `src/lib/push.ts`, `src/features/settings/SettingsPage.tsx`,
  `src/data/hooks.ts` (mutation `useSavePushSubscription`).
- **Étapes** : après `Notification.requestPermission() === 'granted'`,
  `registration.pushManager.subscribe({ userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(VITE_VAPID_PUBLIC_KEY) })`, puis
  enregistrer l'objet dans `users.push_subscription` (jsonb). L'envoi est déjà géré
  par `functions/alerts/index.ts` (web-push, VAPID). Gérer le cas iOS (`needs-install`
  déjà détecté) et l'écran d'onboarding iOS (exigence Apple).
- **Critères d'acceptation** : une alerte budget génère une notif sur appareil abonné ;
  pas de notif sans permission ; alertes toujours doublées in-app.

### T5 — Suppression RGPD & profil (brief §9)
**Objectif** : pouvoir supprimer une connexion bancaire **et toutes ses données**, et
éditer son nom d'affichage / le nom du foyer.

- **Fichiers** : `src/features/accounts/*` (action supprimer connexion),
  `src/features/settings/SettingsPage.tsx` (édition profil/foyer), `src/data/hooks.ts`.
- **Étapes** : suppression via `delete` sur `bank_connections` (les `accounts`/
  `transactions` cascadent — `on delete cascade`). Édition `users.display_name` /
  `households.name`. Confirmation explicite avant suppression.
- **Critères d'acceptation** : supprimer une connexion retire comptes + transactions
  associés ; aucune donnée orpheline ; pas de partage tiers.

### T6 — Objectif lié à un compte épargne (F6)
**Objectif** : si `goals.linked_account_id` est défini, mettre à jour
`current_amount` depuis le solde du compte à chaque synchro.

- **Fichiers** : `supabase/functions/bank-sync/index.ts` (après upsert comptes,
  recaler les goals liés), éventuellement `src/data/selectors.ts` côté affichage.
- **Critères d'acceptation** : un objectif lié reflète le solde du livret après synchro.

---

## 5. PHASE 3 — Polish / nice-to-have

| Réf | Tâche | État | Notes |
|-----|-------|------|-------|
| T7 | **Verrou PIN / biométrie** à l'ouverture | ✅ | Code PIN applicatif hashé PBKDF2 (`src/lib/pin.ts`), store `src/store/lock.ts` (verrou à l'ouverture + arrière-plan), `UnlockScreen`, réglage `PinSettings`. Biométrie WebAuthn possible en V2. |
| T8 | **« Perso » vs « commune »** sur une transaction | ❌ | brief §3/§12 — V2. Ajouter colonne `transactions.scope` + filtre. |
| T9 | **i18n** simple | ✅ | Dictionnaire typé `src/i18n/fr.ts` + hook `useT()` + `interpolate()`. Navigation migrée ; reste à étendre aux pages au fil de l'eau. |
| T10 | **Code-splitting** | ✅ | `React.lazy` par route + `Suspense` (`RouteFallback`) et `manualChunks` (charts/motion/vendor). Bundle d'entrée ~1011 Ko → ~239 Ko. |
| T11 | **Tests** | ✅ | Vitest + Testing Library : 33 tests (`format`, `selectors`, `mappers`, `pin`, `ProgressBar`). `npm test`. Playwright (parcours critiques) reste à ajouter. |
| T12 | **Multi-devises** | ✅ | `format.ts` : cache de formatteurs Intl ; montants par élément (transaction, solde, compte lié) dans leur devise ; totaux agrégés en EUR. |

> **Note revue T1→T6 (réel).** Bug corrigé : les écritures `budgets`/`goals` côté
> client n'envoyaient pas `household_id`, requis par la policy RLS
> (`with check household_id = current_household_id()`, aucun défaut en table) ;
> l'`onConflict` budget a aussi été aligné sur la contrainte
> `(household_id, category_id, period)`. À re-valider sur Supabase réel.

---

## 6. PHASE 4 — Déploiement & livraison

1. **Git** : initialiser proprement (repo déjà `git init`, non commité). Commits
   conventionnels (`feat:`, `fix:`…). Créer un repo GitHub **privé**.
2. **Vercel** : importer le repo, définir les variables `VITE_*` (build & prod).
   `vercel.json` gère déjà le fallback SPA. Vérifier HTTPS + URL privée partagée.
3. **Supabase** : Phase 1.4 (migrations, secrets, functions, cron).
4. **Audit PWA** : Lighthouse (installable, manifest valide, SW) ; tester les Web
   Push sur de **vrais appareils** iOS (≥ 16.4, PWA installée) et Android.
5. **Guide d'installation** « Ajouter à l'écran d'accueil » iOS + Android pour les
   2 utilisateurs (court doc ou écran d'aide in-app).

**Critère d'acceptation final** : les 2 membres installent la PWA, se connectent,
rattachent le même foyer, connectent leurs banques, voient soldes/transactions
catégorisés, budgets/objectifs/abonnements à jour, et reçoivent les alertes
(in-app + push). Lighthouse PWA ✔. Aucun secret exposé côté client.

---

## 7. Rappels de sécurité (bloquants)

- [ ] Aucun secret en dur (clé API, clé privée RSA, service_role) dans le front/repo.
- [ ] La PWA n'utilise que `anon` + session utilisateur.
- [ ] Signature JWT Enable Banking **uniquement** en Edge Function.
- [ ] RLS active sur **toutes** les tables, cloisonnement par `household_id`
      (helper `current_household_id()`), à re-tester après chaque nouvelle table.
- [ ] IBAN masqué à l'affichage (`maskIban`), données minimisées.
- [ ] Logs propres : pas de token/clé/transaction brute en clair.
- [ ] Consentement explicite avant connexion bancaire ; suppression possible (T5).

---

## 8. Démarrage rapide pour le repreneur

```bash
npm install
npm run dev          # mode démo, explorer l'UI existante
npm run build        # doit rester vert à chaque étape
```

Lire dans l'ordre : `README.md` → ce document → `src/lib/supabase.ts` (point de
bascule) → `src/data/hooks.ts` (couche données) → `supabase/functions/_shared/`
(abstraction banque). Puis attaquer **Phase 1**, puis **T1 → T6**, puis Phase 3/4.
