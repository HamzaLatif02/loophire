from typing import Dict

from fastapi import WebSocket


class ProgressManager:
    def __init__(self):
        self.connections: Dict[str, WebSocket] = {}

    async def connect(self, job_id: str, websocket: WebSocket):
        await websocket.accept()
        self.connections[job_id] = websocket

    def disconnect(self, job_id: str):
        self.connections.pop(job_id, None)

    async def send_progress(
        self,
        job_id: str,
        stage: str,
        message: str,
        percent: int,
        status: str = "running",
    ):
        websocket = self.connections.get(job_id)
        if websocket:
            try:
                await websocket.send_json({
                    "stage":   stage,
                    "message": message,
                    "percent": percent,
                    "status":  status,
                })
            except Exception:
                self.disconnect(job_id)

    async def send_error(self, job_id: str, message: str):
        await self.send_progress(job_id, "error", message, 0, status="error")


progress_manager = ProgressManager()
