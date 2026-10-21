<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.png">
    <img src="assets/logo.png" alt="Synaptiq" width="190">
  </picture>
</p>

<h3 align="center">No more waiting on the one person who knows.</h3>

<p align="center">
  <a href="https://albertogomezsoteres.github.io/synaptiq-prototypes/"><b>Live site</b></a>
  &nbsp;·&nbsp;
  <a href="https://albertogomezsoteres.github.io/synaptiq-prototypes/a/">Version A</a>
  &nbsp;·&nbsp;
  <a href="https://albertogomezsoteres.github.io/synaptiq-prototypes/b/">Version B</a>
  &nbsp;·&nbsp;
  <a href="https://albertogomezsoteres.github.io/synaptiq-prototypes/c/">Version C</a>
</p>

---

## The problem

At engineering-heavy companies, critical know-how lives with a few experts. Engineers can usually find *what* a system does, but not *why* it works that way. So they search, wait, or interrupt, and the same experts answer the same questions again and again.

Synaptiq closes that loop: it **spots the gap**, **finds the expert**, has them **validate once**, and makes the answer **reusable** for everyone after.

## Three versions, three hypotheses

Each version pairs one persona from our customer discovery with a different product approach. The class vote tells us which persona and which approach to lead with.

| | Version | Persona | Approach | Hypothesis | Validated if |
|---|---|---|---|---|---|
| **A** | [Ask Synaptiq](https://albertogomezsoteres.github.io/synaptiq-prototypes/a/) | New-to-system engineer | **Pull:** the engineer asks | Engineers trust and act on answers that show source, owner and review date, and that admit "not found" and route the question. | Testers would act on the answer and see "not found" as helpful. |
| **B** | [Expert Inbox](https://albertogomezsoteres.github.io/synaptiq-prototypes/b/) | Go-to expert engineer | **Capture:** the expert validates | Experts capture what they know if each contribution is one click on a drafted answer, and they see the interruptions it saves. | Testers confirm an answer in under 30 seconds and prefer it to DMs. |
| **C** | [Context Briefing](https://albertogomezsoteres.github.io/synaptiq-prototypes/c/) | Deployment / cross-team engineer | **Push:** Synaptiq goes first | Engineers get unblocked faster when Synaptiq shows what changed, why, who worked on it, and what nobody wrote down, before they ask. | Testers make the right call on their first ticket without asking anyone. |

All three versions run on the same fictional company (Corvex Payments), with the same data and the same design, so the only variable is the product approach. The scenarios come from our customer interviews.

### What we deliberately left out

Real integrations, live AI, login, the manager dashboard and admin settings. Each version tests one idea, end to end, in about two minutes.

## Try it

Open the [live site](https://albertogomezsoteres.github.io/synaptiq-prototypes/), pick a version and follow the **Try this** steps on the left. Every version has a **Restart demo** button and works on desktop and mobile, in light and dark mode.

## Project structure

```
assets/          Logo files
docs/            Published site (GitHub Pages): one self-contained HTML file per page
src/
  shared.css     Design tokens and components used by every page
  shared.js      Shared interactions: streaming answers, guided steps, notifications
  index.html     Overview page
  a.html         Version A: Ask Synaptiq
  b.html         Version B: Expert Inbox
  c.html         Version C: Context Briefing
build.py         Builds docs/ from src/
tests/qa.py      Browser test that clicks through every flow
```

## Development

Plain HTML, CSS and JavaScript: no framework, no backend, no dependencies.

```bash
python3 build.py                     # rebuild docs/ after editing src/
python3 -m http.server -d docs 8000  # preview at http://localhost:8000
```

Optional browser tests:

```bash
pip install playwright && playwright install chromium
python3 tests/qa.py a                # also: b, c, index; add --mobile or --dark
```

**Workflow:** work on `dev`, run `python3 build.py`, open a pull request to `main`. GitHub Pages publishes `main` from `/docs`.

## Team

| Konur Nordberg | Alberto Gomez | Debshree Chowdhury | Xianyu Wang | Weikai Liao |
|:---:|:---:|:---:|:---:|:---:|
| CEO | CTO | CMO | CFO | COO |

<sub>MENG 570 · Fall 2026</sub>
