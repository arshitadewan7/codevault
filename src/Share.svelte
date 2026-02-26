<script>
  import { decodeSharePayload } from '$lib/share.js'

  export let payloadStr = ''

  let data = null
  let error = ''

  $: {
    error = ''
    data = null
    try {
      const parsed = decodeSharePayload(payloadStr)
      if (!parsed || typeof parsed !== 'object') throw new Error('Invalid payload')
      data = {
        title: parsed.title || 'Untitled Snippet',
        lang: parsed.lang || 'plaintext',
        code: parsed.code || '',
        notes: parsed.notes || '',
      }
    } catch {
      error = 'This shared link is invalid or corrupted.'
    }
  }

  async function copyCode() {
    if (!data) return
    await navigator.clipboard.writeText(data.code || '')
  }

  function goHome() {
    window.location.hash = ''
  }
</script>

<div class="share">
  <header class="share-header">
    <button class="btn-ghost" on:click={goHome}>
      ← Back
    </button>
    <div class="logo">
      <div class="logo-dot" />
      Code<span>Vault</span>
    </div>
  </header>

  <main class="share-main">
    {#if error}
      <div class="error-card">
        <h1>Unable to open share link</h1>
        <p>{error}</p>
      </div>
    {:else if data}
      <div class="card">
        <div class="title-row">
          <h1 class="title">{data.title}</h1>
          <div class="pill">{data.lang}</div>
          <button class="btn-ghost" on:click={copyCode}>Copy code</button>
        </div>

        <pre class="code"><code>{data.code}</code></pre>

        {#if data.notes}
          <div class="notes">
            <div class="notes-title">Notes</div>
            <div class="notes-body">{data.notes}</div>
          </div>
        {/if}
      </div>
    {/if}
  </main>
</div>

<style>
  .share {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .share-header {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  .logo {
    font-family: var(--font-logo);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.3px;
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--text);
  }

  .logo span { color: var(--accent); }

  .logo-dot {
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: 50%;
    display: inline-block;
  }

  .share-main {
    flex: 1;
    overflow: auto;
    padding: 24px;
    background:
      radial-gradient(800px circle at 20% 25%, rgba(91,138,255,0.20), transparent 55%),
      radial-gradient(700px circle at 80% 60%, rgba(255,107,107,0.14), transparent 55%),
      var(--bg);
  }

  .card {
    max-width: 980px;
    margin: 0 auto;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    background: rgba(19, 22, 30, 0.80);
    box-shadow: 0 20px 60px rgba(0,0,0,0.45);
    padding: 18px;
  }

  .error-card {
    max-width: 720px;
    margin: 0 auto;
    border: 1px solid rgba(255,107,107,0.25);
    border-radius: 14px;
    background: rgba(19, 22, 30, 0.80);
    box-shadow: 0 20px 60px rgba(0,0,0,0.45);
    padding: 24px;
  }

  .error-card h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 26px;
    color: var(--text);
  }

  .error-card p {
    margin: 10px 0 0;
    color: var(--text-muted);
    font-size: 14px;
    font-family: var(--font-sans);
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 14px;
  }

  .title {
    margin: 0;
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.3px;
    flex: 1;
    min-width: 240px;
  }

  .pill {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    border: 1px solid var(--border);
    background: var(--surface2);
    padding: 6px 10px;
    border-radius: 999px;
  }

  .code {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 13.5px;
    line-height: 1.7;
    color: #abb2bf;
    background: var(--code-bg);
    border-radius: 12px;
    padding: 18px;
    overflow: auto;
    border: 1px solid rgba(255,255,255,0.06);
  }

  .notes {
    margin-top: 14px;
    border-top: 1px solid var(--border);
    padding-top: 14px;
  }

  .notes-title {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 8px;
  }

  .notes-body {
    white-space: pre-wrap;
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--text-dim);
    line-height: 1.6;
  }
</style>
