const LOOPHIRE_API = "https://api.loophire.xyz"
const BUTTON_ID    = "loophire-import-btn"
const LOG_PREFIX   = "[Loophire]"

function log(...args)  { console.log(LOG_PREFIX, ...args) }
function warn(...args) { console.warn(LOG_PREFIX, ...args) }
function err(...args)  { console.error(LOG_PREFIX, ...args) }

// ── Context validity guard ────────────────────────────────────────────────────
// When the extension is reloaded while this script is still running in a tab,
// chrome.runtime becomes invalid. Detect this and shut down gracefully.

function isContextValid() {
    try {
        return typeof chrome !== "undefined" && !!chrome.runtime?.id
    } catch {
        return false
    }
}

// ── URL detection ─────────────────────────────────────────────────────────────

function isJobDetailPage() {
    const url    = window.location.href
    const path   = window.location.pathname
    const params = new URLSearchParams(window.location.search)

    const checks = {
        jobsViewPath:   path.includes("/jobs/view/"),
        currentJobId:   !!params.get("currentJobId"),
        jobsPathWithId: /\/jobs\/\d+/.test(path),
    }

    log("URL check:", url)
    log("Detection results:", checks)

    const isJob = Object.values(checks).some(Boolean)
    log("Is job page:", isJob)
    return isJob
}

// ── Selectors ─────────────────────────────────────────────────────────────────

const SELECTORS = {
    jobTitle: [
        ".job-details-jobs-unified-top-card__job-title h1",
        ".jobs-unified-top-card__job-title h1",
        ".job-details-jobs-unified-top-card__job-title",
        ".jobs-unified-top-card__job-title",
        "h1.t-24",
        "h1.t-24.t-bold.inline",
        "[class*='job-details'][class*='title'] h1",
        "[class*='unified-top-card'][class*='title']",
        ".jobs-search__job-details h1",
        "h1",
    ],
    companyName: [
        ".job-details-jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__primary-description-without-tagline a",
        ".job-details-jobs-unified-top-card__primary-description a",
        "[class*='company-name'] a",
        "[class*='unified-top-card'][class*='company'] a",
        "[class*='unified-top-card'][class*='subtitle'] a",
        ".jobs-unified-top-card__subtitle a",
        ".artdeco-entity-lockup__subtitle a",
    ],
    jobDescription: [
        "#job-details",
        ".jobs-description__content",
        ".jobs-description-content__text",
        "[class*='description__content']",
        ".jobs-box__html-content",
        "[class*='jobs-description']",
        ".jobs-description",
    ],
    injectTarget: [
        ".jobs-unified-top-card__primary-actions",
        ".jobs-apply-button--top-card",
        "[class*='unified-top-card'][class*='primary-actions']",
        "[class*='unified-top-card'][class*='actions']",
        ".job-details-jobs-unified-top-card__container--two-pane",
        ".jobs-unified-top-card",
        "[class*='unified-top-card']",
    ],
    applyButton: [
        ".jobs-apply-button--top-card .artdeco-button--primary",
        ".jobs-apply-button--top-card button",
        "[class*='jobs-apply-button'] button.artdeco-button--primary",
        "[class*='jobs-apply-button'] button",
        "button.jobs-apply-button",
        ".artdeco-button--primary[data-job-id]",
        ".jobs-unified-top-card__primary-actions button.artdeco-button--primary",
        "button.artdeco-button.artdeco-button--primary[aria-label*='Apply']",
        "button[aria-label*='Apply to']",
        "button[aria-label*='Easy Apply']",
    ],
}

function trySelectors(selectorList, label) {
    log(`Trying selectors for "${label}":`)
    for (const sel of selectorList) {
        const el = document.querySelector(sel)
        if (el) {
            log(`  ✓ Found with: ${sel}`)
            log(`  Text: "${el.innerText?.trim().slice(0, 80)}"`)
            return el
        } else {
            log(`  ✗ Not found: ${sel}`)
        }
    }
    warn(`  No selector matched for "${label}"`)
    return null
}

function extractJobData() {
    log("=== Extracting job data ===")
    const titleEl       = trySelectors(SELECTORS.jobTitle, "jobTitle")
    const companyEl     = trySelectors(SELECTORS.companyName, "companyName")
    const descriptionEl = trySelectors(SELECTORS.jobDescription, "jobDescription")

    const data = {
        job_title:       titleEl?.innerText?.trim()       || "",
        company_name:    companyEl?.innerText?.trim()     || "",
        job_description: descriptionEl?.innerText?.trim() || "",
        url:             window.location.href,
    }
    log("Extracted data:", {
        job_title:       data.job_title,
        company_name:    data.company_name,
        description_len: data.job_description.length,
        url:             data.url,
    })
    return data
}

// ── Button ────────────────────────────────────────────────────────────────────

function createButton() {
    const btn = document.createElement("button")
    btn.id = BUTTON_ID

    // Match LinkedIn's exact button styling — pill-shaped, 32px tall
    Object.assign(btn.style, {
        display:         "inline-flex",
        alignItems:      "center",
        justifyContent:  "center",
        gap:             "6px",
        padding:         "0 16px",
        height:          "32px",
        backgroundColor: "#fd5a04",
        color:           "#FFFFFF",
        border:          "1px solid #fd5a04",
        borderRadius:    "16px",
        fontSize:        "14px",
        fontWeight:      "600",
        lineHeight:      "1",
        cursor:          "pointer",
        fontFamily:      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        whiteSpace:      "nowrap",
        flexShrink:      "0",
        transition:      "background-color 0.15s, border-color 0.15s",
        textDecoration:  "none",
        outline:         "none",
        boxSizing:       "border-box",
        marginLeft:      "8px",
    })

    btn.onmouseenter = () => {
        if (!btn.disabled) {
            btn.style.backgroundColor = "#e04e03"
            btn.style.borderColor     = "#e04e03"
        }
    }
    btn.onmouseleave = () => {
        if (!btn.disabled) {
            btn.style.backgroundColor = "#fd5a04"
            btn.style.borderColor     = "#fd5a04"
        }
    }

    setButtonState(btn, "idle")
    return btn
}

function setButtonState(btn, state) {
    const states = {
        idle:    { text: "⚡ Import to Loophire", bg: "#fd5a04", border: "#fd5a04", disabled: false, opacity: "1"   },
        loading: { text: "Importing…",            bg: "#c44503", border: "#c44503", disabled: true,  opacity: "0.8" },
        success: { text: "✓ Imported!",           bg: "#16a34a", border: "#16a34a", disabled: true,  opacity: "1"   },
        error:   { text: "Import failed — retry", bg: "#dc2626", border: "#dc2626", disabled: false, opacity: "1"   },
        noauth:  { text: "Log in to Loophire",    bg: "#6b7280", border: "#6b7280", disabled: false, opacity: "1"   },
    }
    const s = states[state] || states.idle
    btn.textContent           = s.text
    btn.style.backgroundColor = s.bg
    btn.style.borderColor     = s.border
    btn.style.opacity         = s.opacity
    btn.disabled              = s.disabled
}

async function handleImport(btn) {
    log("Import button clicked")
    setButtonState(btn, "loading")

    const { loophire_token } = await chrome.storage.local.get("loophire_token")
    if (!loophire_token) {
        warn("No auth token found")
        setButtonState(btn, "noauth")
        setTimeout(() => setButtonState(btn, "idle"), 3000)
        return
    }

    const job = extractJobData()
    log("Job data for import:", job)

    if (!job.job_title) {
        warn("Could not extract job title — page may not be ready")
        setButtonState(btn, "error")
        setTimeout(() => setButtonState(btn, "idle"), 3000)
        return
    }

    try {
        const response = await chrome.runtime.sendMessage({
            type:  "IMPORT_JOB",
            token: loophire_token,
            job,
        })
        log("Import response:", response)

        if (response?.success) {
            setButtonState(btn, "success")
            setTimeout(() => {
                const params = new URLSearchParams({
                    job_id:         response.application_id,
                    from_extension: "true",
                })
                window.open(`https://loophire.xyz/apply?${params}`, "_blank")
                setButtonState(btn, "idle")
            }, 1500)
        } else {
            throw new Error(response?.error || "Import failed")
        }
    } catch (e) {
        err("Import error:", e)
        setButtonState(btn, "error")
        setTimeout(() => setButtonState(btn, "idle"), 4000)
    }
}

function injectButton() {
    if (document.getElementById(BUTTON_ID)) {
        log("Button already exists — skipping")
        return
    }
    log("=== Attempting injection ===")

    // Primary target: the apply button
    const applyBtn = trySelectors(SELECTORS.applyButton, "applyButton")

    if (applyBtn) {
        log("Found apply button — injecting next to it")
        const btn = createButton()
        btn.addEventListener("click", () => handleImport(btn))

        // Insert after the apply button's group so ordering is: Apply | Import | Save
        const parent = applyBtn.closest(
            ".jobs-apply-button--top-card, " +
            "[class*='jobs-apply-button'], " +
            "[class*='top-card'][class*='action'], " +
            "[class*='top-card'][class*='button']"
        ) || applyBtn.parentElement

        if (parent) {
            parent.insertAdjacentElement("afterend", btn)
            log("✓ Injected after apply button group")
        } else {
            applyBtn.insertAdjacentElement("afterend", btn)
            log("✓ Injected after apply button directly")
        }
        return
    }

    // Secondary: top card container
    const target = trySelectors(SELECTORS.injectTarget, "injectTarget")
    if (target) {
        log("Injecting into top card container")
        const btn = createButton()
        btn.addEventListener("click", () => handleImport(btn))
        target.appendChild(btn)
        log("✓ Injected into container as fallback")
        return
    }

    warn("No injection target found — button will not be shown")
}

// ── Retry mechanism ───────────────────────────────────────────────────────────

const MAX_ATTEMPTS   = 40
const RETRY_INTERVAL = 300

function waitAndInject() {
    let injectionAttempts = 0

    const timer = setInterval(() => {
        if (!isContextValid()) {
            clearInterval(timer)
            return
        }
        injectionAttempts++
        log(`Injection attempt ${injectionAttempts}/${MAX_ATTEMPTS}`)

        if (document.getElementById(BUTTON_ID)) {
            log("Button already present — stopping retries")
            clearInterval(timer)
            return
        }

        const hasTitle  = !!document.querySelector(SELECTORS.jobTitle[0]) ||
                          !!document.querySelector("h1")
        const hasTarget = !!document.querySelector(SELECTORS.injectTarget[0]) ||
                          !!document.querySelector("[class*='unified-top-card']")

        if (hasTitle || hasTarget) {
            clearInterval(timer)
            log("Page ready — injecting button")
            injectButton()
        } else if (injectionAttempts >= MAX_ATTEMPTS) {
            clearInterval(timer)
            warn("Max attempts reached — no suitable injection target found on this page. The button will not be shown.")
        }
    }, RETRY_INTERVAL)
}

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    log("Message received:", msg.type)
    if (msg.type === "GET_JOB_DATA") {
        const job = extractJobData()
        log("Sending job data to popup:", job)
        sendResponse(job)
    }
    if (msg.type === "PING") {
        sendResponse({ alive: true })
    }
    return true
})

// ── Initial run + SPA navigation ──────────────────────────────────────────────

let lastUrl = location.href

log("Content script loaded on:", location.href)

// Strategy 1: Direct injection if already on a job page
// Try immediately, then keep retrying until DOM is fully rendered
if (isJobDetailPage()) {
    log("Job page on load — starting immediate injection")
    injectButton()
    waitAndInject()
}

// Strategy 2: Watch for LinkedIn SPA navigations
// LinkedIn loads content dynamically — the URL changes but the page does not reload
const navObserver = new MutationObserver(() => {
    if (!isContextValid()) {
        navObserver.disconnect()
        return
    }
    const currentUrl = location.href
    if (currentUrl === lastUrl) return
    lastUrl = currentUrl
    log("SPA navigation detected:", currentUrl)

    document.getElementById(BUTTON_ID)?.remove()

    if (isJobDetailPage()) {
        log("New URL is a job page — injecting")
        setTimeout(() => waitAndInject(), 300)
    }
})

navObserver.observe(document.body, {
    childList: true,
    subtree:   true
})

// Strategy 3: Listen for LinkedIn's own navigation events
window.addEventListener("popstate", () => {
    log("popstate fired:", location.href)
    document.getElementById(BUTTON_ID)?.remove()
    if (isJobDetailPage()) {
        setTimeout(() => waitAndInject(), 500)
    }
})

// Intercept pushState to detect SPA navigation
const originalPushState = history.pushState.bind(history)
history.pushState = function(...args) {
    originalPushState(...args)
    log("pushState called:", location.href)
    setTimeout(() => {
        document.getElementById(BUTTON_ID)?.remove()
        if (isJobDetailPage()) waitAndInject()
    }, 300)
}

const originalReplaceState = history.replaceState.bind(history)
history.replaceState = function(...args) {
    originalReplaceState(...args)
    log("replaceState called:", location.href)
    setTimeout(() => {
        if (isJobDetailPage() && !document.getElementById(BUTTON_ID)) {
            waitAndInject()
        }
    }, 300)
}
