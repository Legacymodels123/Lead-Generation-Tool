---
name: auto-commit
description: >-
  Automatically commit and push Lead Generation Tool changes after every completed
  task. Use when finishing implementation, fixes, or refactors in this repo, or
  when the user wants changes saved to git without asking each time.
---

# Auto-commit (Lead Generation Tool)

After **every completed task** that modified files in this repo, commit and push — do not wait for the user to ask.

Skip auto-commit only when the user explicitly says not to commit, or when there are no file changes.

## Workflow

1. Finish the requested work (implement, fix, verify with `npx tsc --noEmit` when TypeScript changed).
2. Run in parallel:
   - `git status`
   - `git diff`
   - `git log -3 --oneline`
3. Stage relevant files. **Never** stage `.env`, `.env.local`, credentials, or `tsconfig.tsbuildinfo`.
4. Commit with a 1–2 sentence message focused on **why** (match recent repo style).
5. Push so **Vercel production updates** (it deploys from `main`, not feature branches):
   ```powershell
   git checkout main
   git pull origin main
   git merge <your-feature-branch> -m "Merge <branch>: short summary"
   git push origin main
   git checkout <your-feature-branch>
   ```
   If already on `main`, `git push origin main` is enough.
6. Tell the user the commit hash, branch, and that push to `main` succeeded (Vercel rebuild ~2–3 min).

## Git safety (required)

- Never update git config, force-push `main`/`master`, or skip hooks unless the user asks.
- Never amend unless the user asked, HEAD was your commit this session, and it was not pushed.
- Use HEREDOC-style commit messages in PowerShell-compatible form when needed.
- If commit fails on a hook, fix and create a **new** commit (do not amend a failed commit).

## Auto-push hook

This repo has a `post-commit` hook that pushes after each commit. If push does not happen:

```powershell
npm run hooks:install
```

## Branch defaults

- Develop on `feature/*` branches, then **merge to `main`** for Vercel production.
- Vercel preview/production uses **`main`** on `Legacymodels123/Lead-Generation-Tool` — pushing only a feature branch does **not** update the live app.
- Do **not** force-push `main` unless the user explicitly requests it.

## Commit message examples

```
Restore Baseloop spreadsheet UI with Excel keyboard navigation on Companies page.

Add fill-handle drag, Ctrl+C/V, and auto-commit skill for this repo.
```

```
Extend store with enrich/workflow helpers and seed demo leads for local dev.
```
