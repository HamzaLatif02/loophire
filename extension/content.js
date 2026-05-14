const LOOPHIRE_API = "https://api.loophire.xyz"
const BUTTON_ID    = "loophire-import-btn"
const LOG_PREFIX   = "[Loophire]"

function log(...args)  { console.log(LOG_PREFIX, ...args) }
function warn(...args) { console.warn(LOG_PREFIX, ...args) }
function err(...args)  { console.error(LOG_PREFIX, ...args) }

// ── Context validity guard ────────────────────────────────────────────────────
// When the extension is reloaded while this script is still running in a tab,
// chrome.runtime becomes invalid. Detect this and shut down gracefully so the
// script stops trying to use chrome APIs (which would produce
// "GET chrome-extension://invalid/" errors in the console).

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
        ".job-details-jobs-unified-top-card__top-buttons",
        ".jobs-unified-top-card__top-buttons",
        ".job-details-jobs-unified-top-card__actions",
        ".jobs-apply-button--top-card",
        "[class*='top-card'][class*='actions']",
        "[class*='top-card'][class*='buttons']",
        ".job-details-jobs-unified-top-card__container--two-pane",
        ".jobs-unified-top-card",
        ".jobs-details__main-content",
        "[class*='unified-top-card']",
    ],
    applyButton: [
        ".jobs-apply-button--top-card button",
        "[class*='jobs-apply-button'] button",
        "button[class*='jobs-apply']",
        ".artdeco-button--primary",
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

function createButton(state = "idle") {
    const btn = document.createElement("button")
    btn.id = BUTTON_ID

    Object.assign(btn.style, {
        display:         "inline-flex",
        alignItems:      "center",
        gap:             "6px",
        padding:         "8px 16px",
        backgroundColor: "#fd5a04",
        color:           "#FFFFFF",
        border:          "none",
        borderRadius:    "6px",
        fontSize:        "14px",
        fontWeight:      "600",
        cursor:          "pointer",
        fontFamily:      "inherit",
        transition:      "background-color 0.15s, opacity 0.15s",
        whiteSpace:      "nowrap",
        flexShrink:      "0",
    })

    btn.onmouseenter = () => { if (!btn.disabled) btn.style.backgroundColor = "#e04e03" }
    btn.onmouseleave = () => { if (!btn.disabled) btn.style.backgroundColor = "#fd5a04" }

    setButtonState(btn, state)
    return btn
}

function setButtonState(btn, state) {
    const states = {
        idle:    { text: "⚡ Import to Loophire", bg: "#fd5a04", disabled: false, opacity: "1"   },
        loading: { text: "Importing…",            bg: "#c44503", disabled: true,  opacity: "0.8" },
        success: { text: "✓ Imported!",           bg: "#16a34a", disabled: true,  opacity: "1"   },
        error:   { text: "Import failed — retry", bg: "#dc2626", disabled: false, opacity: "1"   },
        noauth:  { text: "Log in to Loophire",    bg: "#6b7280", disabled: false, opacity: "1"   },
    }
    const s = states[state] || states.idle
    btn.textContent           = s.text
    btn.style.backgroundColor = s.bg
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
        log("Button already exists — skipping injection")
        return
    }

    log("=== Attempting button injection ===")

    // Prefer inserting next to the Easy Apply button
    const applyBtn = trySelectors(SELECTORS.applyButton, "applyButton")
    if (applyBtn?.parentElement) {
        log("Injecting next to apply button")
        const btn = createButton()
        btn.addEventListener("click", () => handleImport(btn))
        applyBtn.parentElement.insertBefore(btn, applyBtn.nextSibling)
        log("✓ Button injected next to apply button")
        return
    }

    // Fall back to the top card container
    const target = trySelectors(SELECTORS.injectTarget, "injectTarget")
    if (target) {
        log("Injecting into top card container")
        const btn = createButton()
        btn.addEventListener("click", () => handleImport(btn))
        target.insertBefore(btn, target.firstChild)
        log("✓ Button injected into container")
        return
    }

    // Last resort — floating button
    warn("No target found — using floating fallback button")
    const btn = createButton()
    btn.addEventListener("click", () => handleImport(btn))
    Object.assign(btn.style, {
        position:     "fixed",
        bottom:       "32px",
        right:        "32px",
        zIndex:       "99999",
        boxShadow:    "0 8px 24px rgba(253, 90, 4, 0.35)",
        borderRadius: "50px",
        padding:      "12px 20px",
        fontSize:     "14px",
    })

    // Inject CSS keyframes for the pulsing ring
    const styleEl = document.createElement("style")
    styleEl.textContent = `
        @keyframes loophire-pulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50%       { opacity: 0;   transform: scale(1.15); }
        }
    `
    document.head.appendChild(styleEl)

    // Add the button first so we can measure its rendered size
    document.body.appendChild(btn)

    // Build the pulsing ring after the button is in the DOM
    requestAnimationFrame(() => {
        const w = btn.offsetWidth  || 200
        const h = btn.offsetHeight || 44
        const ring = document.createElement("div")
        Object.assign(ring.style, {
            position:     "fixed",
            bottom:       "28px",
            right:        "28px",
            width:        w + "px",
            height:       h + "px",
            borderRadius: "50px",
            border:       "2px solid #fd5a04",
            zIndex:       "99998",
            animation:    "loophire-pulse 2s ease-in-out infinite",
            pointerEvents: "none",
        })
        document.body.appendChild(ring)
    })

    log("✓ Floating button injected as fallback")
}

// ── Retry mechanism ───────────────────────────────────────────────────────────

const MAX_ATTEMPTS   = 30
const RETRY_INTERVAL = 500

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

        if (hasTitle || hasTarget || injectionAttempts >= MAX_ATTEMPTS) {
            clearInterval(timer)
            if (hasTitle || hasTarget) {
                log("Page ready — injecting button")
            } else {
                warn("Max attempts reached — injecting fallback")
            }
            injectButton()
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

// ── SPA navigation observer ───────────────────────────────────────────────────

let lastUrl = location.href

const observer = new MutationObserver(() => {
    if (!isContextValid()) {
        observer.disconnect()
        return
    }
    if (location.href === lastUrl) return
    lastUrl = location.href
    log("URL changed to:", lastUrl)

    document.getElementById(BUTTON_ID)?.remove()

    if (isJobDetailPage()) {
        log("New URL is a job page — waiting to inject")
        setTimeout(() => waitAndInject(), 1000)
    } else {
        log("New URL is not a job page — not injecting")
    }
})

observer.observe(document.body, { childList: true, subtree: true })

// ── Initial run ───────────────────────────────────────────────────────────────

log("Content script loaded on:", location.href)
if (isJobDetailPage()) {
    log("Job page detected on load — starting injection")
    setTimeout(() => waitAndInject(), 800)
} else {
    log("Not a job page on load — waiting for navigation")
}
