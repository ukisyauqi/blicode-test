#!/usr/bin/env bash
# CI lokal untuk monorepo Lapor Sampah.
#
# Pemakaian:
#   ./scripts/check.sh            # backend + frontend
#   RUN_E2E=1 ./scripts/check.sh  # tambah E2E Playwright
#   RUN_ML=1 ./scripts/check.sh   # tambah ruff + pytest ML
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

step() {
  printf '\n==> %s\n' "$1"
}

step "Backend: lint"
cd "$ROOT/be"
npm run lint

step "Backend: typecheck"
npm run typecheck

step "Backend: test"
npm test

step "Backend: build"
npm run build

step "Frontend: lint"
cd "$ROOT/web"
npm run lint

step "Frontend: typecheck"
npm run typecheck

step "Frontend: test"
npm test

step "Frontend: build"
npm run build

if [[ "${RUN_E2E:-0}" == "1" ]]; then
  step "Frontend: E2E Playwright"
  npm run e2e
fi

if [[ "${RUN_ML:-0}" == "1" ]]; then
  step "ML: ruff"
  cd "$ROOT/ml"
  uv run ruff check .

  step "ML: pytest"
  uv run pytest
fi

printf '\nSemua pemeriksaan lulus.\n'
