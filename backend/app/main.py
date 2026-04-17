from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import employees, guests

app = FastAPI(
    title="Bleiche Resort & Spa",
    description="Hotel management system for Bleiche Resort & Spa, Spreewald",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(employees.router, prefix="/api")
app.include_router(guests.router, prefix="/api")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Bleiche Resort & Spa API"}
