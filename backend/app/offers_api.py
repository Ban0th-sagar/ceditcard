from fastapi import APIRouter
from .offer_models import Offer, OfferQuoteRequest, OfferQuoteResponse
from .offers import get_offer, list_offers, quote_offers

router = APIRouter(prefix="/api/offers", tags=["Fictional offer marketplace"])


@router.get("", response_model=list[Offer])
def catalog():
    return list_offers()


@router.post("/quote", response_model=OfferQuoteResponse)
def offer_quote(request: OfferQuoteRequest):
    return quote_offers(request)


@router.get("/{offer_id}", response_model=Offer)
def offer_details(offer_id: str):
    return get_offer(offer_id)
