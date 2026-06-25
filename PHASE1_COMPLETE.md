# Phase 1 Complete — Database Foundation

## What Was Built

### 1. SQL Migration (`migrations/phase1_schema.sql`)
A complete, idempotent SQL migration file covering:

| Table | Action | Notes |
|---|---|---|
| `chart_of_accounts` | CREATE | New — master Indian COA |
| `journal_entries` | ALTER | Added 6 new columns |
| `journal_lines` | ALTER | Added `account_id` FK + `narration` |
| `invoices` | CREATE | New — purchase + sale invoices |
| `invoice_line_items` | CREATE | New — line items per invoice |
| `tds_entries` | CREATE | New — TDS deductions |
| `gst_returns` | CREATE | New — GSTR-1/3B returns |

### 2. Chart of Accounts Seed Data
**84 standard Indian accounts** seeded with `created_by = NULL` (visible to all users), covering:
- **Assets**: Cash, Bank, GST Input Credit (CGST/SGST/IGST), TDS Receivable, Fixed Assets, Inventory
- **Liabilities**: Accounts Payable, GST Payable (CGST/SGST/IGST), TDS Payable, PF/ESI Payable, Loans
- **Equity**: Share Capital, Retained Earnings, Owner's Capital, Drawings
- **Revenue**: Sales, Service, Interest, Commission, Rental Income
- **Expenses**: Salary, PF, ESI, Rent, Utilities, Professional Fees, Depreciation, Bank Charges, Marketing, etc.

### 3. RLS Policies
All new tables have Row Level Security enabled with:
- `chart_of_accounts`: `(created_by = auth.uid() OR created_by IS NULL)` — users see global seed + their own
- `invoices`, `tds_entries`, `gst_returns`: `created_by = auth.uid()` — strict user isolation
- `invoice_line_items`: access via invoice ownership

### 4. Backend — New Endpoints

**Accounts Router (`/accounts`)**:
- `GET /accounts/chart` — Chart of accounts (grouped by type)
- `GET /accounts/chart/flat` — Flat list for dropdowns
- `POST /accounts/chart` — Create user-specific account
- `PUT /accounts/chart/{id}` — Update account
- `PATCH /accounts/chart/{id}/toggle-active` — Enable/disable account
- `GET /accounts/summary` — Account balances from journal_lines

**Finance Router (`/finance`)**:
- `GET /finance/invoices` — List invoices (with filters + pagination)
- `POST /finance/invoices` — Create invoice with line items
- `GET /finance/invoices/{id}` — Get invoice with line items
- `PATCH /finance/invoices/{id}/status` — Update invoice status
- `GET /finance/tds` — List TDS entries
- `POST /finance/tds` — Create TDS entry
- `GET /finance/tds/summary` — TDS aggregated by section code
- `GET /finance/gst-returns` — List GST returns
- `POST /finance/gst-returns` — Create GST return record
- `GET /finance/gst-summary` — Compute output/input/net GST from journal_lines

### 5. Updated Pydantic Schemas
`backend/models/schemas.py` now has models for:
- `ChartOfAccountCreate`, `ChartOfAccountUpdate`
- `InvoiceCreate`, `InvoiceLineItemCreate`
- `TDSEntryCreate`
- `GSTReturnCreate`

---

## How to Test Phase 1

### Step 1: Apply the SQL Migration
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/nnmdwfqlxcxanendamwg/sql/new)
2. Open `migrations/phase1_schema.sql`
3. Copy the entire file contents and paste into the SQL editor
4. Click **Run** (or press Ctrl+Enter)
5. Verify: `SELECT COUNT(*) FROM chart_of_accounts;` → should return **84**

### Step 2: Start the Backend
```powershell
cd nexbooks-ai-accounting\backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### Step 3: Test New Endpoints
```bash
# Chart of Accounts
curl http://localhost:8000/accounts/chart

# Finance health check
curl http://localhost:8000/health
# Should return: {"status":"ok","app":"NexBooks","phase":1}
```

### Step 4: Verify Backend API Docs
Open http://localhost:8000/docs — you should see:
- Accounts section with `/accounts/chart`, `/accounts/summary`
- Finance section with `/finance/invoices`, `/finance/tds`, `/finance/gst-summary`

---

## Design Decisions

1. **Global seed COA**: `created_by = NULL` means seed accounts are readable by all users but not editable
2. **Existing `accounts` table untouched**: The AI chat still uses the `accounts` table for backward compatibility; `chart_of_accounts` is the new canonical source
3. **Monetary amounts**: All new tables use `NUMERIC(15,2)` — never float
4. **Idempotent migration**: All `CREATE TABLE IF NOT EXISTS` + `DO $$ IF NOT EXISTS` patterns — safe to re-run

---

## Next: Phase 2
Phase 2 builds the AI Accounting Engine with:
- Invoice upload (PDF/image) with Gemini Vision extraction
- Full journal entry creation from chat
- TDS auto-detection
- POST /api/ai/upload-invoice endpoint
