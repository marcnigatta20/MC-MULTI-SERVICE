# MC Barber Management

Plateforme interne de gestion financière pour barber shop.

> **Aucun paiement en ligne** — MonCash, NatCash, Stripe, etc. interdits. Tous les paiements sont enregistrés manuellement après encaissement physique au comptoir.

---

## 1. Installation de Node.js

Installez [Node.js 18+ LTS](https://nodejs.org/). Vérifiez :

```bash
node -v   # v18+
npm -v
```

## 2. Installation des dépendances

```bash
git clone <votre-repo>
cd mc-barber
npm install
```

## 3. Configuration Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Notez l'URL du projet et les clés API (Settings → API)

## 4. Configuration PostgreSQL

Supabase utilise PostgreSQL. Les migrations SQL dans `supabase/migrations/` créent le schéma complet.

## 5. Variables `.env`

```bash
cp .env.example .env.local
```

Remplissez `.env.local` :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Ne commitez **jamais** `.env.local`. Seul `.env.example` est versionné.

## 6. Création des tables

Dans Supabase → **SQL Editor**, exécutez **dans l'ordre** :

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_historical_pricing.sql`
3. `supabase/migrations/003_expense_categories_audit.sql`
4. `supabase/migrations/004_rls_hardening.sql`

## 7. Configuration RLS (Row Level Security)

La migration `004_rls_hardening.sql` configure :

| Rôle | Accès |
|------|-------|
| **ADMIN** | Accès complet (CRUD sauf DELETE transactions/logs) |
| **CAISSIERE** | Ses transactions, caisse, ventes, dépenses |
| **BARBER** | Uniquement ses propres données |
| **COMPTABLE** | Lecture financière (transactions, rapports, audit) |

La sécurité est appliquée à **3 niveaux** :
- PostgreSQL RLS (Supabase)
- Middleware Next.js + `lib/permissions.ts`
- Validation Zod dans les Server Actions

## 8. Seed de données (développement)

1. Créez les utilisateurs Auth :
   - `admin@mcbarber.local` / `Admin123!` — metadata `{ "full_name": "Administrateur", "role": "ADMIN" }`
   - `cashier@mcbarber.local` / `Cashier123!` — metadata `{ "full_name": "Marie Caissière", "role": "CAISSIERE" }`

2. Exécutez `supabase/seed.sql` — crée Jean, Marc, David, services, transactions fictives.

> **NE PAS utiliser ces comptes en production.**

## 9. Lancement du projet

```bash
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## 10. Build production

```bash
npm run build
npm run start
```

---

## Commandes

| Commande | Description |
|----------|-------------|
| `npm install` | Installer les dépendances |
| `npm run dev` | Développement |
| `npm run build` | Build production |
| `npm run start` | Démarrer en production |
| `npm run test` | Tests unitaires (formules financières) |
| `npm run lint` | ESLint |

---

## Règles financières

1. Paiement uniquement au comptoir (Espèces / Autre comptoir)
2. Commission figée à la création (ex. 1 000 HTG × 40 % = 400 barber + 600 MC)
3. Transactions jamais supprimées — annulation via statut `CANCELLED`
4. Montants en **HTG** via `formatCurrency()`
5. Calculs en centimes pour éviter les erreurs flottantes
6. Journal d'audit pour toutes les opérations importantes

---

## Structure

```
app/           Pages Next.js
components/    UI réutilisable
lib/           Auth, permissions, validations, actions
services/      Logique métier + Supabase
supabase/      Migrations SQL + seed
utils/         Finance, PDF
```

## Navigation par rôle

- **Admin** : Dashboard, Transactions, Barbiers, Services, Caisse, Commissions, Paiements barbiers, Dépenses, Rapports, Performance, Utilisateurs, Journal d'activité, Paramètres
- **Caissière** : Dashboard, Nouvelle vente, Transactions, Ma caisse, Reçus, Dépenses autorisées
- **Barber** : Mon dashboard, Mes services, Mes commissions, Mes paiements, Mon historique, Mon profil
- **Comptable** : Comptabilité, Transactions, Commissions, Dépenses, Rapports, Performance, Journal
