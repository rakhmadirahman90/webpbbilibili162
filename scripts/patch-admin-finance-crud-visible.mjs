import fs from 'node:fs';

const path = 'src/components/AdminKeuanganTurnamen.tsx';
const s = fs.readFileSync(path, 'utf8');

// The finance component now contains its CRUD controls and responsive layouts directly.
// Keep this build step idempotent so older marker-based patching cannot break production builds.
const required = [
  'function FinanceModal',
  'function Actions',
  'function IncomeTable',
  'function ExpenseTable',
  'function KindTable',
  "delete().eq('id', id).eq('tournament_id', tid)"
];
const missing = required.filter(marker => !s.includes(marker));
if (missing.length) {
  console.warn(`[patch-admin-finance-crud-visible] expected CRUD markers missing: ${missing.join(', ')}; leaving source unchanged.`);
} else {
  console.log('[patch-admin-finance-crud-visible] CRUD already implemented in AdminKeuanganTurnamen.tsx; no-op.');
}
