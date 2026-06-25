"""
/api/ai/ — AI Accounting Engine routes
  POST /api/ai/chat            — text chat with full conversation history
  POST /api/ai/upload-invoice  — PDF/image invoice processing
"""
import uuid
from datetime import datetime, timezone, date
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, UploadFile, File, Form

from services.ai_service import AIService
from services.supabase_service import supabase
from routers.chat import (
    _extract_user_id,
    _get_or_create_conversation,
    _load_history,
    _save_message,
    _save_journal_entry,
    _load_chart_of_accounts,
)

router = APIRouter(prefix="/api/ai", tags=["AI Engine"])
ai_service = AIService()

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

# ─── POST /api/ai/chat ────────────────────────────────────────────────────────

@router.post("/chat")
async def ai_chat(
    message: str = Form(...),
    conversation_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None),
):
    """
    Full AI chat endpoint. Accepts text, maintains conversation history,
    records journal entries automatically when a transaction is described.
    """
    msg = message.strip()
    if not msg:
        raise HTTPException(status_code=400, detail="message is required")

    uid = _extract_user_id(authorization, user_id)
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        uuid.UUID(uid)
    except ValueError:
        uid = str(uuid.uuid4())

    # Load conversation history
    history: list = []
    resolved_conv_id: Optional[str] = conversation_id
    try:
        resolved_conv_id = _get_or_create_conversation(uid, conversation_id)
        history = _load_history(resolved_conv_id)
    except Exception as e:
        print(f"[DB] Conversation load error: {e}")
        resolved_conv_id = conversation_id or f"local-{uid}"

    # Load chart of accounts for AI context
    accounts = _load_chart_of_accounts(uid)

    # Run AI
    try:
        ai_result = ai_service.process_message(
            message=msg,
            chat_history=history,
            accounts=accounts or None,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI processing failed: {e}")

    reply: str = ai_result.get("reply", "Sorry, I could not process your request.")
    has_journal: bool = bool(ai_result.get("has_journal_entry", False))
    journal_entry: Optional[dict] = ai_result.get("journal_entry") if has_journal else None
    journal_entry_id: Optional[str] = None

    # Persist
    try:
        _save_message(resolved_conv_id, "user", msg)
        _save_message(resolved_conv_id, "assistant", reply)
        if has_journal and journal_entry:
            journal_entry_id = _save_journal_entry(uid, journal_entry, source="chat")
    except Exception as e:
        print(f"[DB] Save error: {e}")

    return {
        "reply": reply,
        "has_journal_entry": has_journal,
        "journal_entry": journal_entry,
        "journal_entry_id": journal_entry_id,
        "conversation_id": resolved_conv_id,
    }


# ─── POST /api/ai/upload-invoice ──────────────────────────────────────────────

@router.post("/upload-invoice")
async def upload_invoice(
    file: UploadFile = File(...),
    message: Optional[str] = Form(None),
    conversation_id: Optional[str] = Form(None),
    user_id: Optional[str] = Form(None),
    invoice_type_hint: Optional[str] = Form(None),  # "purchase" | "sale"
    authorization: Optional[str] = Header(None),
):
    """
    Invoice processing endpoint:
    1. Accepts PDF or image
    2. Uses Gemini Vision to extract invoice data
    3. Creates journal entry (purchase or sale)
    4. Checks TDS applicability and creates tds_entries if needed
    5. Saves invoice + line items + journal entry to Supabase
    6. Returns full extraction result + journal entry
    """
    uid = _extract_user_id(authorization, user_id)
    if not uid:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        uuid.UUID(uid)
    except ValueError:
        uid = str(uuid.uuid4())

    # ── Validate file ──────────────────────────────────────────────────────────
    content_type = file.content_type or ""
    filename = file.filename or "invoice"
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    ext_mime_map = {
        "pdf": "application/pdf",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "webp": "image/webp",
    }
    resolved_mime = ext_mime_map.get(ext, content_type)

    if resolved_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{resolved_mime}'. Upload PDF, JPG, PNG, or WebP."
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # ── Gemini Vision extraction ───────────────────────────────────────────────
    try:
        invoice_data = ai_service.extract_invoice(file_bytes, resolved_mime, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Invoice extraction failed: {e}")

    # Override invoice_type if hint provided
    if invoice_type_hint in ("purchase", "sale"):
        invoice_data["invoice_type"] = invoice_type_hint

    # ── Build journal entry ────────────────────────────────────────────────────
    journal_entry = ai_service.build_invoice_journal_entry(invoice_data)

    # ── Persist invoice to Supabase ────────────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()
    journal_entry_id: Optional[str] = None
    invoice_id: Optional[str] = None
    tds_entry_id: Optional[str] = None

    # 1) Save journal entry first (so we can link invoice to it)
    try:
        journal_entry_id = _save_journal_entry(
            uid, journal_entry, source="invoice_upload"
        )
    except Exception as e:
        print(f"[DB] Journal entry save failed: {e}")

    # 2) Save invoice record
    try:
        inv_payload = {
            "invoice_number": invoice_data.get("invoice_number") or f"AUTO-{uuid.uuid4().hex[:8].upper()}",
            "vendor_name": invoice_data.get("vendor_name") or "Unknown",
            "vendor_gstin": invoice_data.get("vendor_gstin"),
            "invoice_date": invoice_data.get("invoice_date") or date.today().isoformat(),
            "due_date": invoice_data.get("due_date"),
            "subtotal": float(invoice_data.get("subtotal") or 0),
            "cgst": float(invoice_data.get("cgst_amount") or 0),
            "sgst": float(invoice_data.get("sgst_amount") or 0),
            "igst": float(invoice_data.get("igst_amount") or 0),
            "total_amount": float(invoice_data.get("total_amount") or 0),
            "invoice_type": invoice_data.get("invoice_type", "purchase"),
            "status": "booked" if journal_entry_id else "pending",
            "ai_extracted": True,
            "journal_entry_id": journal_entry_id,
            "created_by": uid,
            "created_at": now,
            "updated_at": now,
        }
        inv_result = supabase.table("invoices").insert(inv_payload).execute()
        invoice_id = inv_result.data[0]["id"]
    except Exception as e:
        print(f"[DB] Invoice save failed: {e}")

    # 3) Save line items
    if invoice_id:
        try:
            line_items = invoice_data.get("line_items") or []
            if line_items:
                li_rows = []
                for li in line_items:
                    li_rows.append({
                        "invoice_id": invoice_id,
                        "description": li.get("description") or "Item",
                        "hsn_sac_code": li.get("hsn_sac_code"),
                        "quantity": float(li.get("quantity") or 1),
                        "rate": float(li.get("rate") or 0),
                        "amount": float(li.get("amount") or 0),
                        "gst_rate": float(li.get("gst_rate") or 0),
                        "cgst_amount": float(li.get("cgst_amount") or 0),
                        "sgst_amount": float(li.get("sgst_amount") or 0),
                        "igst_amount": float(li.get("igst_amount") or 0),
                        "created_at": now,
                    })
                supabase.table("invoice_line_items").insert(li_rows).execute()
        except Exception as e:
            print(f"[DB] Line items save failed: {e}")

    # 4) TDS entry (if applicable)
    if invoice_data.get("tds_applicable") and float(invoice_data.get("tds_amount") or 0) > 0:
        try:
            tds_payload = {
                "journal_entry_id": journal_entry_id,
                "invoice_id": invoice_id,
                "section_code": invoice_data.get("tds_section") or "194J",
                "deductee_name": invoice_data.get("vendor_name") or "Unknown",
                "deductee_pan": invoice_data.get("vendor_pan"),
                "tds_rate": float(invoice_data.get("tds_rate") or 0),
                "taxable_amount": float(invoice_data.get("subtotal") or 0),
                "tds_amount": float(invoice_data.get("tds_amount") or 0),
                "payment_date": invoice_data.get("invoice_date") or date.today().isoformat(),
                "financial_year": _get_financial_year(),
                "quarter": _get_quarter(),
                "status": "pending",
                "created_by": uid,
                "created_at": now,
                "updated_at": now,
            }
            tds_result = supabase.table("tds_entries").insert(tds_payload).execute()
            tds_entry_id = tds_result.data[0]["id"]
        except Exception as e:
            print(f"[DB] TDS entry save failed: {e}")

    # ── Save to conversation if provided ──────────────────────────────────────
    resolved_conv_id: Optional[str] = conversation_id
    ai_reply = _build_invoice_reply(invoice_data, journal_entry, journal_entry_id)
    try:
        if not resolved_conv_id:
            resolved_conv_id = _get_or_create_conversation(uid, None)
        user_msg = message or f"I uploaded invoice: {filename}"
        _save_message(resolved_conv_id, "user", user_msg)
        _save_message(resolved_conv_id, "assistant", ai_reply)
    except Exception as e:
        print(f"[DB] Conversation save failed: {e}")

    return {
        "reply": ai_reply,
        "has_journal_entry": journal_entry_id is not None,
        "invoice_data": invoice_data,
        "journal_entry": journal_entry,
        "journal_entry_id": journal_entry_id,
        "invoice_id": invoice_id,
        "tds_entry_id": tds_entry_id,
        "conversation_id": resolved_conv_id,
    }


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_financial_year() -> str:
    """Returns current Indian financial year, e.g. '2024-25'."""
    today = date.today()
    if today.month >= 4:
        return f"{today.year}-{str(today.year + 1)[2:]}"
    return f"{today.year - 1}-{str(today.year)[2:]}"


def _get_quarter() -> str:
    """Returns current Indian FY quarter (Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar)."""
    month = date.today().month
    if month in (4, 5, 6):
        return "Q1"
    elif month in (7, 8, 9):
        return "Q2"
    elif month in (10, 11, 12):
        return "Q3"
    return "Q4"


def _build_invoice_reply(invoice_data: dict, journal_entry: dict, journal_entry_id: Optional[str]) -> str:
    """Build a human-readable reply for the invoice upload result."""
    inv_num = invoice_data.get("invoice_number", "")
    vendor = invoice_data.get("vendor_name", "the vendor")
    total = invoice_data.get("total_amount", 0)
    inv_type = invoice_data.get("invoice_type", "purchase")
    tds = invoice_data.get("tds_applicable", False)
    tds_section = invoice_data.get("tds_section", "")
    tds_amount = invoice_data.get("tds_amount", 0)

    lines = journal_entry.get("lines", [])
    entry_lines_text = "\n".join(
        f"  {'Dr' if l['debit'] > 0 else 'Cr'} {l['account_name']}: ₹{l['debit'] if l['debit'] > 0 else l['credit']:,.2f}"
        for l in lines
    )

    reply = (
        f"✅ Invoice processed successfully!\n\n"
        f"**Invoice:** {inv_num} | **Vendor:** {vendor} | **Total:** ₹{total:,.2f}\n\n"
        f"**Journal Entry Created:**\n{entry_lines_text}"
    )

    if tds and tds_amount:
        reply += f"\n\n⚠️ **TDS Detected:** ₹{tds_amount:,.2f} deducted u/s {tds_section}"

    if not journal_entry_id:
        reply += "\n\n⚠️ Note: Journal entry could not be saved to database. Please check backend logs."

    return reply
