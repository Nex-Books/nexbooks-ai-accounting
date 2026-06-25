import math
from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from services.supabase_service import supabase

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("")
def list_transactions(
    user_id: str = Query(...),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    account: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    # Step 1: if account filter, resolve matching entry IDs via journal_lines
    filtered_ids: Optional[list] = None
    if account:
        lines_resp = (
            supabase.table("journal_lines")
            .select("journal_entry_id")
            .ilike("account_name", f"%{account}%")
            .execute()
        )
        filtered_ids = list({r["journal_entry_id"] for r in lines_resp.data})
        if not filtered_ids:
            return {"data": [], "total": 0, "page": page, "limit": limit, "total_pages": 0}

    # Step 2: build journal_entries query
    query = (
        supabase.table("journal_entries")
        .select("*", count="exact")
        .eq("user_id", user_id)
        .order("entry_date", desc=True)
        .order("created_at", desc=True)
    )
    if date_from:
        query = query.gte("entry_date", date_from)
    if date_to:
        query = query.lte("entry_date", date_to)
    if filtered_ids is not None:
        query = query.in_("id", filtered_ids)

    # Step 3: paginate
    start = (page - 1) * limit
    end = start + limit - 1
    result = query.range(start, end).execute()

    entries = result.data or []
    total = result.count or 0
    total_pages = math.ceil(total / limit) if total > 0 else 0

    if not entries:
        return {"data": [], "total": total, "page": page, "limit": limit, "total_pages": total_pages}

    # Step 4: fetch lines for returned entries in one query
    entry_ids = [e["id"] for e in entries]
    lines_result = (
        supabase.table("journal_lines")
        .select("journal_entry_id, account_name, debit, credit")
        .in_("journal_entry_id", entry_ids)
        .execute()
    )
    lines_by_entry: dict = {}
    for line in lines_result.data or []:
        lines_by_entry.setdefault(line["journal_entry_id"], []).append(line)

    # Step 5: build response rows
    rows = []
    for entry in entries:
        eid = entry["id"]
        entry_lines = lines_by_entry.get(eid, [])
        debit_account = next(
            (l["account_name"] for l in entry_lines if (l.get("debit") or 0) > 0), "-"
        )
        credit_account = next(
            (l["account_name"] for l in entry_lines if (l.get("credit") or 0) > 0), "-"
        )
        rows.append({
            "id": eid,
            "entry_date": entry.get("entry_date"),
            "description": entry.get("description"),
            "reference": entry.get("reference"),
            "total_amount": entry.get("total_amount"),
            "transaction_type": entry.get("transaction_type"),
            "source": "AI" if entry.get("message_id") else "Manual",
            "debit_account": debit_account,
            "credit_account": credit_account,
        })

    return {
        "data": rows,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }
