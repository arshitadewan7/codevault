<script>
  import { store, timeLabel } from '$lib/store.js'

  export let snippet = null
  export let previewVersionIndex = null

  let commitMsg = ''
  let saveFlash = false

  function handleSave() {
    if (!snippet) return
    store.saveVersion(snippet.id, commitMsg)
    commitMsg = ''
    saveFlash = true
    setTimeout(() => saveFlash = false, 1500)
  }

  function handlePreview(i) {
    store.setPreviewVersion(i)
  }

  function handleExitPreview() {
    store.exitPreview()
  }

  function handleRestore() {
    if (previewVersionIndex === null) return
    if (!confirm(`Restore v${(snippet.versions.length - previewVersionIndex)}? Current code will be overwritten.`)) return
    store.restoreVersion(snippet.id, previewVersionIndex)
  }
</script>

{#if snippet}
<aside class="version-panel">
  <div class="version-header">
    <h3>Versions</h3>
  </div>

  <div class="version-list">
    <!-- Current -->
    <button
      class="version-entry"
      class:current={previewVersionIndex === null}
      on:click={handleExitPreview}
    >
      <div class="version-num">
        current
        <span class="version-badge">LIVE</span>
      </div>
      <div class="version-msg">Working copy</div>
      <div class="version-time">now</div>
    </button>

    {#each (snippet.versions || []) as version, i (version.id)}
      <button
        class="version-entry"
        class:previewing={previewVersionIndex === i}
        on:click={() => handlePreview(i)}
      >
        <div class="version-num" class:preview-num={previewVersionIndex === i}>
          v{snippet.versions.length - i}
        </div>
        <div class="version-msg">{version.msg}</div>
        <div class="version-time">{timeLabel(version.timestamp)}</div>
      </button>
    {/each}
  </div>

  <div class="version-footer">
    <input
      class="commit-input"
      bind:value={commitMsg}
      placeholder="Describe changes..."
      maxlength="60"
      on:keydown={e => e.key === 'Enter' && handleSave()}
    />
    <button class="save-btn" on:click={handleSave}>
      {saveFlash ? '✓ Saved!' : '💾 Save Version'}
    </button>
    {#if previewVersionIndex !== null}
      <button class="restore-btn" on:click={handleRestore}>
        ↩ Restore this version
      </button>
    {/if}
  </div>
</aside>
{/if}

<style>
  .version-panel {
    width: 260px;
    border-left: 1px solid var(--border);
    background: var(--surface);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .version-header {
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .version-header h3 {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin: 0;
  }

  .version-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .version-list::-webkit-scrollbar { width: 3px; }
  .version-list::-webkit-scrollbar-thumb { background: var(--border); }

  .version-entry {
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s;
    background: transparent;
    text-align: left;
    width: 100%;
    font-family: 'Syne', sans-serif;
    color: var(--text);
  }
  .version-entry:hover { background: var(--surface2); border-color: var(--border); }
  .version-entry.current { border-color: rgba(91,138,255,0.4); background: rgba(91,138,255,0.07); }
  .version-entry.previewing { border-color: rgba(255,107,107,0.4); background: rgba(255,107,107,0.07); }

  .version-num {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    font-family: 'JetBrains Mono', monospace;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .version-num.preview-num { color: var(--accent2); }

  .version-badge {
    font-size: 9px;
    background: rgba(91,138,255,0.2);
    color: var(--accent);
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 700;
  }

  .version-msg {
    font-size: 12px;
    color: var(--text-dim);
    margin: 3px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .version-time {
    font-size: 10px;
    color: var(--text-muted);
    font-family: 'JetBrains Mono', monospace;
  }

  .version-footer {
    padding: 12px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .commit-input {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 7px 10px;
    color: var(--text);
    outline: none;
    width: 100%;
    transition: border 0.15s;
  }
  .commit-input:focus { border-color: var(--accent); }
  .commit-input::placeholder { color: var(--text-muted); }

  .save-btn {
    width: 100%;
    padding: 8px;
    background: var(--accent);
    color: white;
    font-family: 'Syne', sans-serif;
    font-size: 12px;
    font-weight: 700;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    transition: all 0.15s;
    letter-spacing: 0.5px;
  }
  .save-btn:hover { background: #7aa3ff; }

  .restore-btn {
    width: 100%;
    padding: 8px;
    background: rgba(255,107,107,0.15);
    color: var(--accent2);
    font-family: 'Syne', sans-serif;
    font-size: 12px;
    font-weight: 700;
    border-radius: 6px;
    border: 1px solid rgba(255,107,107,0.3);
    cursor: pointer;
    transition: all 0.15s;
  }
  .restore-btn:hover { background: rgba(255,107,107,0.25); }
</style>
