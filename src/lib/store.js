import { writable } from 'svelte/store'

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem('cv_projects') || '[]')
  } catch {
    return []
  }
}

function createStore() {
  const { subscribe, set, update } = writable({
    projects: loadProjects(),
    activeProjectId: null,
    activeSnippetId: null,
    previewVersionIndex: null,
  })

  function persist(state) {
    localStorage.setItem('cv_projects', JSON.stringify(state.projects))
    return state
  }

  return {
    subscribe,

    createProject({ name, color, desc }) {
      const project = {
        id: uid(),
        name,
        color,
        desc,
        snippets: [],
        open: true,
        createdAt: Date.now(),
      }
      update(s => {
        s.projects.push(project)
        s.activeProjectId = project.id
        return persist(s)
      })
      return project
    },

    deleteProject(projectId) {
      update(s => {
        s.projects = s.projects.filter(p => p.id !== projectId)
        if (s.activeProjectId === projectId) {
          s.activeProjectId = null
          s.activeSnippetId = null
        }
        return persist(s)
      })
    },

    toggleProject(projectId) {
      update(s => {
        const p = s.projects.find(p => p.id === projectId)
        if (p) {
          p.open = !p.open
          if (p.open) s.activeProjectId = projectId
        }
        return persist(s)
      })
    },

    createSnippet(projectId) {
      const snippet = {
        id: uid(),
        title: 'Untitled Snippet',
        code: '',
        notes: '',
        lang: 'javascript',
        versions: [],
        createdAt: Date.now(),
      }
      update(s => {
        const p = s.projects.find(p => p.id === projectId)
        if (p) {
          p.snippets.push(snippet)
          p.open = true
        }
        s.activeProjectId = projectId
        s.activeSnippetId = snippet.id
        s.previewVersionIndex = null
        return persist(s)
      })
      return snippet
    },

    deleteSnippet(projectId, snippetId) {
      update(s => {
        const p = s.projects.find(p => p.id === projectId)
        if (p) p.snippets = p.snippets.filter(sn => sn.id !== snippetId)
        if (s.activeSnippetId === snippetId) {
          s.activeSnippetId = null
          s.previewVersionIndex = null
        }
        return persist(s)
      })
    },

    setActiveSnippet(projectId, snippetId) {
      update(s => {
        s.activeProjectId = projectId
        s.activeSnippetId = snippetId
        s.previewVersionIndex = null
        const p = s.projects.find(p => p.id === projectId)
        if (p) p.open = true
        return s
      })
    },

    updateSnippetField(snippetId, field, value) {
      update(s => {
        for (const p of s.projects) {
          const sn = p.snippets.find(sn => sn.id === snippetId)
          if (sn) { sn[field] = value; break }
        }
        return persist(s)
      })
    },

    saveVersion(snippetId, msg) {
      update(s => {
        for (const p of s.projects) {
          const sn = p.snippets.find(sn => sn.id === snippetId)
          if (sn) {
            if (!sn.versions) sn.versions = []
            sn.versions.unshift({
              id: uid(),
              code: sn.code,
              notes: sn.notes,
              lang: sn.lang,
              title: sn.title,
              msg: msg || 'Snapshot',
              timestamp: Date.now(),
            })
            break
          }
        }
        return persist(s)
      })
    },

    restoreVersion(snippetId, versionIndex) {
      update(s => {
        for (const p of s.projects) {
          const sn = p.snippets.find(sn => sn.id === snippetId)
          if (sn) {
            const v = sn.versions[versionIndex]
            if (v) {
              sn.code = v.code || ''
              sn.notes = v.notes || ''
              sn.lang = v.lang || sn.lang
              sn.title = v.title || sn.title
            }
            break
          }
        }
        s.previewVersionIndex = null
        return persist(s)
      })
    },

    setPreviewVersion(index) {
      update(s => { s.previewVersionIndex = index; return s })
    },

    exitPreview() {
      update(s => { s.previewVersionIndex = null; return s })
    },
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
