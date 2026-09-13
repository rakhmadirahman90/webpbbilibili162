import fs from 'node:fs';

// The complete WhatsApp cash report is now implemented directly in
// src/components/KasRealtimeNotifier.tsx. This build-prep hook intentionally
// remains a safe no-op so legacy string-replacement logic cannot break builds
// when the notifier source evolves.
const path = 'src/components/KasRealtimeNotifier.tsx';
if (!fs.existsSync(path)) {
  console.warn('[patch-kas-wa-report-complete] notifier source not found; skipped.');
} else {
  console.log('[patch-kas-wa-report-complete] report is maintained directly in KasRealtimeNotifier.tsx; no patch needed.');
}
