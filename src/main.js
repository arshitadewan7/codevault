import App from './App.svelte'
import { initSupabase } from './lib/supabase.js'

import 'prismjs/themes/prism-tomorrow.css'

initSupabase()

const app = new App({
  target: document.body,
})

export default app
