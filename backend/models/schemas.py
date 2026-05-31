from pydantic import BaseModel
from typing import Optional, List


class ChatHistoryItem(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatMessage(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    user_id: Optional[str] = None
    chat_history: Optional[List[ChatHistoryItem]] = None


class JournalLine(BaseModel):
    account_name: str
    account_type: str  # Asset | Liability | Equity | Income | Expense
    debit: float
    credit: float
    description: Optional[str] = None


class JournalEntry(BaseModel):
    description: str
    entry_date: str
    reference: Optional[str] = None
    lines: List[JournalLine]
    total_amount: float
    transaction_type: str  # expense | income | asset | liability


class ChatResponse(BaseModel):
    reply: str
    has_journal_entry: bool
    journal_entry: Optional[JournalEntry] = None
    conversation_id: str


class JournalEntryCreate(BaseModel):
    user_id: str
    entry_date: str
    description: str
    lines: List[JournalLine]
