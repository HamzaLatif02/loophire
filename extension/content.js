const LOOPHIRE_API = "https://api.loophire.xyz"
const BUTTON_ID    = "loophire-import-btn"

// ── Selectors ──────────────────────────────────────────────────────────────────
// LinkedIn's DOM changes frequently — list multiple fallbacks per category.
const SELECTORS = {
    jobTitle: [
        ".job-details-jobs-unified-top-card__job-title h1",
        ".jobs-unified-top-card__job-title",
        ".job-details-jobs-unified-top-card__job-title",
        "h1.t-24.t-bold",
        "h1[class*='job-title']",
        ".jobs-search__job-details h1",
        "h1",  // broad fallback
    ],
    companyName: [
        ".job-details-jobs-unified-top-card__company-name a",
        ".jobs-unified-top-card__company-name a",
        ".job-details-jobs-unified-top-card__primary-description a",
        "[class*='company-name'] a",
        ".jobs-unified-top-card__subtitle a",
        ".job-details-jobs-unified-top-card__subtitle span a",
    ],
    jobDescription: [
        ".jobs-description__content .jobs-box__html-content",
        ".jobs-description-content__text",
        "#job-details",
        ".job-details-jobs-unified-top-card__job-description",
        "[class*='description__content']",
        ".jobs-description",
    ],
    injectTarget: [
        ".job-details-jobs-unified-top-card__container--two-pane",
        ".jobs-unified-top-card",
        ".jobs-details__main-content",
        ".job-details-jobs-unified-top-card__top-buttons",
        ".jobs-apply-button--top-card",
        "[class*='unified-top-card']",
        ".jobs-search__job-details--wrapper",
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

    const job_title       = titleEl?.innerText?.trim()       || ""
    const company_name    = companyEl?.innerText?.trim()     || ""
    const job_description = descriptionEl?.innerText?.trim() || ""

    console.log("Loophire extractJobData:", {
        job_title,
        company_name,
        description_length: job_description.length,
        url: window.location.href,
    })

    return { job_title, company_name, job_description, url: window.location.href }
}

function isJobDetailPage() {
    const url = window.location.href
    return (
        url.includes("/jobs/view/") ||
        url.includes("currentJobId=") ||
        (url.includes("/jobs/") &&
         !!new URLSearchParams(window.location.search).get("currentJobId"))
    )
}

// ── Button injection ───────────────────────────────────────────────────────────

function createButton() {
    const btn = document.createElement("button")
    btn.id = BUTTON_ID
    btn.innerHTML = `
        <img src="${chrome.runtime.getURL("icons/icon16.png")}"
             width="14" height="14"
             style="margin-right:6px;vertical-align:middle;flex-shrink:0" />
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
        marginRight:     "8px",
        fontFamily:      "inherit",
        transition:      "background-color 0.15s",
        whiteSpace:      "nowrap",
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

    const btn = createButton()
    btn.addEventListener("click", () => handleImport(btn))

    // Prefer inserting next to LinkedIn's Easy Apply / Save buttons
    const applyBtn = document.querySelector(
        ".jobs-apply-button--top-card, " +
        "[class*='jobs-apply-button'], " +
        "button[class*='apply']"
    )

    if (applyBtn?.parentElement) {
        applyBtn.parentElement.insertBefore(btn, applyBtn)
    } else {
        const target = trySelectors(SELECTORS.injectTarget)
        if (target) target.appendChild(btn)
        else console.log("Loophire: no inject target found")
    }
}

// ── Retry loop ─────────────────────────────────────────────────────────────────
// LinkedIn renders asynchronously — poll until the DOM is ready.
let isWaiting = false

function waitForJobPage(maxAttempts = 20, interval = 500) {
    if (isWaiting) return
    isWaiting = true
    let attempts = 0

    const timer = setInterval(() => {
        attempts++
        const target      = trySelectors(SELECTORS.injectTarget)
        const titleExists = trySelectors(SELECTORS.jobTitle)

        if (target && titleExists) {
            clearInterval(timer)
            isWaiting = false
            injectButton()
        } else if (attempts >= maxAttempts) {
            clearInterval(timer)
            isWaiting = false
            console.log("Loophire: could not find job page elements after", maxAttempts, "attempts")
        }
    }, interval)
}

// ── Observer ───────────────────────────────────────────────────────────────────
// LinkedIn is a SPA — watch for both URL changes and job panel updates
// (clicking a job in search results updates the panel without changing URL).
let lastUrl = location.href

const observer = new MutationObserver(() => {
    const urlChanged = location.href !== lastUrl
    if (urlChanged) {
        lastUrl = location.href
        document.getElementById(BUTTON_ID)?.remove()
        isWaiting = false
    }
    if (isJobDetailPage() && !document.getElementById(BUTTON_ID)) {
        waitForJobPage()
    }
})

observer.observe(document.body, {
    childList: true,
    subtree:   true
})

// Initial injection — give LinkedIn extra time to finish rendering
if (isJobDetailPage()) {
    setTimeout(() => waitForJobPage(), 800)
}

// ── Message listener (popup requests job data) ─────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "GET_JOB_DATA") {
        sendResponse(extractJobData())
    }
    return true
})
