<script>
  import { store, projectEmoji } from '$lib/store.js'

  export let projects = []
  export let activeProjectId = null
  export let activeSnippetId = null
  export let onNewProject = () => {}

  let searchQuery = ''

  function deleteProject(e, proj) {
    e.preventDefault()
    e.stopPropagation()
    if (!proj) return
    if (!confirm(`Delete project "${proj.name}"? This will delete all its snippets.`)) return
    store.deleteProject(proj.id)
  }

  function deleteSnippet(e, proj, snippet) {
    e.preventDefault()
    e.stopPropagation()
    if (!proj || !snippet) return
    if (!confirm(`Delete snippet "${snippet.title || 'Untitled'}"?`)) return
    store.deleteSnippet(proj.id, snippet.id)
  }

  $: filtered = projects.map(p => ({
    ...p,
    filteredSnippets: searchQuery
      ? p.snippets.filter(s =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.code || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
      : p.snippets,
    show: !searchQuery || p.snippets.some(s =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.code || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  }))
</script>

<aside class="sidebar">
  <div class="sidebar-top">
    <input
      class="search-bar"
      type="text"
      placeholder="Search snippets..."
      bind:value={searchQuery}
    />
  </div>

  <div class="sidebar-projects">
    {#each filtered as proj (proj.id)}
      {#if proj.show}
        <div class="project-item">
          <div class="project-row" class:active={proj.id === activeProjectId}>
            <button
              class="project-header"
              on:click={() => store.toggleProject(proj.id)}
            >
              <svg
                class="project-chevron"
                class:open={proj.open || searchQuery}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              >
                <polyline points="9 18 15 12 9 6"/>
              </svg>
              <div class="project-icon" style="background:{proj.color}22; color:{proj.color}">
                {projectEmoji(proj.name)}
              </div>
              <span class="project-name">{proj.name}</span>
              <span class="project-count">{proj.snippets.length}</span>
            </button>

            <button
              class="action-btn danger"
              title="Delete project"
              on:click={(e) => deleteProject(e, proj)}
            >
              ×
            </button>
          </div>

          {#if proj.open || searchQuery}
            <div class="snippet-list">
              {#each proj.filteredSnippets as snippet (snippet.id)}
                <div class="snippet-row" class:active={snippet.id === activeSnippetId}>
                  <button
                    class="snippet-item"
                    on:click={() => store.setActiveSnippet(proj.id, snippet.id)}
                  >
                    {snippet.title || 'Untitled'}
                  </button>
                  <button
                    class="action-btn danger"
                    title="Delete snippet"
                    on:click={(e) => deleteSnippet(e, proj, snippet)}
                  >
                    ×
                  </button>
                </div>
              {/each}
              <button
                class="snippet-item new-snippet"
                on:click={() => store.createSnippet(proj.id)}
              >
                + new snippet
              </button>
            </div>
          {/if}
        </div>
      {/if}
    {/each}

    <button class="new-project-btn" on:click={onNewProject}>
      + New Project
    </button>
  </div>
</aside>

<style>
  .sidebar {
    width: 280px;
    background: var(--surface);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .sidebar-top {
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }

  .search-bar {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 12px;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 12px;
    outline: none;
    transition: border 0.15s;
  }
  .search-bar:focus { border-color: var(--accent); }
  .search-bar::placeholder { color: var(--text-muted); }

  .sidebar-projects {
    flex: 1;
    overflow-y: auto;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .sidebar-projects::-webkit-scrollbar { width: 4px; }
  .sidebar-projects::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  .project-item { border-radius: 8px; overflow: hidden; }

  .project-row {
    display: flex;
    align-items: stretch;
    gap: 6px;
  }
  .project-row.active .project-header { background: rgba(91,138,255,0.12); }

  .project-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 10px;
    cursor: pointer;
    width: 100%;
    border-radius: 8px;
    background: transparent;
    border: none;
    color: var(--text-dim);
    transition: background 0.1s;
    text-align: left;
    font-family: var(--font-sans);
  }
  .project-header:hover { background: var(--surface2); }

  .action-btn {
    width: 28px;
    border-radius: 8px;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--font-mono);
    font-size: 14px;
    line-height: 1;
  }
  .action-btn:hover { background: var(--surface2); border-color: var(--border); color: var(--text); }
  .action-btn.danger:hover { color: var(--accent2); border-color: rgba(255,107,107,0.3); background: rgba(255,107,107,0.10); }

  .project-chevron {
    width: 14px; height: 14px;
    color: var(--text-muted);
    transition: transform 0.2s;
    flex-shrink: 0;
  }
  .project-chevron.open { transform: rotate(90deg); }

  .project-icon {
    width: 22px; height: 22px;
    border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
    flex-shrink: 0;
  }

  .project-name {
    font-size: 13px;
    font-weight: 600;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .project-count {
    font-size: 10px;
    color: var(--text-muted);
    background: var(--border);
    padding: 1px 6px;
    border-radius: 10px;
  }

  .snippet-list {
    margin-left: 20px;
    border-left: 1px solid var(--border);
    padding-left: 8px;
    margin-bottom: 4px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .snippet-row {
    display: flex;
    align-items: stretch;
    gap: 6px;
  }
  .snippet-row.active .snippet-item { background: rgba(91,138,255,0.15); color: var(--accent); font-weight: 600; }

  .snippet-item {
    padding: 6px 10px;
    cursor: pointer;
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: all 0.1s;
    background: transparent;
    border: none;
    text-align: left;
    font-family: var(--font-sans);
    width: 100%;
  }
  .snippet-item:hover { background: var(--surface2); color: var(--text-dim); }
  .snippet-item.new-snippet { color: var(--accent); opacity: 0.7; }
  .snippet-item.new-snippet:hover { opacity: 1; }

  .new-project-btn {
    width: fit-content;
    align-self: center;
    text-align: center;
    padding: 8px 14px;
    font-size: 12px;
    color: var(--text-muted);
    background: transparent;
    border: 1px dashed var(--border);
    border-radius: 8px;
    cursor: pointer;
    font-family: var(--font-sans);
    transition: all 0.15s;
    margin-top: 8px;
  }
  .new-project-btn:hover { border-color: var(--accent); color: var(--accent); }
</style>
