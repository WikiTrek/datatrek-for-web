# Datatrek for Web — Project Context

## What This Is

**Datatrek for Web** is a Firefox browser extension (Manifest V2) that displays structured information from Wikibase/Wikidata instances in a sidebar while you browse the web. It intelligently resolves the current page URL to related Wikibase entities and lets you view and edit their structured data without leaving the page.

- **Extension ID:** `{86403263-d48f-44f4-a72a-64ad1f91f672}`
- **Current version:** 0.533
- **Minimum Firefox:** 102.0
- **Published to:** AMO (addons.mozilla.org)
- **Keyboard shortcut:** Alt+3 to toggle sidebar

## Project Structure

```
/background/         Background script (main orchestrator)
/content/            Content scripts injected into all pages
/sidebar/            Sidebar UI (Preact app, main user-facing panel)
/popup/              Edit queue progress popup
/components/         Preact UI components (~30+ components)
/modules/            Utility modules (edit queue, wikibases config, etc.)
/resolvers/          URL-to-entity resolver chain
/queries/            SPARQL query definitions and manager
/mapping/            Data mapping (meta tags, JSON-LD, constraints, URLs)
/types/              Type definitions (Claim class)
/libraries/          Bundled custom libraries (isbn3)
/importmap/          npm packages bundled for in-browser use (no bundler at runtime)
/style/              CSS stylesheets
/icons/              SVG icons
/_locales/en|de/     i18n translation strings
/user-tests/         Manual HTML test files
```

## Architecture

### Entry Points

| File | Role |
|------|------|
| `background/observe.js` | Main background script — listens to navigation, resolves URLs, orchestrates messaging |
| `content/selection-observer.js` | Captures text selection on pages |
| `content/hash-change-observer.js` | Detects SPA hash changes |
| `sidebar/app.mjs` | Root Preact app for the sidebar panel |
| `popup/edit-queue.mjs` | Edit queue progress indicator |

### Data Flow

```
Tab navigation event (webNavigation)
  → background/observe.js: resolveCurrentTab()
  → resolvers/index.mjs: resolve(url) — runs siteLinks → url → urlMatchPattern → wikibase
  → queries/index.mjs: WikiBaseQueryManager SPARQL queries (cached)
  → updateSidebar() sends 'resolved' message to sidebar
  → sidebar/app.mjs: organiseView() renders Entity/Match/Pick components
```

### Edit Flow

```
User triggers edit in sidebar
  → Change component → message 'add_to_edit_queue'
  → modules/WikibaseEditQueue.mjs: processQueue()
  → CSRF fetch → POST to Wikibase API
  → background webRequest listener detects completion
  → sends 'update_entity' to sidebar to refresh
```

### Resolver Chain (`resolvers/index.mjs`)

Resolvers run in priority order, each with `applies()` and `resolve()` methods:

1. **siteLinks** — checks if URL matches a Wikibase sitelink (e.g., Wikipedia articles)
2. **url** — fuzzy URL matching via SPARQL (`itemByUrl` query)
3. **urlMatchPattern** — uses P8966 (urlMatchPattern) property
4. **wikibase** — custom Wikibase-specific resolution

Results are cached in `resolvedCache`. Candidates are sorted by specificity.

### Message Types

- `'resolve'` — background → sidebar: new entity candidates
- `'add_to_edit_queue'` — sidebar → background: queue an edit
- `'update_entity'` — background → sidebar: refresh after edit completes
- `'text_selected'` — content → background: text selection
- `'hash_changed'` — content → background: SPA navigation

## Key Technologies

| Technology | Version | Use |
|------------|---------|-----|
| Preact | 10.19.2 | UI rendering (sidebar components) |
| htm | 3.1.1 | JSX-like syntax without a build step |
| wikibase-sdk | 9.2.4 | SPARQL queries and Wikibase URL building |
| wikibase-edit | 7.0.2 | Entity editing API |
| Leaflet | 1.9.4 | Map visualizations |
| isbn3 | 1.1.46 | ISBN parsing |
| binary-variations | 1.0.2 | Generating URL candidate combinations |
| esbuild | 0.20.2 | Import map preparation only (not a runtime bundler) |

**No build step at runtime** — the extension uses ES modules directly in the browser via `importmap/` (a vendored copy of npm packages prepared by `prepare-importmap.js`).

## Development Setup

```bash
npm install          # Install dependencies
npm run setup        # Run prepare-importmap.js to vendor npm packages into /importmap/
web-ext run --start-url <url>   # Launch Firefox with extension loaded
```

### User Tests

```bash
npm run user-tests   # Serves /user-tests/ on localhost for manual testing
```

### Building for Distribution

```bash
web-ext build        # Creates .xpi in web-ext-artifacts/
```

CI (`/.github/workflows/main.yml`) runs `web-ext build` on push to main and uploads the artifact.

## UI Component Overview (`/components/`)

| Component | Purpose |
|-----------|---------|
| `Main` | Root container |
| `Entity` | Displays a single matched entity with all its properties |
| `Match` | Property suggestion / proposed edit row |
| `Pick` | UI when multiple entity candidates match |
| `Change` | Edit form for a property value |
| `Actions` | Entity-level action buttons |
| `Chart` | Data visualization |
| `Map` / `Spot` | Leaflet map with location pins |
| `Tempus` | Timeline visualization |
| `Inform` | Informational display |

Components use Preact hooks (`useState`, `useEffect`, `useRef`) and `htm` for templating.

## Wikibase Configuration (`/modules/wikibases.mjs`)

All supported Wikibase instances are defined here. Each entry specifies API endpoints, sitelink patterns, and feature flags. The extension supports multiple Wikibase instances simultaneously (Wikidata, WikiTrek, etc.).

## Entity ID Format

Entities are referenced as `wikibaseID:entityID`, e.g. `wikidata:Q42`, `wikitrek:Q123`.

## SPARQL Queries (`/queries/index.mjs`)

`WikiBaseQueryManager` handles query execution with result caching. Key queries:

- `itemByUrl` — find entity by URL
- `itemByExternalId` — find entity by external identifier
- `urlProperties` / `urlMatchPattern` — URL pattern-based resolution
- `instancesOrSubclasses` — type hierarchy
- `equivalentClasses` / `equivalentProperties` — cross-ontology mapping
- `reviewScoreHostnames` — for rating/review properties
- `unitSymbol` / `shortTitle` — display helpers

## Coding Conventions

- All source files use `.mjs` (ES modules)
- No TypeScript — plain JS with JSDoc where needed
- Preact components are functional with hooks, not class-based
- `htm` tagged template literals instead of JSX (no transpilation required)
- Single-responsibility utility modules in `/modules/`
- Async/await throughout; `Promise.all` for parallel fetches
- No test framework — manual tests in `/user-tests/`
- Prettier for formatting (`npm run prettier` / `.prettierrc` if present)
- i18n via `browser.i18n.getMessage()` with strings in `/_locales/`

## What the Extension Does (User Perspective)

1. User browses any web page
2. Extension sidebar shows Wikibase entities that match the current URL
3. User sees structured data (properties, values) for those entities
4. User can propose edits — values are pre-filled from page metadata (meta tags, JSON-LD)
5. Edits are queued and submitted to the Wikibase API with proper CSRF handling
6. Sidebar refreshes to show updated data after each edit
