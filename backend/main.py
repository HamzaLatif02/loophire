from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import cv as cv_router

app = FastAPI(title="Loophire API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cv_router.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
