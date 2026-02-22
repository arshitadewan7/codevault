<script>
  import { store, COLORS } from '../lib/store.js'

  export let open = false
  export let onClose = () => {}

  let name = ''
  let desc = ''
  let selectedColor = COLORS[0]

  function handleCreate() {
    if (!name.trim()) return
    const proj = store.createProject({ name: name.trim(), color: selectedColor, desc: desc.trim() })
    store.createSnippet(proj.id)
    name = ''
    desc = ''
    selectedColor = COLORS[0]
    onClose()
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') onClose()
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="overlay" on:click|self={onClose}>
    <div class="modal">
      <h2>New Project</h2>

      <div class="form-group">
        <label for="proj-name">Project Name</label>
        <!-- svelte-ignore a11y-autofocus -->
        <input
          id="proj-name"
          class="form-input"
          bind:value={name}
          placeholder="e.g. React Auth Module"
          maxlength="40"
          autofocus
          on:keydown={e => e.key === 'Enter' && handleCreate()}
        />
      </div>

      <div class="form-group">
        <label>Color</label>
        <div class="swatches">
          {#each COLORS as color}
            <button
              class="swatch"
              class:selected={color === selectedColor}
              style="background:{color}"
              on:click={() => selectedColor = color}
              title={color}
            />
          {/each}
        </div>
      </div>

      <div class="form-group">
        <label for="proj-desc">Description (optional)</label>
        <input
          id="proj-desc"
          class="form-input"
          bind:value={desc}
          placeholder="What is this project about?"
        />
      </div>

      <div class="modal-actions">
        <button class="btn-ghost" on:click={onClose}>Cancel</button>
        <button class="btn-primary" on:click={handleCreate}>Create Project</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }

  .modal {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 28px;
    width: 420px;
    max-width: 90vw;
    animation: modalIn 0.2s ease;
  }

  @keyframes modalIn {
    from { opacity: 0; transform: scale(0.95) translateY(-10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  h2 {
    font-size: 18px;
    font-weight: 800;
    margin-bottom: 20px;
    color: var(--text);
  }

  .form-group { margin-bottom: 16px; }

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .form-input {
    width: 100%;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
    color: var(--text);
    font-family: 'Syne', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border 0.15s;
  }
  .form-input:focus { border-color: var(--accent); }

  .swatches { display: flex; gap: 8px; flex-wrap: wrap; }

  .swatch {
    width: 28px; height: 28px;
    border-radius: 6px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.15s;
    padding: 0;
  }
  .swatch:hover { transform: scale(1.15); }
  .swatch.selected { border-color: white; transform: scale(1.15); }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-top: 24px;
  }

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
  .btn-primary:hover { background: #7aa3ff; }

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
</style>
