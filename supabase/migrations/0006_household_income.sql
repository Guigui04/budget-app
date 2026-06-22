-- Revenu mensuel prévu du foyer (salaire), pour le budget prévisionnel :
-- reste prévu en fin de mois = revenu − total des budgets.
alter table public.households
  add column if not exists monthly_income numeric(14,2) not null default 0;
