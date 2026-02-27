# CodeVault 🔐

A code notes app with formatting preservation and version control.

## Features

- **Projects** — organize snippets by project, each with a custom color
- **Code formatting preserved** — monospace editor keeps every indent, space, and newline exactly as pasted. Tab key works too.
- **Version control** — save named snapshots of your code, browse history, restore any version
- **3 views per snippet** — Code editor, Preview (read-only render), Notes (free text)
- **Copy button** — copies raw code to clipboard with formatting intact
- **Search** — fuzzy search across all projects and snippets
- **Persistent** — saved to Supabase with realtime sync and presence
- **Collaboration** — invite editors/viewers, presence, comments

## Getting Started

### Configure Supabase

1. Create a Supabase project and enable Email Magic Link auth.
2. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.
3. Create `.env` with:

```bash
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

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
- [JetBrains Mono](https://www.jetbrains.com/lp/mono/) + [Manrope](https://fonts.google.com/specimen/Manrope) fonts
