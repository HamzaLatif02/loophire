const API_BASE = "https://api.loophire.xyz"

async function getToken() {
    const response = await chrome.runtime.sendMessage({ type: "GET_TOKEN" })
    return response.token
}

async function init() {
    const token = await getToken()
    if (token) {
        showLoggedIn(token)
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
        } else {
            await chrome.runtime.sendMessage({ type: "CLEAR_TOKEN" })
            showLoggedOut()
        }
    } catch {
        document.getElementById("user-email").textContent = ""
    }
}

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
        showLoggedIn(data.access_token)

    } catch (err) {
        errorEl.textContent = err.message
        errorEl.classList.remove("hidden")
    } finally {
        btn.textContent = "Log in"
        btn.disabled = false
    }
})

document.getElementById("logout-btn")
    ?.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "CLEAR_TOKEN" })
    showLoggedOut()
})

init()
