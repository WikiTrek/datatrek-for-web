# Kickstart Prompt for New Claude Session

## Description (paste as first message)

> I'm working on **Datatrek for Web**, a Firefox browser extension (Manifest V2, version 0.533) that displays structured information from Wikibase/Wikidata instances in a sidebar while browsing. The extension resolves the current page URL to related Wikibase entities using a chain of SPARQL-backed resolvers, then renders them in a Preact sidebar where users can view and edit structured data.
>
> The repo is at `C:\Users\luca\Dropbox\Code\wikibase-for-web`. There is a `CLAUDE.md` in the root that documents the full architecture, file structure, data flow, message types, and coding conventions. Please read it before we start.
>
> Key tech: Preact + htm (no build step), wikibase-sdk, wikibase-edit, Leaflet, ES modules vendored via importmap/. No TypeScript, no test framework. Run with `web-ext run`.

---

## Instructions for Claude

Paste the above description, then add your specific task. Some ready-to-use starters:

### To continue a specific feature

> Please read CLAUDE.md, then help me continue work on [feature name]. The relevant files are [list files if known].

### To fix a bug

> Please read CLAUDE.md. There's a bug where [describe symptom]. I suspect it's in [area / file]. Let's diagnose and fix it.

### To understand the codebase

> Please read CLAUDE.md and then explain how [specific mechanism, e.g. "the resolver chain decides which entity to show"] works in detail, including which files are involved.

### To add a new resolver

> Please read CLAUDE.md. I want to add a new resolver to `resolvers/index.mjs` that [describe what it should do]. Each resolver needs `applies(url)` and `resolve(url)` methods. Let's design and implement it.

### To add a new component

> Please read CLAUDE.md. I want to add a new Preact component to `components/` that [describe purpose]. Follow the existing pattern: functional component, htm templating, no JSX, Preact hooks.

---

## Key files to orient Claude quickly

If Claude needs more context beyond CLAUDE.md, point it at these in order:

1. `manifest.json` — extension entry points and permissions
2. `background/observe.js` — main orchestrator
3. `resolvers/index.mjs` — resolver chain
4. `sidebar/app.mjs` — root UI component
5. `modules/wikibases.mjs` — Wikibase instance configuration
6. `queries/index.mjs` — SPARQL query manager
7. `modules/WikibaseEditQueue.mjs` — edit queue logic

---

## Development commands (remind Claude if needed)

```bash
npm install          # install dependencies
npm run setup        # vendor npm packages into importmap/
web-ext run --start-url https://en.wikipedia.org/wiki/Douglas_Adams   # test run
web-ext build        # build .xpi for distribution
npm run user-tests   # serve manual test pages on localhost
```
