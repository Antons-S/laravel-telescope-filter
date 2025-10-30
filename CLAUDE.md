# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a browser bookmarklet that adds advanced filtering capabilities to Laravel Telescope. The bookmarklet is built from JavaScript source code that gets minified and URL-encoded into a single bookmarklet string.

## Build & Development Commands

### Build the bookmarklet
```bash
npm run build
```
This minifies `src/telescope-filter.js` and generates two files in `dist/`:
- `bookmarklet.txt` - The ready-to-use bookmarklet with `javascript:` prefix
- `bookmarklet.js` - The minified JS without prefix (for debugging)

### Watch for changes
```bash
npm run watch
```
Automatically rebuilds when `src/telescope-filter.js` changes.

### Format code
```bash
npm run format
```
Uses Prettier with project config from `.prettierrc`.

## Architecture

### Source Structure
- **src/telescope-filter.js** - Main source file containing all logic (readable, commented)
- **build.js** - Build script that handles minification and encoding using Terser
- **dist/** - Generated output files (not tracked in git)

### How the Bookmarklet Works
1. **IIFE wrapper** - Entire code runs in an Immediately Invoked Function Expression for encapsulation
2. **DOM injection** - Creates a fixed-position dialog overlay on the Telescope page
3. **Tab detection** - Monitors `window.location.pathname` to auto-switch between Requests/HTTP/Jobs tabs
4. **Filtering engine** - Uses DOM queries to show/hide table rows based on filter criteria
5. **Auto-refresh** - Runs filters every 500ms via `setInterval` to handle dynamically loaded content
6. **State management** - Uses closure variables to maintain filter state across invocations

### Key Components

#### Tab System
- Three tabs: Requests, HTTP Client, Jobs
- Auto-switches based on URL path detection (`detectTabFromUrl()`)
- Each tab has its own set of filters and state variables

#### Filter Functions
- `filterRequests()` - Filters `/telescope/requests` page by method, status, duration, URL
- `filterHttp()` - Filters `/telescope/client-requests` page by method, status, duration, URI
- `filterJobs()` - Filters `/telescope/jobs` page by job name, status, connection, queue

#### Load More Feature
- `handleLoadMore()` - Clicks "Load Older Entries" button 100 times with 300ms delays
- Automatically disables Telescope's auto-load to prevent conflicts
- Logs progress to browser console

### Build Process
The `build.js` script:
1. Reads `src/telescope-filter.js`
2. Minifies using Terser with aggressive optimization (mangle, compress, unsafe optimizations)
3. URL-encodes the minified code with `encodeURIComponent()`
4. Prepends `javascript:` prefix for bookmarklet format
5. Outputs to both `.txt` and `.js` files

## Code Style

- ES6+ syntax (arrow functions, const/let, template literals)
- Uses strict mode (`'use strict';`)
- All code wrapped in IIFE: `(function() { ... })();`
- Inline styles in generated HTML (no external CSS)
- Dark theme matching Telescope's UI (#1f2937 background, #3b82f6 primary)

## Testing

Test changes by:
1. Running `npm run build`
2. Opening `dist/bookmarklet.txt`
3. Copying the bookmarklet code
4. Creating/updating browser bookmark with the code
5. Testing on a real Laravel Telescope instance

## Important Notes

- **Console logs** - `drop_console: false` in Terser config to keep console.log for Load More debugging
- **Minification** - Uses aggressive unsafe optimizations since code runs in controlled browser context
- **State isolation** - All state variables are closure-scoped to avoid global namespace pollution
- **No dependencies** - Pure vanilla JavaScript, no frameworks or libraries
- **Browser compatibility** - Tested on Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
