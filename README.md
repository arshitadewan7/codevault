# CodeVault 🔐

A code notes app with formatting preservation and version control.

## Features

- **Projects** — organize snippets by project, each with a custom color
- **Code formatting preserved** — monospace editor keeps every indent, space, and newline exactly as pasted. Tab key works too.
- **Version control** — save named snapshots of your code, browse history, restore any version
- **3 views per snippet** — Code editor, Preview (read-only render), Notes (free text)
- **Copy button** — copies raw code to clipboard with formatting intact
- **Search** — fuzzy search across all projects and snippets
- **Persistent** — all data saved to `localStorage`

## Getting Started

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build for Production

```bash
npm run build
npm run preview
```

## Stack

- [Svelte 4](https://svelte.dev)
- [Vite 5](https://vitejs.dev)
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) + [Syne](https://fonts.google.com/specimen/Syne) fonts
