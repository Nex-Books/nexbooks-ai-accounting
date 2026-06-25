import uuid
import math
from fastapi import APIRouter, Header, HTTPException
from typing import Optional
from datetime import datetime, timezone, date

from models.schemas import ChatMessage
from services.ai_service import AIService
from services.supabase_service import supabase

router = APIRouter(prefix="/chat", tags=["Chat"])
ai_service = AIService()


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _extract_user_id(authorization: Optional[str], body_user_id: Optional[str]) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
        try:
            resp = supabase.auth.get_user(token)
            return resp.user.id
        except Exception:
            pass
    return body_user_id


def _get_or_create_conversation(user_id: str, conversation_id: Optional[str]) -> str:
    if conversation_id:
        return conversation_id
    result = supabase.table("conversations").insert({
        "user_id": user_id,
        "title": "New Conversation",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    return result.data[0]["id"]


def _load_history(conversation_id: str, limit: int = 20) -> list:
    result = (
        supabase.table("messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    messages = result.data or []
    messages.reverse()
    return messages


def _save_message(conversation_id: str, role: str, content: str) -> str:
    result = supabase.table("messages").insert({
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()
    return result.data[0]["id"]


def _save_journal_entry(
    user_id: str,
    journal: dict,
    source: str = "chat",
    message_id: Optional[str] = None,
) -> Optional[str]:
    """
    Persist journal_entry + journal_lines to Supabase.
    Uses the Phase 1 extended schema (status, source, ai_generated, reference_number, total_debit, total_credit).
    Returns the journal entry ID on success, None on failure.
    """
    lines = journal.get("lines", [])
    total_debit = sum(float(l.get("debit", 0)) for l in lines)
    total_credit = sum(float(l.get("credit", 0)) for l in lines)

    entry_payload = {
        "user_id": user_id,
        "created_by": user_id,
        "entry_date": journal.get("entry_date") or date.today().isoformat(),
        "description": journal.get("description", ""),
        "reference_number": journal.get("reference") or journal.get("reference_number"),
        "total_amount": float(journal.get("total_amount", 0)),
        "total_debit": round(total_debit, 2),
        "total_credit": round(total_credit, 2),
        "transaction_type": journal.get("transaction_type", "expense"),
        "status": "posted",
        "source": source,
        "ai_generated": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        entry_result = supabase.table("journal_entries").insert(entry_payload).execute()
        entry_id = entry_result.data[0]["id"]
    except Exception as e:
        print(f"[DB] journal_entries insert failed: {e}")
        # Fallback: try without new columns in case migration hasn't run yet
        try:
            fallback_payload = {
                "user_id": user_id,
                "entry_date": entry_payload["entry_date"],
                "description": entry_payload["description"],
                "total_amount": entry_payload["total_amount"],
                "transaction_type": entry_payload["transaction_type"],
                "created_at": entry_payload["created_at"],
            }
            entry_result = supabase.table("journal_entries").insert(fallback_payload).execute()
            entry_id = entry_result.data[0]["id"]
        except Exception as e2:
            print(f"[DB] journal_entries fallback insert also failed: {e2}")
            return None

    # Insert journal lines
    line_rows = []
    for line in lines:
        line_rows.append({
            "journal_entry_id": entry_id,
            "account_name": line.get("account_name"),
            "account_type": line.get("account_type"),
            "debit": float(line.get("debit", 0)),
            "credit": float(line.get("credit", 0)),
            "description": line.get("description"),
            "narration": line.get("narration") or line.get("description"),
        })

    if line_rows:
        try:
            supabase.table("journal_lines").insert(line_rows).execute()
        except Exception as e:
            print(f"[DB] journal_lines insert failed: {e}")

    return entry_id


def _load_chart_of_accounts(user_id: str) -> list:
    """Load chart_of_accounts for AI context (global seed + user-specific)."""
    try:
        result = (
            supabase.table("chart_of_accounts")
            .select("account_code, account_name, account_type, account_sub_type")
            .eq("is_active", True)
            .order("account_code")
            .execute()
        )
        return result.data or []
    except Exception:
        # Fallback to legacy accounts table
        try:
            result = (
                supabase.table("accounts")
                .select("account_name, account_type, account_code")
                .eq("user_id", user_id)
                .eq("is_active", True)
                .order("account_type")
                .execute()
            )
            return result.data or []
        except Exception as e2:
            print(f"[DB] Could not load accounts: {e2}")
            return []


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.post("/message")
async def send_message(
    payload: ChatMessage,
    authorization: Optional[str] = Header(None),
):
    message = payload.message.strip()
    conversation_id = payload.conversation_id or None
    body_user_id = payload.user_id or None

    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    user_id = _extract_user_id(authorization, body_user_id)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Send a Bearer token in Authorization header or pass user_id in the request body.",
        )

    try:
        uuid.UUID(user_id)
        valid_user_id = user_id
    except ValueError:
        valid_user_id = str(uuid.uuid4())

    # ── Conversation + history (DB errors are non-fatal) ──────────────────────
    history: list = []
    resolved_conv_id: Optional[str] = conversation_id

    try:
        resolved_conv_id = _get_or_create_conversation(valid_user_id, conversation_id)
        history = _load_history(resolved_conv_id)
    except Exception as db_err:
        print(f"[DB] Could not load conversation: {db_err}")
        resolved_conv_id = conversation_id or f"local-{user_id}"

    # ── Load chart of accounts for AI context (non-fatal) ─────────────────────
    user_accounts = _load_chart_of_accounts(valid_user_id)

    # ── AI processing ─────────────────────────────────────────────────────────
    try:
        ai_result = ai_service.process_message(
            message=message,
            chat_history=history,
            accounts=user_accounts or None,
        )
    except Exception as ai_err:
        raise HTTPException(status_code=500, detail=f"AI error: {ai_err}")

    reply: str = ai_result.get("reply", "I could not process your request.")
    has_journal: bool = bool(ai_result.get("has_journal_entry", False))
    journal_entry: Optional[dict] = ai_result.get("journal_entry") if has_journal else None

    # ── Persist messages + journal entry (DB errors are non-fatal) ────────────
    journal_entry_id: Optional[str] = None
    try:
        _save_message(resolved_conv_id, "user", message)
        _save_message(resolved_conv_id, "assistant", reply)
        if has_journal and journal_entry:
            journal_entry_id = _save_journal_entry(valid_user_id, journal_entry, source="chat")
    except Exception as save_err:
        print(f"[DB] Could not save messages: {save_err}")

    return {
        "reply": reply,
        "has_journal_entry": has_journal,
        "journal_entry": journal_entry,
        "journal_entry_id": journal_entry_id,
        "conversation_id": resolved_conv_id,
    }
