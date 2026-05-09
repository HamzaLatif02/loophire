const LOOPHIRE_API = "https://api.loophire.xyz"
const BUTTON_ID    = "loophire-import-btn"

// ── Selectors ──────────────────────────────────────────────────────────────────
// LinkedIn's DOM structure changes — list all known selectors
// so the extension degrades gracefully if one stops working.
const SELECTORS = {
    jobTitle: [
        ".job-details-jobs-unified-top-card__job-title h1",
        ".jobs-unified-top-card__job-title",
        "h1.t-24",
    ],
    companyName: [
        ".job-details-jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__subtitle-primary-grouping a",
    ],
    jobDescription: [
        ".jobs-description__content .jobs-box__html-content",
        ".jobs-description-content__text",
        "#job-details",
    ],
    injectTarget: [
        ".job-details-jobs-unified-top-card__container--two-pane",
        ".jobs-unified-top-card",
        ".jobs-details__main-content",
    ]
}

function trySelectors(selectors) {
    for (const sel of selectors) {
        const el = document.querySelector(sel)
        if (el) return el
    }
    return null
}

function extractJobData() {
    const titleEl       = trySelectors(SELECTORS.jobTitle)
    const companyEl     = trySelectors(SELECTORS.companyName)
    const descriptionEl = trySelectors(SELECTORS.jobDescription)

    return {
        job_title:       titleEl?.innerText?.trim()       || "",
        company_name:    companyEl?.innerText?.trim()     || "",
        job_description: descriptionEl?.innerText?.trim() || "",
        url:             window.location.href,
    }
}

function isJobDetailPage() {
    // Only show the button on individual job listing pages,
    // not on the search results list
    return window.location.href.includes("/jobs/view/") ||
           (window.location.href.includes("/jobs/") &&
            !!trySelectors(SELECTORS.jobTitle))
}

// ── Button injection ───────────────────────────────────────────────────────────

function createButton() {
    const btn = document.createElement("button")
    btn.id = BUTTON_ID
    btn.innerHTML = `
        <img src="${chrome.runtime.getURL("icons/icon16.png")}"
             width="14" height="14"
             style="margin-right:6px;vertical-align:middle" />
        Import to Loophire
    `
    Object.assign(btn.style, {
        display:         "inline-flex",
        alignItems:      "center",
        padding:         "8px 16px",
        backgroundColor: "#507DBC",
        color:           "#FFFFFF",
        border:          "none",
        borderRadius:    "6px",
        fontSize:        "14px",
        fontWeight:      "600",
        cursor:          "pointer",
        marginTop:       "12px",
        fontFamily:      "inherit",
        transition:      "background-color 0.15s",
    })
    btn.onmouseenter = () => btn.style.backgroundColor = "#3D6BA8"
    btn.onmouseleave = () => btn.style.backgroundColor = "#507DBC"
    return btn
}

function setButtonState(btn, state) {
    const states = {
        idle:    { text: "Import to Loophire",    bg: "#507DBC", disabled: false },
        loading: { text: "Importing…",            bg: "#3D6BA8", disabled: true  },
        success: { text: "✓ Opening Loophire…",   bg: "#2A7A4B", disabled: true  },
        error:   { text: "Import failed — retry", bg: "#A03030", disabled: false },
        noauth:  { text: "Log in to Loophire",    bg: "#6B7280", disabled: false },
    }
    const s = states[state]
    if (!s) return
    btn.innerHTML = s.text
    btn.style.backgroundColor = s.bg
    btn.disabled = s.disabled
}

async function handleImport(btn) {
    setButtonState(btn, "loading")

    const { loophire_token } = await chrome.storage.local.get("loophire_token")
    if (!loophire_token) {
        setButtonState(btn, "noauth")
        chrome.runtime.sendMessage({ type: "OPEN_POPUP" })
        return
    }

    const job = extractJobData()

    if (!job.job_title || !job.company_name ||
        job.job_description.length < 50) {
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

        if (response.success) {
            setButtonState(btn, "success")
            setTimeout(() => {
                const params = new URLSearchParams({
                    job_id:         response.application_id,
                    from_extension: "true"
                })
                window.open(
                    `https://loophire.xyz/apply?${params}`,
                    "_blank"
                )
                setButtonState(btn, "idle")
            }, 1500)
        } else {
            throw new Error(response.error || "Import failed")
        }
    } catch (err) {
        console.error("Loophire import error:", err)
        setButtonState(btn, "error")
        setTimeout(() => setButtonState(btn, "idle"), 4000)
    }
}

function injectButton() {
    if (document.getElementById(BUTTON_ID)) return

    const target = trySelectors(SELECTORS.injectTarget)
    if (!target) return

    const btn = createButton()
    btn.addEventListener("click", () => handleImport(btn))
    target.appendChild(btn)
}

// ── Observer ───────────────────────────────────────────────────────────────────
// LinkedIn is a SPA — the DOM updates without full page reloads.
// Watch for URL changes and re-inject the button as needed.
let lastUrl = location.href

const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href
        setTimeout(() => {
            if (isJobDetailPage()) injectButton()
            else {
                const existing = document.getElementById(BUTTON_ID)
                if (existing) existing.remove()
            }
        }, 1500)
    }
})

observer.observe(document.body, {
    childList: true,
    subtree:   true
})

// Initial injection on page load
if (isJobDetailPage()) {
    setTimeout(injectButton, 1000)
}
