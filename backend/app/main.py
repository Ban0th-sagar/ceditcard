from __future__ import annotations

from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from .data import CARDS
from .models import Card, EligibilityRequest
from .services import get_card, card_route_checks
from . import offers
from .offers_api import router as offers_router
from . import services
from .transactions_api import router as transactions_router
from .routing import quote_routes, capabilities, rank_routes
from .routing_models import (
    QuoteRequest,
    QuoteResponse,
    CapabilitiesResponse,
    RouteQuoteSelectionRequest,
)

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


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    if request.url.path != "/api/routes/quote" and not request.url.path.startswith(
        ("/api/transactions", "/api/offers")
    ):
        return await request_validation_exception_handler(request, exc)
    amount_error = any(
        "amount" in error["loc"] and error["type"] != "missing"
        for error in exc.errors()
    )
    return JSONResponse(
        status_code=422,
        content={
            "detail": {
                "code": "INVALID_AMOUNT" if amount_error else "INVALID_REQUEST",
                "message": (
                    "Enter a positive finite amount in paise increments, at most ₹1,000,000,000."
                    if amount_error
                    else (
                        "Provide the required transaction fields; client quote or eligibility fields are not accepted."
                        if request.url.path.startswith("/api/transactions")
                        else (
                            "Provide destination_card_id, amount, and optional tenure_months; client pricing and eligibility are not accepted."
                            if request.url.path.startswith("/api/offers")
                            else "Provide source_card_id, destination_card_id, and amount."
                        )
                    )
                ),
            },
            "simulated": True,
        },
    )


@app.post("/api/routes/quote", response_model=QuoteResponse)
def routes_quote(req: RouteQuoteSelectionRequest):
    try:
        source = get_card(req.source_card_id)
        destination = get_card(req.destination_card_id)
    except HTTPException as error:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "CARD_NOT_FOUND",
                "message": "The selected mock card was not found.",
            },
        ) from error
    response = quote_routes(source, destination, req.amount)
    response.marketplace_offers = offers.references(destination.id, req.amount)
    if req.offer_id:
        selected = offers.selected_offer(
            destination.id, req.amount, req.offer_id, req.offer_tenure_months
        )
        response.selected_offer = selected
        response.routes = [
            (
                offers.apply_offer(route, selected)
                if route.id == selected.offer.offer_type
                else route
            )
            for route in response.routes
        ]
        recommendation, explanation = rank_routes(response.routes)
        response.recommendation = recommendation
        response.recommended_route_id = recommendation.id if recommendation else None
        response.recommendation_explanation = explanation
    return response


@app.get("/api/routes/capabilities", response_model=CapabilitiesResponse)
def route_capabilities():
    return capabilities()


app.include_router(transactions_router)
app.include_router(offers_router)


# Serve the exported app alongside its API; API routes take precedence.
web_dist = Path(__file__).resolve().parents[2] / "mobile" / "dist"
if web_dist.is_dir():
    app.mount("/", StaticFiles(directory=web_dist, html=True), name="web")
