import math
from fastapi import APIRouter, Query, HTTPException, Header
from typing import Optional
from datetime import datetime, timezone

from models.schemas import (
    AccountCreate, AccountUpdate,
    ChartOfAccountCreate, ChartOfAccountUpdate,
)
from services.supabase_service import supabase

router = APIRouter(prefix="/accounts", tags=["Accounts"])

VALID_TYPES = {"Asset", "Liability", "Equity", "Income", "Expense"}
VALID_COA_TYPES = {"Asset", "Liability", "Equity", "Revenue", "Expense"}
TYPE_ORDER = ["Asset", "Liability", "Equity", "Income", "Expense"]
COA_TYPE_ORDER = ["Asset", "Liability", "Equity", "Revenue", "Expense"]


# ─── Existing simple accounts table (AI uses this) ────────────────────────────

@router.get("")
def list_accounts(user_id: str = Query(...)):
    result = (
        supabase.table("accounts")
        .select("*")
        .eq("user_id", user_id)
        .order("account_type")
        .order("account_code")
        .execute()
    )
    accounts = result.data or []

    grouped: dict = {t: [] for t in TYPE_ORDER}
    for acc in accounts:
        t = acc.get("account_type", "Other")
        if t in grouped:
            grouped[t].append(acc)

    return {"data": grouped, "total": len(accounts)}


@router.post("")
def create_account(payload: AccountCreate):
    if payload.account_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"account_type must be one of {sorted(VALID_TYPES)}")

    exists = (
        supabase.table("accounts")
        .select("id")
        .eq("user_id", payload.user_id)
        .eq("account_code", payload.account_code)
        .execute()
    )
    if exists.data:
        raise HTTPException(status_code=409, detail=f"Account code '{payload.account_code}' already exists")

    result = supabase.table("accounts").insert({
        "user_id": payload.user_id,
        "account_code": payload.account_code,
        "account_name": payload.account_name,
        "account_type": payload.account_type,
    }).execute()
    return result.data[0]


@router.put("/{account_id}")
def update_account(account_id: str, payload: AccountUpdate):
    update_data = {}
    if payload.account_code is not None:
        update_data["account_code"] = payload.account_code
    if payload.account_name is not None:
        update_data["account_name"] = payload.account_name
    if payload.account_type is not None:
        if payload.account_type not in VALID_TYPES:
            raise HTTPException(status_code=400, detail=f"account_type must be one of {sorted(VALID_TYPES)}")
        update_data["account_type"] = payload.account_type

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("accounts")
        .update(update_data)
        .eq("id", account_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    return result.data[0]


@router.patch("/{account_id}/deactivate")
def deactivate_account(account_id: str):
    result = (
        supabase.table("accounts")
        .update({"is_active": False})
        .eq("id", account_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    return result.data[0]


@router.patch("/{account_id}/activate")
def activate_account(account_id: str):
    result = (
        supabase.table("accounts")
        .update({"is_active": True})
        .eq("id", account_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Account not found")
    return result.data[0]


# ─── Chart of Accounts (chart_of_accounts table) ─────────────────────────────

def _get_user_id_from_token(authorization: Optional[str]) -> Optional[str]:
    """Extract authenticated user ID from Bearer token."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            resp = supabase.auth.get_user(token)
            return resp.user.id
        except Exception:
            pass
    return None


@router.get("/chart")
def list_chart_of_accounts(
    user_id: Optional[str] = Query(None),
    account_type: Optional[str] = Query(None),
    active_only: bool = Query(True),
    authorization: Optional[str] = Header(None),
):
    """
    Returns chart of accounts — global seed rows (created_by IS NULL) plus
    user-specific rows. Falls back gracefully if chart_of_accounts doesn't exist yet.
    """
    resolved_uid = _get_user_id_from_token(authorization) or user_id

    try:
        query = supabase.table("chart_of_accounts").select("*")
        if active_only:
            query = query.eq("is_active", True)
        if account_type:
            query = query.eq("account_type", account_type)
        query = query.order("account_code")
        result = query.execute()
        accounts = result.data or []
    except Exception as e:
        # Table doesn't exist yet — return empty
        print(f"[chart_of_accounts] Table read error: {e}")
        return {"data": {t: [] for t in COA_TYPE_ORDER}, "total": 0, "error": "Run Phase 1 migration first."}

    # Group by type
    grouped: dict = {t: [] for t in COA_TYPE_ORDER}
    for acc in accounts:
        t = acc.get("account_type", "Other")
        if t in grouped:
            grouped[t].append(acc)
        else:
            grouped.setdefault(t, []).append(acc)

    return {"data": grouped, "total": len(accounts)}


@router.get("/chart/flat")
def list_chart_of_accounts_flat(
    user_id: Optional[str] = Query(None),
    active_only: bool = Query(True),
    authorization: Optional[str] = Header(None),
):
    """Returns a flat list of chart of accounts entries (useful for dropdowns)."""
    try:
        query = supabase.table("chart_of_accounts").select(
            "id, account_code, account_name, account_type, account_sub_type, is_active"
        )
        if active_only:
            query = query.eq("is_active", True)
        query = query.order("account_code")
        result = query.execute()
        return {"data": result.data or [], "total": len(result.data or [])}
    except Exception as e:
        return {"data": [], "total": 0, "error": str(e)}


@router.post("/chart")
def create_chart_account(
    payload: ChartOfAccountCreate,
    authorization: Optional[str] = Header(None),
    user_id: Optional[str] = Query(None),
):
    """Create a user-specific account in chart_of_accounts."""
    resolved_uid = _get_user_id_from_token(authorization) or user_id
    if not resolved_uid:
        raise HTTPException(status_code=401, detail="Authentication required")

    if payload.account_type not in VALID_COA_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"account_type must be one of {sorted(VALID_COA_TYPES)}"
        )

    # Check duplicate code for this user
    try:
        exists = (
            supabase.table("chart_of_accounts")
            .select("id")
            .eq("account_code", payload.account_code)
            .eq("created_by", resolved_uid)
            .execute()
        )
        if exists.data:
            raise HTTPException(
                status_code=409,
                detail=f"Account code '{payload.account_code}' already exists"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    insert_data = {
        "account_code": payload.account_code,
        "account_name": payload.account_name,
        "account_type": payload.account_type,
        "account_sub_type": payload.account_sub_type,
        "parent_account_id": payload.parent_account_id,
        "description": payload.description,
        "is_active": payload.is_active,
        "created_by": resolved_uid,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        result = supabase.table("chart_of_accounts").insert(insert_data).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/chart/{account_id}")
def update_chart_account(
    account_id: str,
    payload: ChartOfAccountUpdate,
    authorization: Optional[str] = Header(None),
):
    resolved_uid = _get_user_id_from_token(authorization)
    if not resolved_uid:
        raise HTTPException(status_code=401, detail="Authentication required")

    update_data = {}
    if payload.account_code is not None:
        update_data["account_code"] = payload.account_code
    if payload.account_name is not None:
        update_data["account_name"] = payload.account_name
    if payload.account_type is not None:
        if payload.account_type not in VALID_COA_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid account_type")
        update_data["account_type"] = payload.account_type
    if payload.account_sub_type is not None:
        update_data["account_sub_type"] = payload.account_sub_type
    if payload.description is not None:
        update_data["description"] = payload.description
    if payload.is_active is not None:
        update_data["is_active"] = payload.is_active
    if payload.parent_account_id is not None:
        update_data["parent_account_id"] = payload.parent_account_id

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    try:
        result = (
            supabase.table("chart_of_accounts")
            .update(update_data)
            .eq("id", account_id)
            .eq("created_by", resolved_uid)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Account not found or not owned by you")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/chart/{account_id}/toggle-active")
def toggle_chart_account_active(
    account_id: str,
    is_active: bool = Query(...),
    authorization: Optional[str] = Header(None),
):
    resolved_uid = _get_user_id_from_token(authorization)
    if not resolved_uid:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        result = (
            supabase.table("chart_of_accounts")
            .update({"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", account_id)
            .eq("created_by", resolved_uid)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Account not found or not owned by you")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Account Balances / Summary ───────────────────────────────────────────────

@router.get("/summary")
def get_account_summary(
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    """
    Compute account balances from journal_lines grouped by account_name.
    Returns a balance per account with net position.
    """
    resolved_uid = _get_user_id_from_token(authorization) or user_id
    if not resolved_uid:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        # Get all journal entries for this user
        entries_result = (
            supabase.table("journal_entries")
            .select("id")
            .eq("user_id", resolved_uid)
            .execute()
        )
        entry_ids = [e["id"] for e in (entries_result.data or [])]

        if not entry_ids:
            return {"data": [], "total_debit": 0, "total_credit": 0}

        # Get all lines for those entries
        lines_result = (
            supabase.table("journal_lines")
            .select("account_name, account_type, debit, credit")
            .in_("journal_entry_id", entry_ids)
            .execute()
        )
        lines = lines_result.data or []

        # Aggregate by account
        balances: dict = {}
        for line in lines:
            name = line.get("account_name", "Unknown")
            acc_type = line.get("account_type", "")
            debit = float(line.get("debit") or 0)
            credit = float(line.get("credit") or 0)

            if name not in balances:
                balances[name] = {
                    "account_name": name,
                    "account_type": acc_type,
                    "total_debit": 0.0,
                    "total_credit": 0.0,
                    "balance": 0.0,
                }
            balances[name]["total_debit"] += debit
            balances[name]["total_credit"] += credit

        # Compute net balance (debit-normal for Asset/Expense, credit-normal for others)
        debit_normal = {"Asset", "Expense"}
        for acc in balances.values():
            if acc["account_type"] in debit_normal:
                acc["balance"] = acc["total_debit"] - acc["total_credit"]
            else:
                acc["balance"] = acc["total_credit"] - acc["total_debit"]

        sorted_balances = sorted(balances.values(), key=lambda x: (x["account_type"], x["account_name"]))
        total_debit = sum(a["total_debit"] for a in sorted_balances)
        total_credit = sum(a["total_credit"] for a in sorted_balances)

        return {
            "data": sorted_balances,
            "total_debit": round(total_debit, 2),
            "total_credit": round(total_credit, 2),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
