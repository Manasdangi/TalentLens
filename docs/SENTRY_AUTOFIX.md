# Daily Sentry Codex Review

TalentLens runs one scheduled Sentry review every day at 12:20 PM IST. The job queries Sentry directly, gives Codex a sanitized batch of the last 24 hours of unresolved errors, verifies any proposed changes, and opens at most one combined draft pull request.

Email access and the Express backend are not part of this automation:

```text
GitHub Actions schedule: 12:20 PM IST
  -> Sentry Issues API: previous 24-hour window
  -> sanitized context for up to 10 unresolved error/fatal issues
  -> one Codex analysis pass
  -> protected-path and patch-size checks
  -> frontend and backend builds plus unit tests
  -> one combined draft pull request
```

Operational incidents such as invalid credentials, missing environment variables, provider outages, or rate limits are reported in the workflow summary but should not produce code changes.

## Why Sentry Instead Of Gmail

Reading Sentry notification emails would require Gmail OAuth access, expose unrelated mailbox metadata, and add fragile HTML/thread parsing. The Sentry API provides structured issue IDs, levels, stack frames, projects, timestamps, and links using a read-only token.

The daily window is fixed from 12:20 PM IST on the previous date through 12:20 PM IST on the report date. A deterministic branch named `codex/sentry-daily-YYYY-MM-DD` prevents duplicate PRs for the same window.

## 1. Rotate Exposed Credentials

Revoke any credential that has appeared in chat, screenshots, logs, or commits before enabling this automation. In particular, regenerate the exposed Brevo SMTP key and update the backend deployment environment.

Never put real credentials in `.env.example`, workflow files, Sentry event data, or GitHub variables.

## 2. Configure GitHub

Add these under **Settings -> Secrets and variables -> Actions**:

| Type | Name | Required | Purpose |
| --- | --- | --- | --- |
| Secret | `OPENAI_API_KEY` | Yes | Used only by `openai/codex-action` |
| Secret | `SENTRY_AUTH_TOKEN` | Yes | Read-only Sentry token with `event:read` |
| Variable | `SENTRY_ORG_SLUG` | Yes | Sentry organization slug |
| Variable | `SENTRY_PROJECTS` | No | Comma-separated project slug allowlist |
| Variable | `SENTRY_ENVIRONMENT` | No | Environment filter, such as `production` |
| Variable | `SENTRY_DAILY_LEVELS` | No | Defaults to `error,fatal` |
| Variable | `SENTRY_DAILY_MAX_ISSUES` | No | Defaults to `10`, maximum `20` |

In **Settings -> Actions -> General**, allow GitHub Actions to create pull requests. Keep branch protection and required review enabled for the default branch.

No GitHub personal access token, backend webhook secret, or backend deployment change is required for daily mode.

## 3. Create A Read-Only Sentry Token

Create a Sentry organization auth token with only `event:read` access. Add it to GitHub as the `SENTRY_AUTH_TOKEN` repository secret.

Set `SENTRY_ORG_SLUG` to the organization slug shown in the Sentry URL. Set `SENTRY_PROJECTS` if the token can access projects unrelated to TalentLens.

## 4. Schedule And Daily Window

The workflow is `.github/workflows/sentry-autofix.yml` and uses:

```yaml
schedule:
  - cron: '50 6 * * *'
```

GitHub cron is UTC, so `06:50 UTC` is `12:20 Asia/Kolkata`. Scheduled GitHub Actions may begin a few minutes late, but the queried Sentry window still ends at exactly 12:20 PM IST.

The workflow must be committed to the default branch before GitHub will run its schedule.

## 5. Test Safely

Run **Actions -> Daily Sentry Codex Review -> Run workflow** manually. You may provide:

- `report_date`: an IST date in `YYYY-MM-DD` format
- `max_issues`: a temporary limit from 1 to 20

Use a date with known Sentry activity. Expected behavior:

- No qualifying issues: workflow summary only, no Codex run and no PR
- Only configuration/provider issues: Codex report in the workflow summary, no PR
- Safe code fixes found: one branch and one combined draft PR
- Existing branch or PR for the date: workflow exits without another Codex run

## Guardrails And Limits

- One run at a time and one branch per report date
- Only unresolved `error` and `fatal` events by default
- Structured API access instead of mailbox access
- No request body, cookies, headers, query strings, or user identity passed to Codex
- Common email addresses and credential patterns redacted
- Maximum 10 issues by default, configurable up to 20
- Maximum 1 MiB patch and 25 changed files
- No changes allowed under `.github`, `.env*`, `node_modules`, build output, or the validation script
- Writable GitHub token is unavailable while agent-modified code is installed and tested
- Draft PR only; human review remains required

The workflow currently queries up to 100 candidate issues and analyzes the first qualifying issues up to the configured limit. For a larger production service, persist daily issue IDs and add pagination rather than increasing the agent batch indefinitely.
