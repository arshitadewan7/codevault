<script>
  import { store } from '$lib/store.js'
  import Login from './Login.svelte'
  import Share from './Share.svelte'
  import Sidebar from './Sidebar.svelte'
  import SnippetEditor from './SnippetEditor.svelte'
  import VersionPanel from './VersionPanel.svelte'
  import ProjectModal from './ProjectModal.svelte'
  import CollabPanel from './CollabPanel.svelte'

  let showProjectModal = false

  let route = { name: 'app', payloadStr: '' }

  function parseHash() {
    const h = (window.location.hash || '').replace(/^#\/?/, '')
    const parts = h.split('/')
    if (parts[0] === 'share' && parts[1]) return { name: 'share', payloadStr: parts.slice(1).join('/') }
    return { name: 'app', payloadStr: '' }
  }

  function syncRoute() {
    route = parseHash()
  }

  if (typeof window !== 'undefined') {
    syncRoute()
    window.addEventListener('hashchange', syncRoute)
  }

  if (typeof window !== 'undefined') {
    store.init()
  }

  $: state = $store
  $: projects = state.projects
  $: activeProjectId = state.activeProjectId
  $: activeSnippetId = state.activeSnippetId
  $: previewVersionIndex = state.previewVersionIndex
  $: user = state.user
  $: loading = state.loading
  $: authStatus = state.authStatus
  $: authError = state.authError

  $: activeProject = projects.find(p => p.id === activeProjectId) ?? null
  $: activeSnippet = activeProject?.snippets.find(s => s.id === activeSnippetId) ?? null
</script>

<div class="app">
  {#if route.name === 'share'}
    <Share payloadStr={route.payloadStr} />
  {:else}
    {#if loading}
      <div class="empty-state">
        <div class="empty-glyph">⏳</div>
        <h2>Loading workspace…</h2>
        <p>// syncing with Supabase</p>
      </div>
    {:else if !user}
      <Login
        {authStatus}
        {authError}
        onLogin={(email, password) => store.login(email, password)}
        onSignup={(email, password) => store.signup(email, password)}
        onReset={() => store.clearAuthError()}
      />
    {:else}
      <header>
        <div class="logo">
          <div class="logo-dot" />
          Code<span>Vault</span>
        </div>
        <div class="header-actions">
          {#if activeProjectId}
            <button class="btn-ghost" on:click={() => store.createSnippet(activeProjectId)}>
              + New Snippet
            </button>
          {/if}
          <button class="btn-ghost" on:click={() => store.logout()}>
            Logout
          </button>
          <button class="btn-primary" on:click={() => showProjectModal = true}>
            + New Project
          </button>
        </div>
      </header>

      <div class="app-body">
        <Sidebar
          {projects}
          {activeProjectId}
          {activeSnippetId}
          onNewProject={() => showProjectModal = true}
        />

        <main class="main">
          {#if activeSnippet}
            <SnippetEditor
              snippet={activeSnippet}
              project={activeProject}
              {previewVersionIndex}
            />
          {:else}
            <div class="empty-state">
              <div class="empty-glyph">⌨️</div>
              <h2>CodeVault</h2>
              <p>// select or create a project to start</p>
              <button class="btn-primary" style="margin-top:8px" on:click={() => showProjectModal = true}>
                Create your first project →
              </button>
            </div>
          {/if}
        </main>

        {#if activeSnippet}
          <VersionPanel
            snippet={activeSnippet}
            {previewVersionIndex}
          />
        {/if}

        {#if activeProject}
          <CollabPanel project={activeProject} />
        {/if}
      </div>

      <ProjectModal
        open={showProjectModal}
        onClose={() => showProjectModal = false}
      />
    {/if}
  {/if}
</div>

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }

  :global(:root) {
    --font-sans: 'Manrope', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    --font-display: 'DM Serif Display', ui-serif, Georgia, 'Times New Roman', Times, serif;
    --font-logo: var(--font-display);
    --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    --bg: #0d0f14;
    --surface: #13161e;
    --surface2: #1a1e2a;
    --border: #252a38;
    --accent: #5b8aff;
    --accent2: #ff6b6b;
    --green: #4ade80;
    --text: #e2e8f0;
    --text-muted: #64748b;
    --text-dim: #94a3b8;
    --code-bg: #0a0c10;
  }

  :global(body) {
    font-family: var(--font-sans);
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    overflow: hidden;
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 28px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-shrink: 0;
  }

  .logo {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
    font-family: var(--font-logo);
  }
  .logo span { color: var(--accent); }

  .logo-dot {
    width: 8px; height: 8px;
    background: var(--accent);
    border-radius: 50%;
    display: inline-block;
  }

  .header-actions { display: flex; gap: 10px; }

  .btn-primary {
    background: var(--accent);
    color: #fff;
    padding: 8px 18px;
    font-size: 13px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-family: var(--font-sans);
    font-weight: 600;
    transition: all 0.15s;
  }
  .btn-primary:hover { background: #7aa3ff; transform: translateY(-1px); }

  .btn-ghost {
    background: transparent;
    color: var(--text-dim);
    padding: 8px 16px;
    font-size: 13px;
    border-radius: 8px;
    border: 1px solid var(--border);
    cursor: pointer;
    font-family: var(--font-sans);
    font-weight: 600;
    transition: all 0.15s;
  }
  .btn-ghost:hover { background: var(--surface2); color: var(--text); }

  .app-body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @media (max-width: 1100px) {
    .app-body { flex-direction: column; }
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: var(--text-muted);
  }
  .empty-state h2 {
    font-size: 24px;
    font-weight: 800;
    color: var(--text-dim);
    font-family: var(--font-display);
  }
  .empty-state p {
    font-size: 14px;
    font-family: var(--font-mono);
  }
  .empty-glyph { font-size: 48px; }
</style>
