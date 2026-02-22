<script>
  import { store } from '$lib/store.js'
  import Sidebar from './Sidebar.svelte'
  import SnippetEditor from './SnippetEditor.svelte'
  import VersionPanel from './VersionPanel.svelte'
  import ProjectModal from './ProjectModal.svelte'

  let showProjectModal = false

  $: state = $store
  $: projects = state.projects
  $: activeProjectId = state.activeProjectId
  $: activeSnippetId = state.activeSnippetId
  $: previewVersionIndex = state.previewVersionIndex

  $: activeProject = projects.find(p => p.id === activeProjectId) ?? null
  $: activeSnippet = activeProject?.snippets.find(s => s.id === activeSnippetId) ?? null
</script>

<div class="app">
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
  </div>

  <ProjectModal
    open={showProjectModal}
    onClose={() => showProjectModal = false}
  />
</div>

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }

  :global(:root) {
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
    font-family: 'Syne', sans-serif;
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
    font-family: 'Syne', sans-serif;
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
    font-family: 'Syne', sans-serif;
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
  }
  .empty-state p {
    font-size: 14px;
    font-family: 'JetBrains Mono', monospace;
  }
  .empty-glyph { font-size: 48px; }
</style>
