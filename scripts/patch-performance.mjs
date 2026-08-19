/**
 * Legacy performance patch retained for build-script compatibility.
 *
 * The production performance work now lives in scripts/patch-performance-v2.mjs,
 * which runs before the normal build and is intentionally non-conflicting with
 * the repository's other prebuild patches.
 */
console.log('[performance-legacy] skipped; performance-v2 owns startup and route optimization');
