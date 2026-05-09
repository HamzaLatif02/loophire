const API_BASE = "https://api.loophire.xyz"

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "IMPORT_JOB") {
        handleImportJob(message).then(sendResponse)
        return true  // keep message channel open for async response
    }
    if (message.type === "SAVE_TOKEN") {
        chrome.storage.local.set({ loophire_token: message.token })
            .then(() => sendResponse({ success: true }))
        return true
    }
    if (message.type === "CLEAR_TOKEN") {
        chrome.storage.local.remove("loophire_token")
            .then(() => sendResponse({ success: true }))
        return true
    }
    if (message.type === "GET_TOKEN") {
        chrome.storage.local.get("loophire_token")
            .then(({ loophire_token }) =>
                sendResponse({ token: loophire_token || null }))
        return true
    }
})

async function handleImportJob({ token, job }) {
    try {
        const response = await fetch(
            `${API_BASE}/api/applications/import-from-extension`,
            {
                method:  "POST",
                headers: {
                    "Content-Type":  "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    job_title:       job.job_title,
                    company_name:    job.company_name,
                    job_description: job.job_description,
                    source_url:      job.url,
                    status:          "draft"
                })
            }
        )

        if (response.status === 401) {
            await chrome.storage.local.remove("loophire_token")
            return { success: false, error: "Session expired. Please log in again." }
        }

        if (!response.ok) {
            const err = await response.json()
            return { success: false, error: err.detail || "Import failed." }
        }

        const data = await response.json()
        return { success: true, application_id: data.id }

    } catch (err) {
        return { success: false, error: err.message }
    }
}
