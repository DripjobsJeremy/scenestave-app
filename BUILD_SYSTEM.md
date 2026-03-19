# SceneStave Build System

## Overview
SceneStave uses Babel to pre-compile JSX files to regular JavaScript for production deployment. This eliminates the need for Babel standalone in the browser, resulting in faster load times and better reliability.

## Setup Instructions

### 1. Install Dependencies
```bash
cd showsuite-clean
npm install
```

This installs:
- `@babel/cli` - Command-line Babel compiler
- `@babel/core` - Babel core functionality
- `@babel/preset-react` - React/JSX transformation
- `http-server` - Local development server

### 2. Development Workflow

**Local Development (with Babel standalone):**
```bash
npm run dev
```
Opens the current directory on http://localhost:8080 with Babel transpiling JSX in the browser.

**Production Build:**
```bash
npm run build
```

This command:
1. Cleans the `dist/` directory
2. Compiles all JSX files in `src/` to JavaScript
3. Copies assets (HTML, CSS, libraries) to `dist/`

**Test Production Build Locally:**
```bash
npm run serve
```
Opens the `dist/` directory on http://localhost:8080 with pre-compiled JavaScript.

### 3. Netlify Deployment

Netlify automatically runs the build process on each push:

```toml
[build]
  publish = "dist"
  command = "cd showsuite-clean && npm install && npm run build && mv dist ../dist"
```

**Manual Deploy:**
1. Commit and push changes:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. Netlify detects the push and:
   - Installs npm dependencies
   - Runs `npm run build`
   - Publishes the `dist/` directory

## File Structure

```
showsuite-clean/
├── index.html              # Development version (uses Babel standalone)
├── index.production.html   # Production version (no Babel, loads compiled .js)
├── package.json            # Build scripts and dependencies
├── .babelrc               # Babel configuration
├── .gitignore             # Excludes node_modules and dist
├── netlify.toml           # Netlify build configuration
├── src/                   # Source JSX files
│   ├── app/
│   ├── components/
│   ├── services/
│   └── utils/
└── dist/                  # Build output (generated, not committed)
    ├── index.html         # Production HTML
    ├── src/               # Compiled JavaScript
    └── ...                # Assets
```

## Build Scripts Explained

| Script | Purpose |
|--------|---------|
| `npm run clean` | Deletes the `dist/` directory |
| `npm run compile` | Compiles JSX → JS with Babel |
| `npm run copy-assets` | Copies HTML, CSS, libraries to `dist/` |
| `npm run build` | Full build (clean → compile → copy) |
| `npm run serve` | Serves production build locally |
| `npm run dev` | Serves development version locally |

## Key Differences: Development vs Production

### Development (index.html)
- Loads Babel standalone from CDN
- JSX files have `type="text/babel"`
- Transpilation happens in browser
- Slower initial load, easier debugging

### Production (index.production.html → dist/index.html)
- No Babel standalone
- JSX pre-compiled to `.js` files
- Standard `<script>` tags (no type attribute)
- Faster load, production-ready

## Troubleshooting

**Error: "npm: command not found"**
- Install Node.js: https://nodejs.org/

**Error: "Babel is not defined"**
- For development: Ensure index.html loads Babel before components
- For production: Run `npm run build` to pre-compile JSX

**Blank screen on Netlify:**
- Check Netlify deploy logs for build errors
- Verify `dist/` directory contains all files
- Ensure netlify.toml `publish` points to `dist`

**Scripts not loading:**
- Check browser console for 404 errors
- Verify file paths in index.production.html
- Ensure `npm run copy-assets` copied all files

## Next Steps

1. **Test locally:**
   ```bash
   npm run build
   npm run serve
   ```

2. **Deploy to Netlify:**
   ```bash
   git add .
   git commit -m "Add production build system"
   git push origin main
   ```

3. **Monitor deploy:**
   - Visit Netlify dashboard
   - Check build logs for errors
   - Test deployed site at your Netlify URL

## Additional Notes

- **Git Ignore:** `node_modules/` and `dist/` are excluded from version control
- **Caching:** Production files include cache headers for optimal performance
- **React Router:** HashRouter redirects configured in netlify.toml
