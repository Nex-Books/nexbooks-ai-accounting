from fastapi import APIRouter, Header, HTTPException, Request
from typing import Optional
from datetime import datetime, timezone

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


def _save_journal_entry(user_id: str, message_id: str, journal: dict) -> None:
    entry_result = supabase.table("journal_entries").insert({
        "user_id": user_id,
        "message_id": message_id,
        "entry_date": journal.get("entry_date"),
        "description": journal.get("description"),
        "reference": journal.get("reference"),
        "total_amount": journal.get("total_amount"),
        "transaction_type": journal.get("transaction_type"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    entry_id = entry_result.data[0]["id"]

    lines = [
        {
            "journal_entry_id": entry_id,
            "account_name": line.get("account_name"),
            "account_type": line.get("account_type"),
            "debit": float(line.get("debit", 0)),
            "credit": float(line.get("credit", 0)),
            "description": line.get("description"),
        }
        for line in journal.get("lines", [])
    ]
    if lines:
        supabase.table("journal_lines").insert(lines).execute()


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post("/message")
async def send_message(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """
    Accept either:
      - JSON body: { "message": "...", "conversation_id": "...", "user_id": "..." }
      - Multipart form: message=..., conversation_id=..., user_id=..., file=<binary>
    Authorization header (Bearer <supabase_jwt>) takes precedence over body user_id.
    """
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        message = str(form.get("message", "")).strip()
        conversation_id = str(form.get("conversation_id", "")).strip() or None
        body_user_id = str(form.get("user_id", "")).strip() or None
        file_upload = form.get("file")
        if file_upload and hasattr(file_upload, "read"):
            file_data = await file_upload.read()
            file_name = getattr(file_upload, "filename", "attachment")
        else:
            file_data, file_name = None, None
    else:
        body = await request.json()
        message = str(body.get("message", "")).strip()
        conversation_id = body.get("conversation_id") or None
        body_user_id = body.get("user_id") or None
        file_data, file_name = None, None

    if not message and not file_data:
        raise HTTPException(status_code=400, detail="message or file is required")

    user_id = _extract_user_id(authorization, body_user_id)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Send a Bearer token in Authorization header or pass user_id in the request body.",
        )

    # ── Conversation + history (DB errors are non-fatal) ──────────────────────
    history: list = []
    resolved_conv_id: Optional[str] = conversation_id

    try:
        resolved_conv_id = _get_or_create_conversation(user_id, conversation_id)
        history = _load_history(resolved_conv_id)
    except Exception as db_err:
        print(f"[DB] Could not load conversation: {db_err}")
        resolved_conv_id = conversation_id or f"local-{user_id}"

    # ── AI processing ─────────────────────────────────────────────────────────
    try:
        ai_result = ai_service.process_message(
            message=message,
            chat_history=history,
            file_data=file_data,
            file_name=file_name,
        )
    except Exception as ai_err:
        raise HTTPException(status_code=500, detail=f"AI error: {ai_err}")

    reply: str = ai_result.get("reply", "I could not process your request.")
    has_journal: bool = bool(ai_result.get("has_journal_entry", False))
    journal_entry: Optional[dict] = ai_result.get("journal_entry") if has_journal else None

    # ── Persist messages + journal entry (DB errors are non-fatal) ────────────
    try:
        _save_message(resolved_conv_id, "user", message)
        ai_msg_id = _save_message(resolved_conv_id, "assistant", reply)
        if has_journal and journal_entry:
            _save_journal_entry(user_id, ai_msg_id, journal_entry)
    except Exception as save_err:
        print(f"[DB] Could not save messages: {save_err}")

    return {
        "reply": reply,
        "has_journal_entry": has_journal,
        "journal_entry": journal_entry,
        "conversation_id": resolved_conv_id,
    }
