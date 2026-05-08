from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from utils.progress import progress_manager

router = APIRouter()


@router.websocket("/ws/progress/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    await progress_manager.connect(job_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        progress_manager.disconnect(job_id)
