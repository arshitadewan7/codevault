<script>
  import { store } from '$lib/store.js'

  export let project = null

  let inviteEmail = ''
  let inviteRole = 'editor'
  let collapsed = false

  $: collaborators = project?.collaborators || []
  $: invites = project?.invites || []
  $: role = project ? store.getRole(project.id) : null

  function roleLabel(userId) {
    const profile = store.profileFor(userId)
    return profile?.full_name || profile?.email || 'User'
  }

  function canManage() {
    return role === 'owner'
  }

  async function sendInvite() {
    if (!project || !inviteEmail.trim()) return
    await store.inviteCollaborator(project.id, inviteEmail.trim(), inviteRole)
    inviteEmail = ''
  }

  async function removeCollaborator(collab) {
    if (!collab || !canManage()) return
    if (!confirm('Remove this collaborator?')) return
    await store.removeCollaborator(collab.id)
  }

  async function acceptInvite(invite) {
    if (!invite) return
    await store.acceptInvite(invite.id)
  }
</script>

{#if project}
  <aside class="collab-panel" class:collapsed={collapsed}>
    <div class="panel-header">
      <div class="panel-title" class:collapsed={collapsed}>
        <h3>Collab</h3>
        {#if !collapsed}
          <span class="role-chip">{role || 'Viewer'}</span>
        {/if}
      </div>
      <button class="collapse-btn" on:click={() => collapsed = !collapsed}>
        {collapsed ? '→' : '←'}
      </button>
    </div>

    {#if !collapsed}
      <div class="panel-section">
        <div class="section-title">People</div>
        <div class="collab-list">
          {#each collaborators as collab (collab.id)}
            <div class="collab-row">
              <div class="collab-avatar">{roleLabel(collab.user_id)[0]}</div>
              <div class="collab-meta">
                <div class="collab-name">{roleLabel(collab.user_id)}</div>
                <div class="collab-role">{collab.role}</div>
              </div>
              {#if canManage() && collab.role !== 'owner'}
                <button class="btn-remove" on:click={() => removeCollaborator(collab)}>Remove</button>
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="panel-section">
        <div class="section-title">Invites</div>
        <div class="invite-list">
          {#if invites.length}
            {#each invites as invite (invite.id)}
              <div class="invite-row">
                <div class="invite-email">{invite.email}</div>
                <div class="invite-role">{invite.role}</div>
                <div class="invite-status">{invite.status}</div>
                {#if invite.status === 'pending'}
                  <button class="btn-accept" on:click={() => acceptInvite(invite)}>Accept</button>
                {/if}
              </div>
            {/each}
          {:else}
            <div class="invite-empty">No pending invites.</div>
          {/if}
        </div>
      </div>

      <div class="panel-section">
        <div class="section-title">Invite someone</div>
        <div class="invite-form">
          <input
            type="email"
            placeholder="collaborator@email.com"
            bind:value={inviteEmail}
            disabled={!canManage()}
          />
          <select bind:value={inviteRole} disabled={!canManage()}>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button class="btn-send" disabled={!inviteEmail.trim() || !canManage()} on:click={sendInvite}>
            Send invite
          </button>
        </div>
        {#if !canManage()}
          <div class="hint">Only owners can invite collaborators.</div>
        {/if}
      </div>
    {/if}
  </aside>
{/if}

<style>
  .collab-panel {
    width: 280px;
    border-left: 1px solid var(--border);
    background: var(--surface2);
    display: flex;
    flex-direction: column;
    padding: 16px;
    gap: 14px;
    overflow-y: auto;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .panel-title.collapsed {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    gap: 0;
  }

  .panel-header h3 {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-muted);
    margin: 0;
  }

  .role-chip {
    font-size: 10px;
    border: 1px solid var(--border);
    padding: 2px 8px;
    border-radius: 999px;
    color: var(--text-dim);
  }

  .collapse-btn {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 10px;
    cursor: pointer;
  }

  .collapse-btn:hover { color: var(--text); border-color: var(--accent); }

  .collab-panel.collapsed {
    width: 44px;
    padding: 12px 8px;
    overflow: hidden;
    align-items: center;
  }

  .collab-panel.collapsed .panel-header {
    flex-direction: column;
    gap: 8px;
  }

  .collab-panel.collapsed .panel-section {
    display: none;
  }

  .panel-section { display: flex; flex-direction: column; gap: 10px; }

  .section-title {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }

  .collab-list, .invite-list { display: flex; flex-direction: column; gap: 8px; }

  .collab-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: rgba(19, 22, 30, 0.6);
  }

  .collab-avatar {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(91,138,255,0.15);
    color: var(--accent);
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  .collab-meta { flex: 1; }

  .collab-name {
    font-size: 12px;
    color: var(--text);
  }

  .collab-role {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .btn-remove {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-muted);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 10px;
    cursor: pointer;
  }

  .btn-remove:hover { color: var(--accent2); border-color: rgba(255,107,107,0.3); }

  .invite-row {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 6px;
    align-items: center;
    padding: 6px 8px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: rgba(13, 15, 20, 0.65);
    font-size: 11px;
    color: var(--text-dim);
  }

  .invite-status {
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }

  .btn-accept {
    border: 1px solid var(--border);
    background: rgba(74,222,128,0.1);
    color: var(--green);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 10px;
    cursor: pointer;
  }

  .invite-empty {
    font-size: 11px;
    color: var(--text-muted);
  }

  .invite-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .invite-form input,
  .invite-form select {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    padding: 8px 10px;
    font-size: 12px;
  }

  .btn-send {
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .btn-send:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .hint {
    font-size: 11px;
    color: var(--text-muted);
  }

  @media (max-width: 1100px) {
    .collab-panel { display: none; }
  }
</style>
