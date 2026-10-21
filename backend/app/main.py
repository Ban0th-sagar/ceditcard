from __future__ import annotations

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .data import CARDS
from .models import Card, EligibilityRequest
from .services import get_card, card_route_checks
from . import services

app = FastAPI(title="Relay Prototype API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "relay-prototype"}


@app.get("/api/cards", response_model=list[Card])
def list_cards():
    return CARDS


@app.get("/api/portfolio")
def portfolio():
    return services.portfolio()


@app.post("/api/transfers/eligibility")
def transfer_eligibility(req: EligibilityRequest):
    source = get_card(req.source_card_id)
    destination = get_card(req.destination_card_id)
    checks = card_route_checks(source, destination, req.amount)
    return {
        "eligible": all(check.passed for check in checks),
        "checks": [check.model_dump() for check in checks],
    }


@app.post("/api/optimize")
def optimize(req: EligibilityRequest):
    return services.optimize(req)


# Serve the exported app alongside its API; API routes take precedence.
web_dist = Path(__file__).resolve().parents[2] / "mobile" / "dist"
if web_dist.is_dir():
    app.mount("/", StaticFiles(directory=web_dist, html=True), name="web")
