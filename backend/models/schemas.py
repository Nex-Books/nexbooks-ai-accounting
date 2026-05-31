from pydantic import BaseModel
from typing import Optional

class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    user_id: str

class ChatResponse(BaseModel):
    reply: str
    journal_entry: Optional[dict] = None
    conversation_id: str

class JournalEntryCreate(BaseModel):
    user_id: str
    entry_date: str
    description: str
    lines: list