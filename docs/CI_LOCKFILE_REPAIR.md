# CI lockfile repair

The hardening branch uses a deterministic `npm ci` installation in CI. The package lockfile must remain synchronized with `package.json`.

The repair workflow regenerates `package-lock.json` on the dedicated hardening branch and commits only when the lockfile changes. The normal CI workflow then validates the resulting lockfile with `npm ci`, followed by typecheck, lint, and production build.

This document records the lockfile repair process used while the hardening branch is being validated.