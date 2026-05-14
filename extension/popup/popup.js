const API_BASE = "https://api.loophire.xyz"

async function getToken() {
    const response = await chrome.runtime.sendMessage({ type: "GET_TOKEN" })
    return response.token
}

async function init() {
    const token = await getToken()
    if (token) {
        await showLoggedIn(token)
    } else {
        showLoggedOut()
    }
}

function showLoggedOut() {
    document.getElementById("logged-out").classList.remove("hidden")
    document.getElementById("logged-in").classList.add("hidden")
}

async function showLoggedIn(token) {
    document.getElementById("logged-out").classList.add("hidden")
    document.getElementById("logged-in").classList.remove("hidden")
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { "Authorization": `Bearer ${token}` }
        })
        if (res.ok) {
            const user = await res.json()
            document.getElementById("user-email").textContent = user.email
            await checkCurrentTab()
        } else {
            await chrome.runtime.sendMessage({ type: "CLEAR_TOKEN" })
            showLoggedOut()
        }
    } catch {
        document.getElementById("user-email").textContent = ""
        await checkCurrentTab()
    }
}

function isLinkedInJobPage(url) {
    if (!url) return false
    try {
        const u = new URL(url)
        if (!u.hostname.includes("linkedin.com")) return false
        if (u.pathname.includes("/jobs/view/"))   return true
        if (u.pathname.includes("/jobs/search") &&
            u.searchParams.get("currentJobId"))   return true
        if (u.pathname.includes("/jobs/") &&
            u.searchParams.get("currentJobId"))   return true
        if (/\/jobs\/\d+/.test(u.pathname))       return true
        return false
    } catch { return false }
}

async function pingContentScript(tabId) {
    try {
        const response = await chrome.tabs.sendMessage(tabId, { type: "PING" })
        return response?.alive === true
    } catch {
        return false
    }
}

async function checkCurrentTab() {
    const importSection = document.getElementById("import-section")
    const notJobPage    = document.getElementById("not-job-page")

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab?.url || !isLinkedInJobPage(tab.url)) {
        notJobPage.innerHTML = `
            <p class="hint">
                Navigate to a LinkedIn job listing to import it directly.
            </p>
            <div class="divider"></div>
        `
        notJobPage.classList.remove("hidden")
        importSection.classList.add("hidden")
        return
    }

    // Job page detected — wait for the content script to become ready
    notJobPage.innerHTML = `<p class="hint">Job page detected — loading…</p>`
    notJobPage.classList.remove("hidden")
    importSection.classList.add("hidden")

    let alive   = false
    let attempt = 0
    while (!alive && attempt < 5) {
        attempt++
        alive = await pingContentScript(tab.id)
        if (!alive) await new Promise(r => setTimeout(r, 600))
    }

    if (!alive) {
        notJobPage.innerHTML = `
            <p class="hint">
                Page still loading. Close and reopen this popup in a moment.
            </p>
            <div class="divider"></div>
        `
        return
    }

    try {
        const job = await chrome.tabs.sendMessage(tab.id, { type: "GET_JOB_DATA" })

        if (job?.job_title) {
            importSection.classList.remove("hidden")
            notJobPage.classList.add("hidden")
            document.getElementById("job-preview").innerHTML = `
                <div class="title">${escapeHtml(job.job_title)}</div>
                <div class="company">${escapeHtml(job.company_name || "Unknown company")}</div>
            `
            window._jobData = job
        } else {
            notJobPage.innerHTML = `
                <p class="hint">
                    Job details still loading.<br/>
                    Wait a moment and reopen the popup.
                </p>
                <div class="divider"></div>
            `
            notJobPage.classList.remove("hidden")
            importSection.classList.add("hidden")
        }
    } catch (e) {
        console.error("[Loophire popup]", e)
        notJobPage.innerHTML = `
            <p class="hint">
                Could not read this page.<br/>
                Try refreshing and reopening the popup.
            </p>
            <div class="divider"></div>
        `
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

// ── Import button (popup) ──────────────────────────────────────────────────────

document.getElementById("import-btn")
    ?.addEventListener("click", async () => {
    const btn      = document.getElementById("import-btn")
    const statusEl = document.getElementById("import-status")
    const token    = await getToken()

    if (!token || !window._jobData) return

    btn.textContent = "Importing…"
    btn.disabled    = true
    statusEl.classList.add("hidden")

    const response = await chrome.runtime.sendMessage({
        type:  "IMPORT_JOB",
        token,
        job:   window._jobData
    })

    if (response.success) {
        statusEl.textContent = "✓ Imported! Opening Loophire…"
        statusEl.className   = "import-status success"
        statusEl.classList.remove("hidden")

        setTimeout(() => {
            chrome.tabs.create({
                url: `https://loophire.xyz/apply?job_id=${response.application_id}&from_extension=true`
            })
            window.close()
        }, 1000)
    } else {
        statusEl.textContent = response.error || "Import failed. Try again."
        statusEl.className   = "import-status error"
        statusEl.classList.remove("hidden")
        btn.textContent = "Import this job to Loophire"
        btn.disabled    = false
    }
})

// ── Login ──────────────────────────────────────────────────────────────────────

document.getElementById("login-btn")
    ?.addEventListener("click", async () => {
    const email    = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value
    const errorEl  = document.getElementById("login-error")
    const btn      = document.getElementById("login-btn")

    errorEl.classList.add("hidden")
    btn.textContent = "Logging in…"
    btn.disabled = true

    try {
        const res = await fetch(`${API_BASE}/api/auth/login`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ email, password })
        })
        const data = await res.json()

        if (!res.ok) {
            throw new Error(data.detail || "Login failed.")
        }

        await chrome.runtime.sendMessage({
            type:  "SAVE_TOKEN",
            token: data.access_token
        })
        await showLoggedIn(data.access_token)

    } catch (err) {
        errorEl.textContent = err.message
        errorEl.classList.remove("hidden")
    } finally {
        btn.textContent = "Log in"
        btn.disabled = false
    }
})

// ── Logout ─────────────────────────────────────────────────────────────────────

document.getElementById("logout-btn")
    ?.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "CLEAR_TOKEN" })
    showLoggedOut()
})

init()
