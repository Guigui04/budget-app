# Cahier des charges — Module Patrimoine & Investissement

> Document fonctionnel et technique. Objectif : faire du module Patrimoine une
> brique **réellement connectée** (vraies positions, valorisées automatiquement),
> et non un simple formulaire de saisie manuelle.

---

## 1. Contexte & constat

La v1 du module (livrée en itération 1) affiche une valeur nette, une répartition
et des positions, mais **les positions sont saisies à la main et reliées à rien** :
- on peut entrer n'importe quel montant, aucune source de vérité ;
- les cours « réels » (Twelve Data/CoinGecko) ne s'appliquent qu'à des lignes
  qu'on a soi-même déclarées ;
- aucune réconciliation avec le vrai portefeuille (PEA, assurance-vie, CTO…).

**Correction d'une hypothèse initiale erronée** : l'agrégation de comptes
d'investissement n'est *pas* impossible. Le **PSD2 (Enable Banking)** ne la couvre
pas, mais des agrégateurs patrimoniaux — **Powens (ex-Budget Insight)**, qui
équipe Finary — agrègent réellement PEA, assurance-vie, PER, CTO et capitalisation
via leurs propres connecteurs, au-delà du PSD2. La saisie manuelle doit donc
devenir un **filet** (immobilier physique, actifs non couverts), pas le cœur.

**Résultat visé** : l'utilisateur connecte ses comptes d'investissement comme il
connecte sa banque, et voit son patrimoine réel se valoriser tout seul.

---

## 2. Vision & objectifs produit

> « Je connecte mes comptes une fois, et je vois la valeur réelle de tout mon
> patrimoine évoluer en temps réel, sans rien ressaisir. »

Objectifs mesurables :
1. **≥ 80 %** de la valeur patrimoniale provient de sources connectées (agrégées
   ou cours de marché live), pas de la saisie manuelle.
2. Une position agrégée affiche : valorisation, prix de revient, **+/- value
   latente** (€ et %), performance, allocation — sans saisie.
3. Mise à jour automatique quotidienne ; rafraîchissement manuel à la demande.
4. Saisie manuelle **assistée** (recherche ISIN, cours auto) réservée à l'immo
   et aux actifs hors périmètre.

---

## 3. Personae & cas d'usage

- **L'investisseur DIY** (PEA + CTO + crypto) : veut une vue consolidée temps réel,
  performance, allocation, +/- value.
- **Le prudent** (livrets + assurance-vie + immo) : veut surtout la valeur nette
  et la progression vers ses objectifs.
- **Le foyer** : deux personnes, plusieurs enveloppes, vue commune (le module
  reste cloisonné par `household_id`).

---

## 4. Principes directeurs

1. **Connecté par défaut, manuel par exception.**
2. **Source de vérité unique** : chaque ligne porte sa provenance
   (`source = aggregated | live_quote | manual`).
3. **Aucune écriture inventée** : une valeur agrégée n'est jamais modifiable à la
   main (on peut la masquer, pas la falsifier).
4. **Anti-double-comptage** : un actif agrégé ne doit jamais être compté deux fois
   (ex. livret déjà vu côté banque).
5. **Réversibilité & RGPD** : déconnexion = purge des données de la source.
6. **Dégradation gracieuse** : si un agrégateur tombe, l'app reste lisible (dernière
   valeur connue + horodatage).

---

## 5. Architecture des sources de données (décision centrale)

Quatre sources complémentaires, par ordre de fiabilité :

### A. Agrégation patrimoniale — **Powens « Wealth »** (recommandé, cœur)
Connecte CTO, PEA, assurance-vie, PER, capitalisation. Fournit par ligne :
`code`/`code_type` (ISIN), `label`, `quantity`, `unitvalue`, `unitprice`,
`valuation`, `diff`/`diff_percent` (+/- value), `asset_category`, `srri` (risque),
`performance_1/3/5_years`, `vdate`, historique. Comptes : `valuation`, `diff`.
- **Couverture** : 300+ établissements FR (réf. Finary).
- **Pas d'agrément requis** côté app : Powens est l'agrégateur ; on consomme l'API.
- **Coût** : offre entreprise (contrat + DPA, pas de palier gratuit) → **décision
  budgétaire à prendre**.
- **Alternatives** : **Bridge (Bankin')** — fort sur le bancaire, couverture
  investissement plus limitée ; **Plaid Investments** — faible en France. → Powens
  reste le meilleur choix patrimoine FR.

### B. Cours de marché temps réel — **Twelve Data + CoinGecko** (déjà en place)
Pour valoriser les actifs **cotés saisis manuellement** (ex. titres détenus chez
un courteur non agrégé) et enrichir les lignes agrégées sans cours frais.
- Actions/ETF Euronext : Twelve Data. Crypto : CoinGecko. Cache `market_quotes`.

### C. Crypto — API exchange en lecture seule ou adresse on-chain
Powens ne couvre pas la crypto. Options :
- **Clé API exchange en lecture seule** (Binance, Coinbase, Kraken) → soldes réels ;
- **Adresse publique on-chain** (BTC/ETH) → soldes via explorateur ;
- À défaut : **quantité saisie + cours CoinGecko** (semi-connecté).

### D. Saisie manuelle **assistée** — filet
Pour l'immobilier physique, l'or, les actifs hors périmètre. Assistée par :
recherche ISIN/symbole (cours auto), estimation immo (saisie + révision périodique),
liaison à un compte agrégé pour les livrets.

**Recommandation de séquencement** (pour livrer de la valeur sans bloquer sur le
contrat Powens) :
1. **Maintenant** : durcir B + C + D (cours live propres, crypto semi-connectée,
   saisie assistée) → déjà « vraie donnée » sur le coté/crypto.
2. **Dès contrat signé** : brancher A (Powens) → le module devient pleinement
   connecté ; la saisie manuelle bascule en exception.

---

## 6. Périmètre fonctionnel détaillé

### EPIC 1 — Connexion d'un compte d'investissement
- **US1.1** Choisir un établissement (liste Powens, recherche).
- **US1.2** S'authentifier via la **webview Powens** (Connect) — l'app ne voit
  jamais les identifiants.
- **US1.3** Au retour, créer une `wealth_connection` + importer comptes & positions.
- **US1.4** Gérer le consentement (durée, renouvellement, expiration → alerte).
- **US1.5** Déconnecter une source → purge des comptes/positions liés.

### EPIC 2 — Synchronisation
- **US2.1** Sync automatique quotidienne (cron) de toutes les connexions actives.
- **US2.2** Rafraîchissement manuel (« Mettre à jour ») avec état (en cours/maj/erreur).
- **US2.3** Conserver la **dernière valeur connue** + horodatage en cas d'échec.
- **US2.4** Historiser chaque sync (point de valorisation par jour) pour les courbes.

### EPIC 3 — Vue patrimoine consolidé
- **US3.1** Valeur nette = banques (PSD2) + comptes agrégés + cours live + manuel,
  **sans double-comptage**.
- **US3.2** Variation du jour (€ et %) sur la part cotée.
- **US3.3** Carte par enveloppe (PEA, AV, PER, CTO, crypto, immo, livrets).

### EPIC 4 — Détail d'une position
- **US4.1** Valorisation, quantité, PRU, **+/- value latente** (€ / %).
- **US4.2** Performance 1 an / 3 ans / 5 ans (si fournie), risque (SRRI).
- **US4.3** ISIN, classe d'actif, devise, source (badge agrégé/cours/manuel).
- **US4.4** Mini-historique (sparkline) depuis l'agrégateur ou les cours.

### EPIC 5 — Répartition & analyse
- **US5.1** Donut par **classe d'actif** (actions, obligations, fonds €, SCPI, crypto, liquidités).
- **US5.2** Répartition par **enveloppe fiscale** et par **devise**.
- **US5.3** (avancé) Par **zone géographique** / **secteur** via référentiel ISIN.
- **US5.4** Indicateur de **diversification** simple.

### EPIC 6 — Performance dans le temps
- **US6.1** Courbe de valeur nette (jour/mois/an) à partir des snapshots.
- **US6.2** Performance **pondérée** (TWR) vs **versements** (money-weighted), pour
  distinguer apport et performance marché.
- **US6.3** Comparaison vs un indice de référence (ex. MSCI World) — optionnel.

### EPIC 7 — Saisie manuelle assistée (filet)
- **US7.1** Ajouter un actif coté : recherche symbole → cours auto (déjà en place).
- **US7.2** Ajouter un bien immobilier : valeur + dette éventuelle (LTV) → valeur nette.
- **US7.3** Lier un livret à un compte bancaire agrégé (valeur = solde, pas de doublon).
- **US7.4** Marquer une ligne agrégée comme « masquée » (exclue des totaux) sans la supprimer.

### EPIC 8 — Crypto
- **US8.1** Connecter un exchange via clé API **lecture seule** (soldes réels).
- **US8.2** Suivre une **adresse publique** (on-chain).
- **US8.3** À défaut, quantité + cours CoinGecko.

### EPIC 9 — Objectifs adossés au patrimoine
- **US9.1** Adosser un objectif à une enveloppe/position (ex. « Retraite = PER + AV »).
- **US9.2** Projection d'atteinte intégrant la performance réelle.

### EPIC 10 — Alertes patrimoine
- **US10.1** Variation forte d'une ligne/jour (seuil configurable).
- **US10.2** Franchissement d'un seuil de valeur nette.
- **US10.3** Consentement agrégateur bientôt expiré.

---

## 7. Modèle de données (cible)

> Le schéma actuel (`investment_holdings`, `market_quotes`) est conservé et
> étendu. Toutes les tables restent cloisonnées par `household_id` (RLS).

- **`wealth_connections`** — une connexion à un agrégateur.
  `id, household_id, owner_user_id, provider ('powens'|'manual'|'exchange'),
   external_connection_id, institution_name, status (active|expired|error),
   consent_expires_at, last_sync_at, created_at`.
- **`wealth_accounts`** — un compte agrégé (enveloppe).
  `id, household_id, connection_id, external_account_id, name,
   envelope (PEA|AV|PER|CTO|capitalisation|crypto|livret|autre),
   currency, valuation, valuation_diff, valuation_diff_pct, balance_updated_at`.
- **`investment_holdings`** (refonte) — une ligne / position.
  Ajouts : `account_id (→ wealth_accounts, null si manuel)`, `isin`, `code_type`,
  `unit_value`, `unit_price`, `valuation`, `diff`, `diff_pct`, `asset_category`,
  `srri`, `perf_1y/3y/5y`, `source (aggregated|live_quote|manual)`, `vdate`,
  `is_hidden`. (Conserve `kind, symbol, name, quantity, cost_basis, envelope,
  manual_value, linked_account_id`.)
- **`holding_snapshots`** — historique de valorisation pour les courbes.
  `id, household_id, holding_id (null = niveau compte/global), as_of, value`.
- **`securities`** (cache référentiel) — `isin, name, asset_class, sector,
  region, currency`.
- **`market_quotes`** (déjà créée) — cache cours cotés.
- **`fx_rates`** — taux de change pour le multi-devises (`base, quote, rate, as_of`).

---

## 8. Parcours utilisateur clés

**Connexion** : Patrimoine → « Connecter un compte » → choix établissement →
webview Powens (auth bancaire) → retour app → spinner « Import en cours » →
comptes & positions affichés avec badge « Synchronisé ».

**Synchro** : bandeau « Mis à jour il y a 2 h » → bouton refresh → états visibles →
en cas d'échec, valeur grisée + « dernière valeur connue ».

**Ajout manuel** : « Ajouter » → type d'actif → si coté : recherche + cours auto ;
si immo : valeur + dette ; si livret : liaison compte. La valeur reste éditable
uniquement pour le manuel.

---

## 9. Intégrations techniques

- **Powens** : Edge Functions dédiées (mêmes patterns que `bank-*`) :
  - `wealth-connect-start` → crée une session Connect, renvoie l'URL webview.
  - `wealth-callback` → échange le code, stocke `external_connection_id`.
  - `wealth-sync` → `GET /users/me/connections/{id}/investments` + `/accounts`,
    mappe vers `wealth_accounts` / `investment_holdings`, écrit un `holding_snapshot`.
  - Secrets serveur : `POWENS_CLIENT_ID`, `POWENS_CLIENT_SECRET` (jamais côté PWA).
  - Tokens utilisateur **chiffrés au repos**.
- **Cours cotés** : fonction `quotes` (déjà livrée) — Twelve Data + CoinGecko, cache.
- **Crypto exchange** : fonction `crypto-sync` (clé API lecture seule chiffrée) — v2.
- **FX** : source de taux quotidienne (ex. exchangerate.host/ECB) → table `fx_rates`.
- **Cron** : étendre `0004_cron.sql` pour la sync patrimoniale quotidienne.

---

## 10. Exigences non-fonctionnelles

- **Sécurité** : RLS stricte par `household_id` ; secrets/clés API uniquement côté
  Edge Functions ; tokens agrégateur chiffrés ; aucun identifiant bancaire stocké.
- **RGPD** : consentement explicite à la connexion ; finalité affichée ; durée de
  conservation ; **droit à l'effacement** (déconnexion = purge) ; DPA signé avec
  l'agrégateur ; registre des traitements à jour.
- **Performance** : sync asynchrone (jamais bloquante UI) ; valorisation
  déterministe côté sélecteurs purs ; cache cours 15 min.
- **Disponibilité** : tolérance aux pannes agrégateur (dernière valeur connue).
- **Observabilité** : journaliser chaque sync (succès/échec, durée, nb lignes).
- **Coût** : modéliser le coût Powens (par connexion/refresh) avant le Go.

---

## 11. Contraintes réglementaires

- L'app **n'a pas besoin d'agrément** AISP pour l'investissement : Powens est le
  prestataire agréé, l'app est cliente de son API (modèle « agent »/intégrateur).
- **Contrat + DPA** obligatoires avec l'agrégateur ; mentions de consentement et
  d'information (DSP2 / hors-DSP2) à intégrer au parcours.
- Pas de conseil en investissement (sinon statut CIF) : le module **informe**, il
  ne **recommande** pas. Le simulateur reste pédagogique, sans préconisation
  personnalisée.

---

## 12. Lotissement / roadmap de livraison

- **Lot 0 — Refonte du socle (sans coût externe)** : étendre le modèle de données
  (`source`, ISIN, snapshots), badges de provenance, anti-double-comptage robuste,
  saisie manuelle assistée. *Rend la v1 honnête immédiatement.*
- **Lot 1 — Cours live durcis** : déployer `quotes` en prod + clé Twelve Data,
  valorisation live des cotés manuels, historique via snapshots, courbe de valeur nette.
- **Lot 2 — Agrégation Powens** : Edge Functions connect/callback/sync, import réel
  PEA/AV/PER/CTO, +/- value & perf réelles. *Le module devient pleinement connecté.*
- **Lot 3 — Analyse avancée** : allocation classe/secteur/zone/devise, TWR vs MWR,
  multi-devises (FX), comparaison indice.
- **Lot 4 — Crypto connectée & objectifs patrimoniaux** : exchange read-only /
  on-chain ; objectifs adossés ; alertes patrimoine.

---

## 13. Critères d'acceptation (extraits, testables)

- **Lot 0** : toute position porte un badge de source ; une ligne agrégée n'est pas
  éditable ; la valeur nette ne double-compte aucun actif lié à un compte.
- **Lot 1** : une position cotée affiche un cours daté < 15 min et une variation du
  jour ; la courbe de valeur nette se construit à partir des snapshots.
- **Lot 2** : après connexion d'un PEA réel, les lignes apparaissent avec
  valorisation, PRU et +/- value **sans saisie** ; un refresh met à jour les valeurs ;
  une déconnexion purge les données de la source.
- **Lot 3** : la somme des allocations = 100 % ; les montants multi-devises sont
  convertis au taux du jour.

---

## 14. Risques & décisions ouvertes

1. **Budget Powens** (offre entreprise) — Go/No-Go à arbitrer. Sans Powens, on
   reste à « cours live + saisie assistée + crypto semi-connectée » (déjà mieux que
   la v1, mais pas l'agrégation PEA/AV).
2. **Choix agrégateur** : Powens (patrimoine, recommandé) vs Bridge (bancaire+) —
   à confirmer selon couverture/devis.
3. **Crypto** : exchange read-only vs on-chain vs manuel — selon effort souhaité.
4. **Profondeur d'analyse** (secteur/zone) : dépend de la dispo d'un référentiel ISIN.

---

## 15. Annexe — Mapping Powens → modèle interne

| Powens (investment) | Interne (`investment_holdings`) |
|---|---|
| `code` (ISIN) / `code_type` | `isin` / `code_type` |
| `label` | `name` |
| `quantity` | `quantity` |
| `unitvalue` / `unitprice` | `unit_value` / `unit_price` |
| `valuation` | `valuation` |
| `diff` / `diff_percent` | `diff` / `diff_pct` |
| `asset_category` | `asset_category` |
| `srri`, `performance_1/3/5_years` | `srri`, `perf_1y/3y/5y` |
| `vdate` / `last_update` | `vdate` / `updated_at` |
| compte `valuation` / `diff` | `wealth_accounts.valuation` / `valuation_diff` |
