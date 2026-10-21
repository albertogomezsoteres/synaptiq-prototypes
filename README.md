# Synaptiq

**No more waiting on the one person who knows.**

At engineering-heavy companies, critical know-how lives with a few experts. Engineers can usually find *what* a system does, but not *why* it works that way, so they search, wait, or interrupt, and the same experts answer the same questions again and again.

This repository contains three interactive prototypes. Each one tests a different hypothesis about where Synaptiq's loop (spot the gap, find the expert, validate once, reuse) should start.

| Version | Persona | Approach | Hypothesis |
|---|---|---|---|
| **A · Ask Synaptiq** | New-to-system engineer | **Pull:** the engineer asks | Engineers trust and act on answers that show source, owner and review date, and that admit "not found" and route the question. |
| **B · Expert Inbox** | Go-to expert engineer | **Capture:** the expert validates | Experts capture what they know if each contribution is one click on a drafted answer, and they see the interruptions it saves. |
| **C · Context Briefing** | Deployment / cross-team engineer | **Push:** Synaptiq goes first | Engineers get unblocked faster when Synaptiq shows what changed, why, who worked on it, and what nobody wrote down, before they ask. |

All three versions share the same fictional company (Corvex Payments), the same data and the same visual design, so the only variable is the product approach. The scenarios come from our customer interviews.

## Live site

`https://<username>.github.io/<repository>/`

| Page | Path |
|---|---|
| Overview | `/` |
| Version A | `/a/` |
| Version B | `/b/` |
| Version C | `/c/` |

## Publish with GitHub Pages

1. Push this repository to GitHub as a public repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select branch **main** and folder **/docs**, then **Save**.

The site is live at the address above after about a minute.

## Structure

```
docs/            Published site: one self-contained HTML file per page
src/
  shared.css     Design tokens and components used by every page
  shared.js      Shared interactions: streaming answers, guided steps, notifications
  index.html     Overview page
  a.html         Version A: Ask Synaptiq
  b.html         Version B: Expert Inbox
  c.html         Version C: Context Briefing
build.py         Builds docs/ from src/
tests/qa.py      Browser test that clicks through every flow and saves screenshots
```

## Develop

Pages are plain HTML, CSS and JavaScript with no framework, no backend and no dependencies, so they load instantly and behave the same in every demo.

```bash
python3 build.py                     # rebuild docs/ after editing src/
python3 -m http.server -d docs 8000  # preview at http://localhost:8000
```

Browser tests (optional):

```bash
pip install playwright && playwright install chromium
python3 tests/qa.py a                # also: b, c, index; add --mobile or --dark
```

## Team

Konur Nordberg (CEO) · Alberto Gomez (CTO) · Debshree Chowdhury (CMO) · Xianyu Wang (CFO) · Weikai Liao (COO)

MENG 570, Fall 2026
