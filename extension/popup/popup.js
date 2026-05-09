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

async function checkCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    const isLinkedInJob =
        tab?.url?.includes("linkedin.com/jobs/view") ||
        (tab?.url?.includes("linkedin.com/jobs/") &&
         tab?.url?.includes("currentJobId"))

    const importSection = document.getElementById("import-section")
    const notJobPage    = document.getElementById("not-job-page")

    if (!isLinkedInJob) {
        notJobPage.classList.remove("hidden")
        importSection.classList.add("hidden")
        return
    }

    // Ask the content script for the current job data
    try {
        const response = await chrome.tabs.sendMessage(tab.id, {
            type: "GET_JOB_DATA"
        })

        if (response?.job_title) {
            importSection.classList.remove("hidden")
            notJobPage.classList.add("hidden")

            document.getElementById("job-preview").innerHTML =
                `<div class="title">${escapeHtml(response.job_title)}</div>` +
                `<div class="company">${escapeHtml(response.company_name)}</div>`

            window._jobData = response
        } else {
            notJobPage.classList.remove("hidden")
            importSection.classList.add("hidden")
        }
    } catch {
        // Content script not yet ready (page still loading)
        notJobPage.classList.remove("hidden")
        importSection.classList.add("hidden")
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
