<script>
  import { store, LANGUAGES } from '$lib/store.js'
  import { encodeSharePayload, buildShareUrl } from '$lib/share.js'

  export let snippet = null
  export let project = null
  export let previewVersionIndex = null

  let activeTab = 'code'
  let copyFlash = false
  let shareFlash = false

  // The values shown — either live snippet or a version preview
  $: displayCode = previewVersionIndex !== null
    ? (snippet?.versions?.[previewVersionIndex]?.code ?? '')
    : (snippet?.code ?? '')

  $: displayNotes = previewVersionIndex !== null
    ? (snippet?.versions?.[previewVersionIndex]?.notes ?? '')
    : (snippet?.notes ?? '')

  $: displayTitle = previewVersionIndex !== null
    ? (snippet?.versions?.[previewVersionIndex]?.title ?? snippet?.title ?? '')
    : (snippet?.title ?? '')

  $: displayLang = previewVersionIndex !== null
    ? (snippet?.versions?.[previewVersionIndex]?.lang ?? snippet?.lang ?? 'javascript')
    : (snippet?.lang ?? 'javascript')

  $: isReadOnly = previewVersionIndex !== null

  function onTitleInput(e) {
    if (!snippet || isReadOnly) return
    store.updateSnippetField(snippet.id, 'title', e.target.value)
  }

  function onCodeInput(e) {
    if (!snippet || isReadOnly) return
    store.updateSnippetField(snippet.id, 'code', e.target.value)
  }

  function onNotesInput(e) {
    if (!snippet || isReadOnly) return
    store.updateSnippetField(snippet.id, 'notes', e.target.value)
  }

  function removeNotes() {
    if (!snippet || isReadOnly) return
    store.updateSnippetField(snippet.id, 'notes', '')
  }

  function onLangChange(e) {
    if (!snippet || isReadOnly) return
    store.updateSnippetField(snippet.id, 'lang', e.target.value)
  }

  function handleTabKeydown(e) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const el = e.target
      const start = el.selectionStart
      const end = el.selectionEnd
      const val = el.value
      el.value = val.substring(0, start) + '  ' + val.substring(end)
      el.selectionStart = el.selectionEnd = start + 2
      // Trigger store update manually since we bypassed the input event
      if (snippet && !isReadOnly) {
        store.updateSnippetField(snippet.id, 'code', el.value)
      }
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(displayCode)
    copyFlash = true
    setTimeout(() => copyFlash = false, 1500)
  }

  async function shareSnippet() {
    if (!snippet) return
    const payloadStr = encodeSharePayload({
      title: displayTitle,
      lang: displayLang,
      code: displayCode,
      notes: displayNotes,
    })
    const url = buildShareUrl(payloadStr)
    await navigator.clipboard.writeText(url)
    shareFlash = true
    setTimeout(() => shareFlash = false, 1500)
  }

  function deleteSnippet() {
    if (!snippet || !project) return
    if (!confirm('Delete this snippet?')) return
    store.deleteSnippet(project.id, snippet.id)
  }

  function exitPreview() {
    store.exitPreview()
  }

  $: versionLabel = previewVersionIndex !== null
    ? `v${(snippet?.versions?.length ?? 0) - previewVersionIndex}`
    : ''
</script>

<div class="snippet-view">
  {#if previewVersionIndex !== null}
    <div class="diff-banner">
      <span>👁 Viewing <strong>{versionLabel}</strong> — read-only snapshot</span>
      <button class="btn-sm" on:click={exitPreview}>← Back to current</button>
    </div>
  {/if}

  <div class="snippet-topbar">
    <input
      class="snippet-title-input"
      value={displayTitle}
      placeholder="Snippet title..."
      spellcheck="false"
      readonly={isReadOnly}
      on:input={onTitleInput}
    />
    <select class="lang-select" value={displayLang} disabled={isReadOnly} on:change={onLangChange}>
      {#each LANGUAGES as lang}
        <option value={lang}>{lang}</option>
      {/each}
    </select>
    <button class="copy-btn" class:copied={copyFlash} on:click={copyCode}>
      {copyFlash ? 'copied!' : 'copy'}
    </button>
    <button class="copy-btn" class:copied={shareFlash} on:click={shareSnippet}>
      {shareFlash ? 'copied!' : 'share'}
    </button>
    <button class="btn-sm" disabled={isReadOnly} on:click={removeNotes}>
      remove notes
    </button>
    <button class="btn-danger" on:click={deleteSnippet}>delete</button>
  </div>

  <div class="snippet-body">
    <div class="code-toolbar">
      <div class="tabs">
        {#each ['code', 'preview', 'notes'] as tab}
          <button
            class="tab-btn"
            class:active={activeTab === tab}
            on:click={() => activeTab = tab}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        {/each}
      </div>
    </div>

    <div class="editor-area">
      {#if activeTab === 'code'}
        <textarea
          class="code-editor"
          value={displayCode}
          placeholder="// Paste your code here — formatting preserved"
          spellcheck="false"
          readonly={isReadOnly}
          on:input={onCodeInput}
          on:keydown={handleTabKeydown}
        />
      {:else if activeTab === 'preview'}
        <div class="code-preview">
          <pre>{displayCode}</pre>
        </div>
      {:else}
        <textarea
          class="desc-editor"
          value={displayNotes}
          placeholder="Add notes, context, or explanation about this snippet..."
          spellcheck="false"
          readonly={isReadOnly}
          on:input={onNotesInput}
        />
      {/if}
    </div>
  </div>
</div>

<style>
  .snippet-view {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .diff-banner {
    padding: 10px 24px;
    background: rgba(255,107,107,0.1);
    border-bottom: 1px solid rgba(255,107,107,0.2);
    font-size: 12px;
    color: var(--accent2);
    font-family: var(--font-mono);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .diff-banner strong { font-weight: 700; }

  .snippet-topbar {
    padding: 16px 24px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    background: var(--surface);
  }

  .snippet-title-input {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    background: transparent;
    border: none;
    color: var(--text);
    outline: none;
    flex: 1;
    min-width: 200px;
  }
  .snippet-title-input::placeholder { color: var(--text-muted); }
  .snippet-title-input:read-only { opacity: 0.7; }

  .lang-select {
    font-family: var(--font-mono);
    font-size: 12px;
    background: var(--surface2);
    border: 1px solid var(--border);
    color: var(--text-dim);
    padding: 6px 10px;
    border-radius: 6px;
    outline: none;
    cursor: pointer;
  }
  .lang-select:focus { border-color: var(--accent); }
  .lang-select:disabled { opacity: 0.6; cursor: default; }

  .copy-btn {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--surface2);
    color: var(--text-dim);
    border: 1px solid var(--border);
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .copy-btn:hover { color: var(--accent); border-color: var(--accent); }
  .copy-btn.copied { color: var(--green); border-color: var(--green); }

  .btn-danger {
    background: transparent;
    color: var(--accent2);
    padding: 6px 12px;
    font-size: 12px;
    border: 1px solid rgba(255,107,107,0.3);
    border-radius: 6px;
    cursor: pointer;
    font-family: var(--font-sans);
    font-weight: 600;
    transition: all 0.15s;
  }
  .btn-danger:hover { background: rgba(255,107,107,0.1); }

  .snippet-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .code-toolbar {
    padding: 10px 24px;
    border-bottom: 1px solid var(--border);
    background: var(--surface2);
    display: flex;
    align-items: center;
  }

  .tabs { display: flex; gap: 4px; }

  .tab-btn {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    padding: 5px 14px;
    border-radius: 6px;
    cursor: pointer;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-muted);
    transition: all 0.15s;
  }
  .tab-btn.active { background: var(--surface); border-color: var(--border); color: var(--text); }
  .tab-btn:hover:not(.active) { color: var(--text-dim); }

  .editor-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .code-editor {
    flex: 1;
    width: 100%;
    background: var(--code-bg);
    color: #abb2bf;
    font-family: var(--font-mono);
    font-size: 13.5px;
    line-height: 1.7;
    padding: 24px;
    border: none;
    outline: none;
    resize: none;
    tab-size: 2;
    white-space: pre;
    overflow-wrap: normal;
    overflow-x: auto;
  }

  .code-preview {
    flex: 1;
    background: var(--code-bg);
    padding: 24px;
    overflow: auto;
  }
  .code-preview pre {
    font-family: var(--font-mono);
    font-size: 13.5px;
    line-height: 1.7;
    color: #abb2bf;
    white-space: pre;
    tab-size: 2;
    margin: 0;
  }

  .desc-editor {
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-dim);
    background: var(--code-bg);
    padding: 24px;
    border: none;
    outline: none;
    resize: none;
    width: 100%;
    flex: 1;
  }
  .desc-editor::placeholder { color: var(--text-muted); }

  .btn-sm {
    font-family: var(--font-sans);
    font-size: 11px;
    background: var(--surface2);
    color: var(--text-dim);
    border: 1px solid var(--border);
    padding: 4px 10px;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.15s;
    font-weight: 600;
  }
  .btn-sm:hover { color: var(--text); background: var(--border); }
</style>
