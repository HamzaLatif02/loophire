# Loophire Browser Extension

## Install in Chrome (Developer Mode)

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `/extension` folder from this repository
5. The Loophire icon will appear in your Chrome toolbar

## How to use

1. Click the Loophire icon and log in with your loophire.xyz account
2. Navigate to any LinkedIn job listing
3. Click the blue "Import to Loophire" button injected onto the page
4. The job opens in Loophire pre-filled and ready to generate

## Publishing to Chrome Web Store (when ready)

```bash
zip -r loophire-extension.zip extension/
```

Upload to: https://chrome.google.com/webstore/devconsole
