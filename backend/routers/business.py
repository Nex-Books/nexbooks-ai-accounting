"""
/business — Business Profile CRUD
  GET  /business/profile        — fetch current user's profile
  POST /business/profile        — create profile
  PUT  /business/profile        — update profile
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Query
from pydantic import BaseModel

from services.supabase_service import supabase

router = APIRouter(prefix="/business", tags=["Business"])


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_user_id(authorization: Optional[str], fallback: Optional[str] = None) -> str:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            resp = supabase.auth.get_user(token)
            return resp.user.id
        except Exception:
            pass
    if fallback:
        return fallback
    raise HTTPException(status_code=401, detail="Authentication required")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class BusinessProfileCreate(BaseModel):
    company_name: str
    business_type: Optional[str] = None
    industry: Optional[str] = None
    gstin: Optional[str] = None
    pan_number: Optional[str] = None
    country: str = "India"
    currency: str = "INR"
    financial_year_start: str = "April"
    financial_year: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    tds_applicable: bool = False
    gst_registered: bool = False
    onboarding_complete: bool = False


class BusinessProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    business_type: Optional[str] = None
    industry: Optional[str] = None
    gstin: Optional[str] = None
    pan_number: Optional[str] = None
    country: Optional[str] = None
    currency: Optional[str] = None
    financial_year_start: Optional[str] = None
    financial_year: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    tds_applicable: Optional[bool] = None
    gst_registered: Optional[bool] = None
    onboarding_complete: Optional[bool] = None


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/profile")
def get_business_profile(
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    uid = _get_user_id(authorization, user_id)
    try:
        result = (
            supabase.table("business_profiles")
            .select("*")
            .eq("user_id", uid)
            .execute()
        )
        if not result.data:
            return None
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile")
def create_business_profile(
    payload: BusinessProfileCreate,
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    uid = _get_user_id(authorization, user_id)
    now = datetime.now(timezone.utc).isoformat()

    data = {
        "user_id": uid,
        "company_name": payload.company_name,
        "business_type": payload.business_type,
        "industry": payload.industry,
        "gstin": payload.gstin,
        "pan_number": payload.pan_number,
        "country": payload.country,
        "currency": payload.currency,
        "financial_year_start": payload.financial_year_start,
        "financial_year": payload.financial_year,
        "address_line1": payload.address_line1,
        "address_line2": payload.address_line2,
        "city": payload.city,
        "state": payload.state,
        "pincode": payload.pincode,
        "phone": payload.phone,
        "email": payload.email,
        "website": payload.website,
        "tds_applicable": payload.tds_applicable,
        "gst_registered": payload.gst_registered,
        "onboarding_complete": payload.onboarding_complete,
        "created_at": now,
        "updated_at": now,
    }

    try:
        # Upsert by user_id
        result = (
            supabase.table("business_profiles")
            .upsert(data, on_conflict="user_id")
            .execute()
        )
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile")
def update_business_profile(
    payload: BusinessProfileUpdate,
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    uid = _get_user_id(authorization, user_id)

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        result = (
            supabase.table("business_profiles")
            .update(updates)
            .eq("user_id", uid)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found. Create one first.")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
def get_business_summary(
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    """
    Returns profile + quick KPIs: journal entry count, invoice count, total revenue, total expenses.
    Used by dashboard and AI context injection.
    """
    uid = _get_user_id(authorization, user_id)
    try:
        profile_res = (
            supabase.table("business_profiles")
            .select("*")
            .eq("user_id", uid)
            .execute()
        )
        profile = profile_res.data[0] if profile_res.data else {}

        # Quick counts
        je_res = supabase.table("journal_entries").select("id", count="exact").eq("user_id", uid).execute()
        inv_res = supabase.table("invoices").select("id", count="exact").eq("created_by", uid).execute()

        return {
            "profile": profile,
            "journal_entry_count": je_res.count or 0,
            "invoice_count": inv_res.count or 0,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
