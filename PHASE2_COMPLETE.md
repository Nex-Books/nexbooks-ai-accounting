# Phase 2 Complete — AI Accounting Engine

## What Was Built

### 1. Enhanced AI Service (`backend/services/ai_service.py`)

Three public methods:

| Method | Purpose |
|---|---|
| `process_message()` | Chat-based transaction recording (existing, enhanced) |
| `extract_invoice()` | Gemini Vision invoice extraction from PDF/image |
| `build_invoice_journal_entry()` | Construct balanced journal entry from extracted data |

**New: Invoice Extraction Prompt**
Uses `gemini-2.5-flash` with `inline_data` (Blob) for vision. Extracts:
- Invoice number, vendor name, GSTIN, dates
- Line items with HSN/SAC codes
- CGST/SGST/IGST breakup
- TDS applicability (section 194J/194C/194I)

**New: Journal Entry Builder**
- Purchase: `Dr. Expense + Dr. Input GST → Cr. Accounts Payable (net of TDS)`
- Sale: `Dr. Accounts Receivable → Cr. Revenue + Cr. Output GST`
- Auto-balances: if debit ≠ credit due to rounding, adjusts the last line

---

### 2. Updated Chat Router (`backend/routers/chat.py`)

- **Schema-aware persistence**: saves `status`, `source='chat'`, `ai_generated=True`, `total_debit`, `total_credit`, `reference_number`
- **Fallback mode**: if new columns don't exist, falls back to minimal insert
- **Account loading**: reads from `chart_of_accounts` table first (global seed + user accounts), falls back to `accounts` table
- Returns `journal_entry_id` in response

---

### 3. New AI Router (`backend/routers/ai.py`)

#### `POST /api/ai/chat`
- Accepts: `message` (form field), optional `conversation_id`, `user_id`
- Loads conversation history from `messages` table
- Loads chart of accounts for AI context
- Creates journal entry if AI detects transaction
- Returns: `reply`, `journal_entry`, `journal_entry_id`, `conversation_id`

#### `POST /api/ai/upload-invoice`
- Accepts: `file` (PDF/JPG/PNG/WebP), optional `message`, `invoice_type_hint`
- **Full pipeline**:
  1. Gemini Vision extracts structured invoice JSON
  2. Journal entry built and saved
  3. Invoice record saved to `invoices` table
  4. Line items saved to `invoice_line_items` table
  5. TDS entry created in `tds_entries` if `tds_applicable=true`
- Returns: full extraction + journal entry + all IDs

---

### 4. New Journal Router (`backend/routers/journal.py`)

#### `GET /api/journal-entries`
- Filters: `date_from`, `date_to`, `status`, `source`, `ai_generated`, `account`
- Pagination: `page`, `limit`
- Returns entries with embedded `lines`

#### `GET /api/journal-entries/{id}`
- Single entry with all journal lines

#### `POST /api/journal-entries`
- Manual double-entry creation
- **Validates**: `total_debit == total_credit` (rejects if unbalanced)
- Saves with `source='manual'`, `ai_generated=False`

#### `POST /api/journal-entries/{id}/void`
- Sets `status='void'` on an entry

---

## How to Start the Backend

```powershell
cd nexbooks-ai-accounting\backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

Then open http://localhost:8000/docs to see all Phase 2 endpoints.

---

## API Test Examples

### Chat — Record a transaction
```bash
curl -X POST http://localhost:8000/api/ai/chat \
  -F "message=I received a sales invoice from ABC Pvt Ltd for ₹1,18,000 including 18% GST for software services" \
  -F "user_id=YOUR_USER_ID"
```

Expected journal entry:
- Dr. Accounts Receivable ₹1,18,000
- Cr. Sales Revenue – Services ₹1,00,000
- Cr. GST Payable – CGST ₹9,000
- Cr. GST Payable – SGST ₹9,000

### Invoice Upload
```bash
curl -X POST http://localhost:8000/api/ai/upload-invoice \
  -F "file=@invoice.pdf" \
  -F "user_id=YOUR_USER_ID" \
  -F "invoice_type_hint=purchase"
```

### Journal Entries List
```bash
curl "http://localhost:8000/api/journal-entries?user_id=YOUR_USER_ID&source=chat&limit=10"
```

### Manual Entry
```bash
curl -X POST "http://localhost:8000/api/journal-entries?user_id=YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "entry_date": "2024-06-23",
    "description": "Office rent payment",
    "lines": [
      {"account_name": "Rent Expense", "account_type": "Expense", "debit": 25000, "credit": 0},
      {"account_name": "Bank Account – Current", "account_type": "Asset", "debit": 0, "credit": 25000}
    ]
  }'
```

---

## Next: Phase 3
Phase 3 builds the full frontend pages:
- `/app/app/ai-assistant` — Enhanced chat with invoice upload
- `/app/app/journal` — Journal entries list with filters
- `/app/app/chart-of-accounts` — COA tree with balances
- `/app/app/invoices` — Purchase + Sale invoice tables
- `/app/app/tax` — GST and TDS modules
- `/app/app/reports` — Trial Balance, P&L, Balance Sheet
