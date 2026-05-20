# Loophire — Frontend

React frontend for the Loophire AI job application agent.

## Stack

React 18 · Vite · Tailwind CSS · React Query ·
Recharts · @hello-pangea/dnd · WebSockets

## Quick start

```bash
npm install
echo "VITE_API_URL=http://localhost:8000" > .env.local
npm run dev
```

## Key components

- `KanbanBoard.jsx` — Drag-and-drop application tracker
- `CVViewer.jsx` — Split-panel CV reader with keyboard nav
- `GenerationProgress.jsx` — Real-time WebSocket progress UI
- `hooks/useGenerationProgress.js` — WebSocket client hook
- `hooks/useApplications.js` — React Query data layer
