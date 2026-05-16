# Domain Docs

**Layout**: Multi-context

This is a monorepo (frontend + backend) with per-module knowledge bases:

- `/AGENTS.md` — root knowledge base: project overview, conventions, anti-patterns, commands
- `/backend/AGENTS.md` — backend: Spring Boot conventions, test patterns, module layout
- `/frontend/AGENTS.md` — frontend: React patterns, Context stack, styling conventions

## For skills that read CONTEXT.md

The `improve-codebase-architecture`, `diagnose`, and `tdd` skills should:

1. Read `/AGENTS.md` first for cross-cutting project conventions
2. Read `/backend/AGENTS.md` or `/frontend/AGENTS.md` depending on which module they're working on
3. Check `/docs/` for any planning or specification documents relevant to the current task

Architectural decisions live in `docs/adr/` (ADR format) and in planning files under `/docs/` (e.g., `AI-analysis-feasibility.md`, `prd-*.md`).
