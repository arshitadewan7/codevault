<script>
  export let onLogin = () => {}
  export let onSignup = () => {}
  export let authStatus = 'idle'
  export let authError = null

  let email = ''
  let password = ''

  let mode = 'login'

  function submit() {
    const v = (email || '').trim()
    if (!v || !password) return
    if (mode === 'login') onLogin(v, password)
    else onSignup(v, password)
  }
</script>

<div class="login">
  <div class="hero">
    <div class="hero-card">
      <div class="brand">
        <div class="brand-dot" />
        <div class="brand-name">Code<span>Vault</span></div>
      </div>

      <h1>Store your best code.
        <span class="accent">Find it instantly.</span>
      </h1>

      <p class="subtitle">
        A minimal, versioned snippet vault designed for focus.
      </p>

      <div class="cta-row">
        <div class="input-wrap">
          <input
            class="email"
            type="email"
            placeholder="you@company.com"
            bind:value={email}
            on:keydown={(e) => e.key === 'Enter' && submit()}
          />
          <input
            class="password"
            type="password"
            placeholder="password"
            bind:value={password}
            on:keydown={(e) => e.key === 'Enter' && submit()}
          />
        </div>
        <button class="btn-primary" on:click={submit} disabled={authStatus === 'sending'}>
          {authStatus === 'sending' ? 'Working…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
      </div>

      {#if authStatus === 'signup-success'}
        <div class="fineprint success">
          Account created. Check your email to confirm and then log in.
        </div>
      {:else if authError}
        <div class="fineprint error">
          {authError}
        </div>
      {:else}
        <div class="fineprint">
          Use an email and password to {mode === 'login' ? 'log in' : 'create an account'}.
        </div>
      {/if}

      <div class="mode-toggle">
        <button
          class:active={mode === 'login'}
          on:click={() => mode = 'login'}
        >Login</button>
        <button
          class:active={mode === 'signup'}
          on:click={() => mode = 'signup'}
        >Sign up</button>
      </div>
    </div>
  </div>
</div>

<style>
  .login {
    flex: 1;
    display: flex;
    height: 100vh;
    overflow: hidden;
  }

  .hero {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    background:
      radial-gradient(800px circle at 20% 25%, rgba(91,138,255,0.25), transparent 55%),
      radial-gradient(700px circle at 80% 60%, rgba(255,107,107,0.18), transparent 55%),
      radial-gradient(600px circle at 55% 85%, rgba(74,222,128,0.12), transparent 55%),
      var(--bg);
  }

  .hero-card {
    width: 720px;
    max-width: 92vw;
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(19, 22, 30, 0.72);
    box-shadow:
      0 24px 60px rgba(0,0,0,0.45),
      inset 0 1px 0 rgba(255,255,255,0.05);
    padding: 34px;
    backdrop-filter: blur(10px);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
  }

  .brand-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 6px rgba(91,138,255,0.14);
  }

  .brand-name {
    font-family: var(--font-logo);
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.2px;
  }

  .brand-name span {
    color: var(--accent);
  }

  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 44px;
    line-height: 1.05;
    letter-spacing: -0.8px;
    color: var(--text);
  }

  .accent {
    display: block;
    margin-top: 6px;
    color: var(--text-dim);
  }

  .subtitle {
    margin: 14px 0 22px;
    font-size: 15px;
    color: var(--text-muted);
    max-width: 52ch;
  }

  .cta-row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .input-wrap {
    flex: 1;
    min-width: 240px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .email,
  .password {
    width: 100%;
    background: rgba(26, 30, 42, 0.95);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 12px 14px;
    color: var(--text);
    font-family: var(--font-sans);
    outline: none;
    transition: border 0.15s, box-shadow 0.15s;
  }

  .email:focus,
  .password:focus {
    border-color: rgba(91,138,255,0.8);
    box-shadow: 0 0 0 4px rgba(91,138,255,0.15);
  }

  .fineprint {
    margin-top: 14px;
    font-size: 12px;
    color: rgba(148, 163, 184, 0.85);
  }
  .fineprint.success { color: rgba(74,222,128,0.9); }
  .fineprint.error { color: rgba(255,107,107,0.9); }

  .mode-toggle {
    margin-top: 18px;
    display: inline-flex;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 999px;
    overflow: hidden;
  }

  .mode-toggle button {
    background: transparent;
    color: var(--text-muted);
    border: none;
    padding: 6px 14px;
    font-size: 12px;
    cursor: pointer;
    font-family: var(--font-sans);
  }

  .mode-toggle button.active {
    background: rgba(91,138,255,0.15);
    color: var(--accent);
  }

  @media (max-width: 520px) {
    h1 { font-size: 34px; }
    .hero-card { padding: 26px; }
  }
</style>
