import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, File, Header, HTTPException, Query, UploadFile
from pydantic import BaseModel

from services.supabase_service import supabase
from services.ai_service import AIService
from routers.chat import _extract_user_id

router = APIRouter(prefix="/api/bank", tags=["Bank Reconciliation"])
ai_service = AIService()

class BankReconcileRequest(BaseModel):
    bank_transaction_id: str
    journal_entry_id: str

@router.get("/transactions")
def list_bank_transactions(
    status: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    uid = _extract_user_id(authorization, user_id)
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        query = supabase.table("bank_transactions").select("*").eq("created_by", uid).order("transaction_date", desc=True)
        if status:
            query = query.eq("status", status)
            
        result = query.execute()
        return {"data": result.data or []}
    except Exception as e:
        print(f"[bank] Table read error: {e}")
        return {"data": [], "error": "Run Phase 4 migration"}


@router.post("/upload-statement")
async def upload_statement(
    file: UploadFile = File(...),
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    """
    Parses a CSV bank statement and imports it into bank_transactions.
    """
    uid = _extract_user_id(authorization, user_id)
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    text_content = content.decode("utf-8")
    
    # Parse CSV. We assume columns like Date, Description, Amount, etc.
    # We will use Gemini to extract structured bank transactions from the CSV text.
    try:
        extracted = await ai_service.extract_bank_statement(text_content)
        if not extracted or "transactions" not in extracted:
            raise HTTPException(status_code=400, detail="Failed to parse bank statement")
            
        now = datetime.now(timezone.utc).isoformat()
        insert_rows = []
        for tx in extracted["transactions"]:
            insert_rows.append({
                "transaction_date": tx.get("date"),
                "description": tx.get("description"),
                "amount": float(tx.get("amount", 0)),
                "transaction_type": "Deposit" if float(tx.get("amount", 0)) > 0 else "Withdrawal",
                "status": "unreconciled",
                "created_by": uid,
                "created_at": now,
                "updated_at": now,
            })
            
        if insert_rows:
            result = supabase.table("bank_transactions").insert(insert_rows).execute()
            return {"message": f"Successfully imported {len(insert_rows)} transactions", "data": result.data}
        return {"message": "No transactions found"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reconcile")
def reconcile_transaction(
    payload: BankReconcileRequest,
    user_id: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    uid = _extract_user_id(authorization, user_id)
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        # Check bank transaction
        bt_res = supabase.table("bank_transactions").select("*").eq("id", payload.bank_transaction_id).eq("created_by", uid).execute()
        if not bt_res.data:
            raise HTTPException(status_code=404, detail="Bank transaction not found")
            
        if bt_res.data[0]["status"] == "reconciled":
            raise HTTPException(status_code=400, detail="Transaction is already reconciled")

        # Update bank transaction
        now = datetime.now(timezone.utc).isoformat()
        result = (
            supabase.table("bank_transactions")
            .update({
                "status": "reconciled",
                "journal_entry_id": payload.journal_entry_id,
                "updated_at": now
            })
            .eq("id", payload.bank_transaction_id)
            .execute()
        )
        return {"message": "Transaction reconciled", "data": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
