import { writable, get } from 'svelte/store'
import { supabase } from './supabase.js'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function nowIso() {
  return new Date().toISOString()
}

function byCreatedAtAsc(a, b) {
  return new Date(a.created_at || 0) - new Date(b.created_at || 0)
}

function byCreatedAtDesc(a, b) {
  return new Date(b.created_at || 0) - new Date(a.created_at || 0)
}

function buildProjectMap(projects) {
  const map = new Map()
  for (const p of projects) map.set(p.id, p)
  return map
}

function colorFromId(id = '') {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 360
  return `hsl(${hash}, 70%, 55%)`
}

let realtimeChannels = []
let presenceChannel = null

const pendingSnippetUpdates = new Map()
const snippetUpdateTimers = new Map()

async function ensureProfile(user) {
  if (!user) return
  const profile = { id: user.id, email: user.email }
  await supabase.from('profiles').upsert(profile)
}

async function fetchProfiles(userIds = []) {
  if (!userIds.length) return []
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .in('id', userIds)
  return data || []
}

function mergeProfiles(state, profiles) {
  const next = { ...state.profiles }
  for (const p of profiles || []) next[p.id] = p
  state.profiles = next
}

function normalizeProjects(projects, collaborators, invites, snippets, versions, comments) {
  const collabByProject = new Map()
  for (const c of collaborators || []) {
    const list = collabByProject.get(c.project_id) || []
    list.push(c)
    collabByProject.set(c.project_id, list)
  }

  const invitesByProject = new Map()
  for (const inv of invites || []) {
    const list = invitesByProject.get(inv.project_id) || []
    list.push(inv)
    invitesByProject.set(inv.project_id, list)
  }

  const snippetsByProject = new Map()
  for (const sn of snippets || []) {
    const list = snippetsByProject.get(sn.project_id) || []
    list.push({ ...sn, versions: [], comments: [] })
    snippetsByProject.set(sn.project_id, list)
  }

  const versionsBySnippet = new Map()
  for (const v of versions || []) {
    const list = versionsBySnippet.get(v.snippet_id) || []
    list.push(v)
    versionsBySnippet.set(v.snippet_id, list)
  }

  const commentsBySnippet = new Map()
  for (const c of comments || []) {
    const list = commentsBySnippet.get(c.snippet_id) || []
    list.push(c)
    commentsBySnippet.set(c.snippet_id, list)
  }

  return (projects || []).map(p => {
    const projectSnippets = (snippetsByProject.get(p.id) || []).map(sn => ({
      ...sn,
      versions: (versionsBySnippet.get(sn.id) || []).sort(byCreatedAtDesc),
      comments: (commentsBySnippet.get(sn.id) || []).sort(byCreatedAtAsc),
    }))

    return {
      ...p,
      open: p.open ?? true,
      collaborators: (collabByProject.get(p.id) || []).sort((a, b) => a.role.localeCompare(b.role)),
      invites: (invitesByProject.get(p.id) || []).sort(byCreatedAtDesc),
      snippets: projectSnippets.sort(byCreatedAtAsc),
    }
  })
}

async function clearRealtime() {
  for (const ch of realtimeChannels) {
    await supabase.removeChannel(ch)
  }
  realtimeChannels = []
}

async function clearPresence() {
  if (presenceChannel) {
    await supabase.removeChannel(presenceChannel)
    presenceChannel = null
  }
}

function createStore() {
  const { subscribe, set, update } = writable({
    user: null,
    authStatus: 'idle',
    authError: null,
    projects: [],
    activeProjectId: null,
    activeSnippetId: null,
    previewVersionIndex: null,
    loading: true,
    presence: [],
    profiles: {},
  })

  async function loadAll() {
    const state = get({ subscribe })
    if (!state.user) return
    update(s => ({ ...s, loading: true }))

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })

    const projectIds = (projects || []).map(p => p.id)

    const [collabRes, inviteRes, snippetRes] = await Promise.all([
      supabase.from('project_collaborators').select('*').in('project_id', projectIds),
      supabase.from('project_invites').select('*').in('project_id', projectIds),
      supabase.from('snippets').select('*').in('project_id', projectIds),
    ])

    const snippets = snippetRes.data || []
    const snippetIds = snippets.map(sn => sn.id)

    const [versionRes, commentRes] = await Promise.all([
      supabase.from('snippet_versions').select('*').in('snippet_id', snippetIds),
      supabase.from('snippet_comments').select('*').in('snippet_id', snippetIds),
    ])

    const collaborators = collabRes.data || []
    const invites = inviteRes.data || []
    const versions = versionRes.data || []
    const comments = commentRes.data || []

    const profileIds = new Set([
      ...collaborators.map(c => c.user_id),
      ...comments.map(c => c.author_id),
      ...(state.user?.id ? [state.user.id] : []),
    ])

    const profiles = await fetchProfiles([...profileIds])

    update(s => {
      mergeProfiles(s, profiles)
      s.projects = normalizeProjects(projects, collaborators, invites, snippets, versions, comments)
      s.loading = false
      if (!s.activeProjectId && s.projects.length) s.activeProjectId = s.projects[0].id
      if (s.activeProjectId && !s.activeSnippetId) {
        const proj = s.projects.find(p => p.id === s.activeProjectId)
        const first = proj?.snippets?.[0]
        if (first) s.activeSnippetId = first.id
      }
      return s
    })

    await setupRealtime(projectIds, snippetIds)
  }

  async function setupRealtime(projectIds = [], snippetIds = []) {
    await clearRealtime()
    if (!projectIds.length) return

    const projectFilter = `id=in.(${projectIds.join(',')})`
    const byProjectFilter = `project_id=in.(${projectIds.join(',')})`
    const bySnippetFilter = snippetIds.length ? `snippet_id=in.(${snippetIds.join(',')})` : 'snippet_id=eq.__none__'

    const projectChannel = supabase.channel(`realtime-projects-${uid()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: projectFilter }, payload => {
        update(s => applyProjectChange(s, payload))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_collaborators', filter: byProjectFilter }, payload => {
        update(s => applyCollaboratorChange(s, payload))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_invites', filter: byProjectFilter }, payload => {
        update(s => applyInviteChange(s, payload))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'snippets', filter: byProjectFilter }, payload => {
        update(s => applySnippetChange(s, payload))
      })

    const commentChannel = supabase.channel(`realtime-comments-${uid()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'snippet_comments', filter: bySnippetFilter }, payload => {
        update(s => applyCommentChange(s, payload))
        if (payload.new?.author_id) {
          fetchProfiles([payload.new.author_id]).then(profiles => {
            update(s => { mergeProfiles(s, profiles); return s })
          })
        }
      })

    const versionChannel = supabase.channel(`realtime-versions-${uid()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'snippet_versions', filter: bySnippetFilter }, payload => {
        update(s => applyVersionChange(s, payload))
      })

    realtimeChannels.push(projectChannel, commentChannel, versionChannel)
    await Promise.all(realtimeChannels.map(ch => ch.subscribe()))
  }

  function applyProjectChange(state, payload) {
    const { eventType, new: newRow, old } = payload
    const projects = [...state.projects]
    const idx = projects.findIndex(p => p.id === (newRow?.id || old?.id))
    if (eventType === 'INSERT') {
      projects.push({ ...newRow, open: true, snippets: [], collaborators: [], invites: [] })
    }
    if (eventType === 'UPDATE' && idx >= 0) {
      projects[idx] = { ...projects[idx], ...newRow }
    }
    if (eventType === 'DELETE' && idx >= 0) {
      projects.splice(idx, 1)
    }
    state.projects = projects
    return state
  }

  function applyCollaboratorChange(state, payload) {
    const { eventType, new: newRow, old } = payload
    const projects = [...state.projects]
    const project = projects.find(p => p.id === (newRow?.project_id || old?.project_id))
    if (!project) return state
    const list = project.collaborators ? [...project.collaborators] : []
    const idx = list.findIndex(c => c.id === (newRow?.id || old?.id))
    if (eventType === 'INSERT') list.push(newRow)
    if (eventType === 'UPDATE' && idx >= 0) list[idx] = { ...list[idx], ...newRow }
    if (eventType === 'DELETE' && idx >= 0) list.splice(idx, 1)
    project.collaborators = list
    state.projects = projects
    if (newRow?.user_id) {
      fetchProfiles([newRow.user_id]).then(profiles => {
        update(s => { mergeProfiles(s, profiles); return s })
      })
    }
    return state
  }

  function applyInviteChange(state, payload) {
    const { eventType, new: newRow, old } = payload
    const projects = [...state.projects]
    const project = projects.find(p => p.id === (newRow?.project_id || old?.project_id))
    if (!project) return state
    const list = project.invites ? [...project.invites] : []
    const idx = list.findIndex(i => i.id === (newRow?.id || old?.id))
    if (eventType === 'INSERT') list.push(newRow)
    if (eventType === 'UPDATE' && idx >= 0) list[idx] = { ...list[idx], ...newRow }
    if (eventType === 'DELETE' && idx >= 0) list.splice(idx, 1)
    project.invites = list
    state.projects = projects
    return state
  }

  function applySnippetChange(state, payload) {
    const { eventType, new: newRow, old } = payload
    const projects = [...state.projects]
    const project = projects.find(p => p.id === (newRow?.project_id || old?.project_id))
    if (!project) return state
    const list = project.snippets ? [...project.snippets] : []
    const idx = list.findIndex(sn => sn.id === (newRow?.id || old?.id))
    const currentUser = state.user?.id
    if (eventType === 'INSERT') list.push({ ...newRow, versions: [], comments: [] })
    if (eventType === 'UPDATE' && idx >= 0) {
      if (newRow.updated_by && newRow.updated_by === currentUser) return state
      list[idx] = { ...list[idx], ...newRow }
    }
    if (eventType === 'DELETE' && idx >= 0) list.splice(idx, 1)
    project.snippets = list.sort(byCreatedAtAsc)
    state.projects = projects
    return state
  }

  function applyVersionChange(state, payload) {
    const { eventType, new: newRow, old } = payload
    const projects = [...state.projects]
    for (const project of projects) {
      const sn = project.snippets?.find(s => s.id === (newRow?.snippet_id || old?.snippet_id))
      if (!sn) continue
      const list = sn.versions ? [...sn.versions] : []
      const idx = list.findIndex(v => v.id === (newRow?.id || old?.id))
      if (eventType === 'INSERT') list.unshift(newRow)
      if (eventType === 'UPDATE' && idx >= 0) list[idx] = { ...list[idx], ...newRow }
      if (eventType === 'DELETE' && idx >= 0) list.splice(idx, 1)
      sn.versions = list.sort(byCreatedAtDesc)
      break
    }
    state.projects = projects
    return state
  }

  function applyCommentChange(state, payload) {
    const { eventType, new: newRow, old } = payload
    const projects = [...state.projects]
    for (const project of projects) {
      const sn = project.snippets?.find(s => s.id === (newRow?.snippet_id || old?.snippet_id))
      if (!sn) continue
      const list = sn.comments ? [...sn.comments] : []
      const idx = list.findIndex(c => c.id === (newRow?.id || old?.id))
      if (eventType === 'INSERT') list.push(newRow)
      if (eventType === 'UPDATE' && idx >= 0) list[idx] = { ...list[idx], ...newRow }
      if (eventType === 'DELETE' && idx >= 0) list.splice(idx, 1)
      sn.comments = list.sort(byCreatedAtAsc)
      break
    }
    state.projects = projects
    return state
  }

  function scheduleSnippetUpdate(snippetId, patch) {
    const queued = pendingSnippetUpdates.get(snippetId) || {}
    pendingSnippetUpdates.set(snippetId, { ...queued, ...patch })
    if (snippetUpdateTimers.get(snippetId)) return
    const timer = setTimeout(async () => {
      snippetUpdateTimers.delete(snippetId)
      const updatePatch = pendingSnippetUpdates.get(snippetId)
      pendingSnippetUpdates.delete(snippetId)
      if (!updatePatch) return
      const state = get({ subscribe })
      const userId = state.user?.id
      const patchWithMeta = { ...updatePatch, updated_at: nowIso(), updated_by: userId }
      await supabase.from('snippets').update(patchWithMeta).eq('id', snippetId)
    }, 320)
    snippetUpdateTimers.set(snippetId, timer)
  }

  async function init() {
    const { data } = await supabase.auth.getSession()
    const session = data?.session
    if (session?.user) {
      await ensureProfile(session.user)
      update(s => ({ ...s, user: session.user }))
      await loadAll()
    } else {
      update(s => ({ ...s, loading: false }))
    }

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (nextSession?.user) {
        await ensureProfile(nextSession.user)
        update(s => ({ ...s, user: nextSession.user }))
        await loadAll()
      } else {
        await clearRealtime()
        await clearPresence()
        set({
          user: null,
          authStatus: 'idle',
          authError: null,
          projects: [],
          activeProjectId: null,
          activeSnippetId: null,
          previewVersionIndex: null,
          loading: false,
          presence: [],
          profiles: {},
        })
      }
    })
  }

  async function login(email, password) {
    update(s => ({ ...s, authStatus: 'sending', authError: null }))
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      update(s => ({ ...s, authStatus: 'error', authError: error.message }))
      return
    }
    update(s => ({ ...s, authStatus: 'idle', authError: null }))
  }

  async function signup(email, password) {
    update(s => ({ ...s, authStatus: 'sending', authError: null }))
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      update(s => ({ ...s, authStatus: 'error', authError: error.message }))
      return
    }
    if (data?.session) {
      update(s => ({ ...s, authStatus: 'idle', authError: null }))
      return
    }
    update(s => ({ ...s, authStatus: 'signup-success', authError: null }))
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  function clearAuthError() {
    update(s => ({ ...s, authStatus: 'idle', authError: null }))
  }

  async function createProject({ name, color, desc }) {
    const state = get({ subscribe })
    if (!state.user) return null
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, color, "desc": desc, owner_id: state.user.id })
      .select('*')
      .single()
    if (error) {
      alert(error.message)
      return null
    }
    await supabase.from('project_collaborators').insert({
      project_id: data.id,
      user_id: state.user.id,
      role: 'owner',
    })
    update(s => {
      s.projects = [...s.projects, { ...data, open: true, snippets: [], collaborators: [], invites: [] }]
      s.activeProjectId = data.id
      return s
    })
    await loadAll()
    return data
  }

  async function deleteProject(projectId) {
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) alert(error.message)
  }

  function toggleProject(projectId) {
    update(s => {
      const p = s.projects.find(p => p.id === projectId)
      if (p) {
        p.open = !p.open
        if (p.open) s.activeProjectId = projectId
      }
      return s
    })
  }

  async function createSnippet(projectId) {
    const snippet = {
      project_id: projectId,
      title: 'Untitled Snippet',
      code: '',
      notes: '',
      lang: 'javascript',
      created_at: nowIso(),
    }
    const { data, error } = await supabase
      .from('snippets')
      .insert(snippet)
      .select('*')
      .single()
    if (error) {
      alert(error.message)
      return null
    }
    update(s => {
      const p = s.projects.find(p => p.id === projectId)
      if (p) {
        p.snippets = [...(p.snippets || []), { ...data, versions: [], comments: [] }]
        p.open = true
      }
      s.activeProjectId = projectId
      s.activeSnippetId = data.id
      s.previewVersionIndex = null
      return s
    })
    return data
  }

  async function deleteSnippet(projectId, snippetId) {
    const { error } = await supabase.from('snippets').delete().eq('id', snippetId)
    if (error) alert(error.message)
  }

  function setActiveSnippet(projectId, snippetId) {
    update(s => {
      s.activeProjectId = projectId
      s.activeSnippetId = snippetId
      s.previewVersionIndex = null
      const p = s.projects.find(p => p.id === projectId)
      if (p) p.open = true
      return s
    })
    startPresence(snippetId)
  }

  function updateSnippetField(snippetId, field, value) {
    update(s => {
      for (const p of s.projects) {
        const sn = p.snippets.find(sn => sn.id === snippetId)
        if (sn) { sn[field] = value; break }
      }
      return s
    })
    scheduleSnippetUpdate(snippetId, { [field]: value })
  }

  async function saveVersion(snippetId, msg) {
    const state = get({ subscribe })
    let snapshot = null
    for (const p of state.projects) {
      snapshot = p.snippets.find(sn => sn.id === snippetId)
      if (snapshot) break
    }
    if (!snapshot) return
    const payload = {
      snippet_id: snippetId,
      code: snapshot.code,
      notes: snapshot.notes,
      lang: snapshot.lang,
      title: snapshot.title,
      msg: msg || 'Snapshot',
      created_at: nowIso(),
      author_id: state.user?.id,
    }
    const { error } = await supabase
      .from('snippet_versions')
      .insert(payload)
    if (error) {
      alert(error.message)
      return
    }

    const { data: versions, error: fetchError } = await supabase
      .from('snippet_versions')
      .select('*')
      .eq('snippet_id', snippetId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      alert(fetchError.message)
      return
    }

    update(s => {
      for (const p of s.projects) {
        const sn = p.snippets.find(sn => sn.id === snippetId)
        if (sn) {
          sn.versions = versions || []
          break
        }
      }
      return s
    })
  }

  async function restoreVersion(snippetId, versionIndex) {
    const state = get({ subscribe })
    let version = null
    for (const p of state.projects) {
      const sn = p.snippets.find(sn => sn.id === snippetId)
      if (sn) {
        version = sn.versions?.[versionIndex]
        break
      }
    }
    if (!version) return
    await supabase.from('snippets')
      .update({
        code: version.code || '',
        notes: version.notes || '',
        lang: version.lang,
        title: version.title,
        updated_at: nowIso(),
        updated_by: state.user?.id,
      })
      .eq('id', snippetId)
    update(s => { s.previewVersionIndex = null; return s })
  }

  async function deleteVersion(snippetId, versionId) {
    const { error } = await supabase.from('snippet_versions').delete().eq('id', versionId)
    if (error) alert(error.message)
  }

  async function clearVersions(snippetId) {
    const { error } = await supabase.from('snippet_versions').delete().eq('snippet_id', snippetId)
    if (error) alert(error.message)
  }

  function setPreviewVersion(index) {
    update(s => { s.previewVersionIndex = index; return s })
  }

  function exitPreview() {
    update(s => { s.previewVersionIndex = null; return s })
  }

  async function addComment(snippetId, body) {
    const state = get({ subscribe })
    const payload = {
      snippet_id: snippetId,
      body,
      author_id: state.user?.id,
      created_at: nowIso(),
    }
    const { error } = await supabase.from('snippet_comments').insert(payload)
    if (error) alert(error.message)
  }

  async function deleteComment(commentId) {
    const { error } = await supabase.from('snippet_comments').delete().eq('id', commentId)
    if (error) alert(error.message)
  }

  async function inviteCollaborator(projectId, email, role) {
    const state = get({ subscribe })
    const { error } = await supabase.from('project_invites').insert({
      project_id: projectId,
      email,
      role,
      invited_by: state.user?.id,
      status: 'pending',
    })
    if (error) alert(error.message)
  }

  async function acceptInvite(inviteId) {
    const state = get({ subscribe })
    const { data: invite, error } = await supabase
      .from('project_invites')
      .select('*')
      .eq('id', inviteId)
      .single()
    if (error || !invite) {
      if (error) alert(error.message)
      return
    }
    await supabase.from('project_collaborators').insert({
      project_id: invite.project_id,
      user_id: state.user?.id,
      role: invite.role || 'editor',
    })
    await supabase.from('project_invites').update({ status: 'accepted' }).eq('id', inviteId)
    await loadAll()
  }

  async function removeCollaborator(collabId) {
    const { error } = await supabase.from('project_collaborators').delete().eq('id', collabId)
    if (error) alert(error.message)
  }

  function getRole(projectId) {
    const state = get({ subscribe })
    const project = state.projects.find(p => p.id === projectId)
    if (!project || !state.user) return null
    const collab = project.collaborators?.find(c => c.user_id === state.user.id)
    return collab?.role || (project.owner_id === state.user.id ? 'owner' : null)
  }

  function profileFor(userId) {
    const state = get({ subscribe })
    return state.profiles?.[userId] || null
  }

  async function startPresence(snippetId) {
    const state = get({ subscribe })
    if (!state.user || !snippetId) return
    await clearPresence()
    const profile = state.profiles?.[state.user.id]
    const payload = {
      user_id: state.user.id,
      email: profile?.email || state.user.email,
      color: colorFromId(state.user.id),
    }

    presenceChannel = supabase.channel(`presence-snippet-${snippetId}`, {
      config: { presence: { key: state.user.id } },
    })

    presenceChannel.on('presence', { event: 'sync' }, () => {
      const statePresence = presenceChannel.presenceState()
      const flattened = Object.values(statePresence).flat()
      update(s => { s.presence = flattened; return s })
    })

    presenceChannel.subscribe(async status => {
      if (status !== 'SUBSCRIBED') return
      await presenceChannel.track(payload)
    })
  }

  return {
    subscribe,
    init,
    login,
    signup,
    logout,
    clearAuthError,
    createProject,
    deleteProject,
    toggleProject,
    createSnippet,
    deleteSnippet,
    setActiveSnippet,
    updateSnippetField,
    saveVersion,
    restoreVersion,
    deleteVersion,
    clearVersions,
    setPreviewVersion,
    exitPreview,
    addComment,
    deleteComment,
    inviteCollaborator,
    acceptInvite,
    removeCollaborator,
    getRole,
    profileFor,
  }
}

export const store = createStore()

export const COLORS = [
  '#5b8aff','#ff6b6b','#4ade80','#fbbf24','#a78bfa',
  '#f472b6','#34d399','#fb923c','#60a5fa','#e879f9'
]

export const LANGUAGES = [
  'javascript','typescript','python','java','c','cpp','csharp',
  'go','rust','php','ruby','swift','kotlin','html','css',
  'sql','bash','json','yaml','markdown','plaintext'
]

export function projectEmoji(name = '') {
  const n = name.toLowerCase()
  if (n.includes('react') || n.includes('vue') || n.includes('angular')) return '⚛'
  if (n.includes('api') || n.includes('server') || n.includes('backend')) return '🔌'
  if (n.includes('auth') || n.includes('login') || n.includes('security')) return '🔐'
  if (n.includes('data') || n.includes('sql') || n.includes('db')) return '🗄'
  if (n.includes('style') || n.includes('css') || n.includes('ui')) return '🎨'
  if (n.includes('test')) return '🧪'
  return '📁'
}

export function timeLabel(ts) {
  const d = new Date(ts)
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
}
