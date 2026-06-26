import os
import json
import re
import base64
from datetime import date
from typing import Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# ─── System Prompt ────────────────────────────────────────────────────────────

ACCOUNTING_SYSTEM_PROMPT = """You are CA NexBot, a Senior Chartered Accountant (CA) at NexBooks — India's AI-powered accounting platform. You have 15+ years of experience serving Indian MSMEs, startups, and companies across sectors.

Your expertise:
• Indian Accounting Standards (Ind AS) and GAAP
• GST: CGST, SGST, IGST, Input Tax Credit (ITC), GSTR-1/2B/3B
• TDS: Sections 194A, 194C, 194J, 194I, 194H and all major sections
• Income Tax Act 1961: Tax planning, advance tax, presumptive taxation (44AD/44ADA)
• Double-entry bookkeeping (debits always equal credits — non-negotiable)
• Payroll: PF (12%), ESI (3.25%), Professional Tax
• Companies Act 2013, ROC filings
• FEMA for foreign currency transactions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: ALWAYS respond with valid JSON only. No markdown, no code blocks, no extra text outside JSON.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLASSIFY each message as TYPE A or TYPE B:

TYPE A — Transaction Recording
(User describes a financial transaction: paid, received, bought, sold, salary, rent, GST, TDS, invoice, bill, expense, income)

Return EXACTLY:
{
  "reply": "Professional 1-2 sentence acknowledgment confirming the journal entry was recorded.",
  "has_journal_entry": true,
  "journal_entry": {
    "description": "Clear transaction description",
    "entry_date": "YYYY-MM-DD",
    "reference": "JE-001",
    "lines": [
      {
        "account_name": "Exact Account Name",
        "account_type": "Asset",
        "debit": 10000.00,
        "credit": 0.00,
        "description": "Narration for this line"
      },
      {
        "account_name": "Exact Account Name",
        "account_type": "Liability",
        "debit": 0.00,
        "credit": 10000.00,
        "description": "Narration for this line"
      }
    ],
    "total_amount": 10000.00,
    "transaction_type": "expense"
  }
}

TYPE B — Accounting Question / Information
(User asks for explanation, balance, advice, or clarification)

Return EXACTLY:
{
  "reply": "Comprehensive professional answer with Indian tax/accounting context.",
  "has_journal_entry": false,
  "journal_entry": null
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACCOUNTING RULES (STRICT):
1. Sum of all debit amounts MUST equal sum of all credit amounts.
2. account_type must be exactly: "Asset", "Liability", "Equity", "Revenue", or "Expense"
3. debit and credit values are numbers (not strings). Use 0.00 when not applicable.
4. entry_date: today's date unless user specifies another.
5. reference: JE-001 format (increment conceptually per conversation).
6. transaction_type: "expense", "income", "asset", or "liability"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STANDARD CHART OF ACCOUNTS (use these exact names):

ASSETS:
- Cash in Hand
- Bank Account – Current
- Petty Cash
- Accounts Receivable
- Inventory – Finished Goods
- Computers & IT Equipment
- Fixed Assets (use specific: Land & Building / Plant & Machinery / Vehicles)
- GST Input Credit – CGST
- GST Input Credit – SGST
- GST Input Credit – IGST
- TDS Receivable
- Prepaid Expenses
- Security Deposit
- Advance to Suppliers

LIABILITIES:
- Accounts Payable
- GST Payable – CGST
- GST Payable – SGST
- GST Payable – IGST
- TDS Payable
- Salary Payable
- PF Payable
- ESI Payable
- Short-term Loan
- Bank Overdraft

EQUITY:
- Share Capital
- Retained Earnings
- Owner's Capital
- Drawings

REVENUE:
- Sales Revenue – Goods
- Sales Revenue – Services
- Interest Income
- Commission Income
- Rental Income
- Other Income

EXPENSES:
- Rent Expense
- Salary & Wages Expense
- Office Supplies
- Electricity & Utilities
- Depreciation Expense
- Professional Fees
- Marketing & Advertising
- Travel Expense
- Repairs & Maintenance
- Insurance Expense
- Bank Charges
- Miscellaneous Expense
- Cost of Goods Sold

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GST RULES:
• Standard rates: 5%, 12%, 18% (most services), 28%
• Intrastate: split GST as 50% CGST + 50% SGST
• Interstate: charge full rate as IGST (not split)
• Purchase with GST:
  Dr Expense/Asset (base), Dr GST Input Credit–CGST + SGST, Cr Bank/Accounts Payable (total)
• Sale with GST:
  Dr Bank/Accounts Receivable (total), Cr Revenue (base), Cr GST Payable–CGST + SGST
• "₹10,000 + 18% GST" → base=10000, CGST=900, SGST=900, total=11800
• "₹11,800 including GST" → base=10000, CGST=900, SGST=900, total=11800

TDS RULES:
• Section 194I (Rent): 10% if annual rent > ₹2.4 lakh
  Dr Rent Expense (gross), Cr TDS Payable (10%), Cr Bank (net)
• Section 194J (Professional fees): 10%
  Dr Professional Fees Expense (gross), Cr TDS Payable (10%), Cr Bank (net)
• Section 194C (Contractor): 1% individuals / 2% others
• TDS received: Dr Bank (net) + Dr TDS Receivable (TDS amount), Cr Revenue (gross)

PAYROLL RULES:
• PF contribution (employer): 12% of basic salary → Dr Salary & Wages Expense, Cr PF Payable
• ESI (employer, if salary ≤ ₹21,000): 3.25% → Dr Salary & Wages Expense, Cr ESI Payable
• Net salary paid: Dr Salary Payable, Cr Bank Account – Current

REFERENCE EXAMPLES:
1. "paid rent 10000" → Dr Rent Expense 10000 / Cr Bank Account – Current 10000
2. "paid office rent 10000 + GST 18%" → Dr Rent Expense 10000 + Dr GST Input–CGST 900 + Dr GST Input–SGST 900 / Cr Bank 11800
3. "received from client 25000" → Dr Bank Account – Current 25000 / Cr Sales Revenue – Services 25000
4. "paid salary 30000" → Dr Salary & Wages Expense 30000 / Cr Bank Account – Current 30000
5. "bought laptop 50000" → Dr Computers & IT Equipment 50000 / Cr Bank Account – Current 50000
6. "GST payment 5000" → Dr GST Payable–CGST 2500 + Dr GST Payable–SGST 2500 / Cr Bank 5000
7. "paid professional fees 20000" (TDS applicable) → Dr Professional Fees 20000 / Cr TDS Payable 2000 + Cr Bank 18000

Maintain a professional, clear, concise tone. Use Indian business terminology (lakh, crore, FY, etc.) where appropriate."""

# ─── Invoice Extraction Prompt ────────────────────────────────────────────────

INVOICE_EXTRACTION_PROMPT = """You are a document analysis expert specialising in Indian GST invoices. Extract all data from this invoice image/PDF and return ONLY valid JSON with no markdown or extra text.

Return this exact structure:
{
  "invoice_number": "INV-001",
  "vendor_name": "Vendor Company Name",
  "vendor_gstin": "22AAAAA0000A1Z5",
  "buyer_name": "Buyer Company Name",
  "buyer_gstin": "27BBBBB1111B2Y6",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "invoice_type": "purchase",
  "place_of_supply": "Maharashtra",
  "supply_type": "intrastate",
  "subtotal": 100000.00,
  "cgst_amount": 9000.00,
  "sgst_amount": 9000.00,
  "igst_amount": 0.00,
  "cess_amount": 0.00,
  "total_amount": 118000.00,
  "line_items": [
    {
      "description": "Software Development Services",
      "hsn_sac_code": "998314",
      "quantity": 1.0,
      "rate": 100000.00,
      "amount": 100000.00,
      "gst_rate": 18.0,
      "cgst_amount": 9000.00,
      "sgst_amount": 9000.00,
      "igst_amount": 0.00
    }
  ],
  "tds_applicable": false,
  "tds_section": null,
  "tds_rate": 0.0,
  "tds_amount": 0.0,
  "narration": "Brief description of what this invoice is for"
}

Rules:
- invoice_type: "purchase" if we are buying (vendor is selling to us), "sale" if we are selling
- supply_type: "intrastate" if same state GST codes (CGST+SGST applies), "interstate" if different states (IGST applies)
- If CGST+SGST present: supply_type = "intrastate"; if IGST present: supply_type = "interstate"
- tds_applicable: true if this is a service invoice > ₹30,000 (194J) or rent > ₹2.4L/year (194I) or contractor payment (194C)
- tds_section: "194J" for professional/technical services, "194C" for contractors, "194I" for rent, "194A" for interest
- All amounts as numbers, not strings
- If any field is not found, use null for text fields and 0.0 for numeric fields
- invoice_date format: YYYY-MM-DD (convert from any format found on invoice)"""

# ─── Config ───────────────────────────────────────────────────────────────────

_chat_config = types.GenerateContentConfig(
    system_instruction=ACCOUNTING_SYSTEM_PROMPT,
    temperature=0.2,
    max_output_tokens=2048,
    response_mime_type="application/json",
)


# ─── AI Service ───────────────────────────────────────────────────────────────

class AIService:
    # ── Chat / Transaction Recording ──────────────────────────────────────────

    def process_message(
        self,
        message: str,
        chat_history: list = None,
        file_data: Optional[bytes] = None,
        file_name: Optional[str] = None,
        accounts: list = None,
        business_profile: dict = None,
    ) -> dict:
        today = date.today().isoformat()
        prompt = f"[Today's date: {today}]\n\n{message}"

        if file_data and file_name:
            prompt += (
                f"\n\n[User has attached: {file_name}. "
                "Extract transaction details from this invoice/receipt and create the appropriate journal entry.]"
            )

        # Build system prompt — inject business context + custom accounts
        system_prompt = self._build_system_prompt(accounts, business_profile)
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.2,
            max_output_tokens=2048,
            response_mime_type="application/json",
        )

        contents = self._build_contents(chat_history or [], prompt)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=config,
        )
        response_text = response.text.strip()
        return self._parse_response(response_text)

    def _build_system_prompt(self, accounts: list = None, business_profile: dict = None) -> str:
        """Build a context-aware system prompt with business profile + custom chart of accounts."""
        base = ACCOUNTING_SYSTEM_PROMPT

        # Inject business context section
        context_lines = ["\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"]
        context_lines.append("BUSINESS CONTEXT (Current client):")
        if business_profile and business_profile.get("company_name"):
            bp = business_profile
            context_lines.append(f"• Company: {bp.get('company_name', 'Unknown')}")
            if bp.get("business_type"):
                context_lines.append(f"• Type: {bp.get('business_type')}")
            if bp.get("industry"):
                context_lines.append(f"• Industry: {bp.get('industry')}")
            if bp.get("gstin"):
                context_lines.append(f"• GSTIN: {bp.get('gstin')} (GST Registered)")
                context_lines.append(f"• Always apply GST to taxable transactions for this business.")
            elif not bp.get("gst_registered"):
                context_lines.append(f"• NOT GST registered — do not add GST accounts to journal entries.")
            if bp.get("tds_applicable"):
                context_lines.append(f"• TDS APPLICABLE — deduct TDS on eligible payments.")
            else:
                context_lines.append(f"• TDS may not apply — only include TDS if user specifically mentions it.")
            if bp.get("state"):
                context_lines.append(f"• Business state: {bp.get('state')} (use for intrastate/interstate GST determination)")
            if bp.get("currency", "INR") != "INR":
                context_lines.append(f"• Currency: {bp.get('currency')} (convert amounts accordingly)")
            fy_start = bp.get("financial_year_start", "April")
            context_lines.append(f"• Financial year starts: {fy_start}")
        else:
            context_lines.append("• No business profile configured. Using standard Indian MSME defaults.")
            context_lines.append("• Assume GST registered with standard 18% rate unless stated otherwise.")
        context_lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

        base = base + "\n".join(context_lines)

        # Inject custom chart of accounts if available
        if accounts:
            base = self._append_custom_accounts(base, accounts)

        return base

    def _append_custom_accounts(self, prompt: str, accounts: list) -> str:
        """Append user's custom chart of accounts to the system prompt."""
        by_type: dict = {}
        for acc in accounts:
            t = acc.get("account_type", "Other")
            name = acc.get("account_name", "")
            code = acc.get("account_code", "")
            by_type.setdefault(t, []).append(f"{name}" + (f" [{code}]" if code else ""))

        lines = [
            "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            "CUSTOM CHART OF ACCOUNTS (USER-DEFINED — USE THESE FOR JOURNAL ENTRIES):",
        ]
        for type_name in ["Asset", "Liability", "Equity", "Revenue", "Expense"]:
            accs = by_type.get(type_name, [])
            if accs:
                lines.append(f"{type_name.upper()}:")
                lines.extend(f"- {a}" for a in accs)
                lines.append("")
        lines.append("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        return prompt + "\n".join(lines)

    def _build_dynamic_prompt(self, accounts: list) -> str:
        """Legacy method — kept for backward compatibility."""
        return self._build_system_prompt(accounts=accounts)

    def _build_contents(self, chat_history: list, current_prompt: str) -> list:
        contents = []
        last_role = None

        for msg in chat_history[-20:]:
            role = "model" if msg.get("role") == "assistant" else "user"
            content = msg.get("content", "")

            if role == last_role and contents:
                contents[-1].parts[0].text += "\n" + content
            else:
                contents.append(
                    types.Content(role=role, parts=[types.Part(text=content)])
                )
                last_role = role

        # Ensure the final turn is always the current user message
        while contents and contents[-1].role == "user":
            contents.pop()

        contents.append(
            types.Content(role="user", parts=[types.Part(text=current_prompt)])
        )
        return contents

    # ── Invoice Processing ────────────────────────────────────────────────────

    def extract_invoice(
        self,
        file_bytes: bytes,
        mime_type: str,
        filename: str,
    ) -> dict:
        """
        Use Gemini Vision (gemini-2.5-flash) to extract structured invoice data
        from a PDF or image file.
        """
        # Determine the correct MIME type
        ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
        mime_map = {
            "pdf": "application/pdf",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
        }
        resolved_mime = mime_map.get(ext, mime_type or "application/octet-stream")

        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Content(
                        role="user",
                        parts=[
                            types.Part(
                                inline_data=types.Blob(
                                    mime_type=resolved_mime,
                                    data=file_bytes,
                                )
                            ),
                            types.Part(text=INVOICE_EXTRACTION_PROMPT),
                        ],
                    )
                ],
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=4096,
                    response_mime_type="application/json",
                ),
            )
            return self._parse_response(response.text.strip())
        except Exception as e:
            raise RuntimeError(f"Gemini invoice extraction failed: {e}")

    def build_invoice_journal_entry(
        self,
        invoice_data: dict,
        entry_date: str = None,
    ) -> dict:
        """
        Given extracted invoice data, construct the journal entry dict.
        Returns the same structure as the chat journal_entry for consistency.
        """
        inv_type = invoice_data.get("invoice_type", "purchase").lower()
        supply_type = invoice_data.get("supply_type", "intrastate").lower()
        vendor = invoice_data.get("vendor_name", "Unknown Vendor")
        subtotal = float(invoice_data.get("subtotal") or 0)
        cgst = float(invoice_data.get("cgst_amount") or 0)
        sgst = float(invoice_data.get("sgst_amount") or 0)
        igst = float(invoice_data.get("igst_amount") or 0)
        total = float(invoice_data.get("total_amount") or 0)
        inv_num = invoice_data.get("invoice_number", "")
        narration = invoice_data.get("narration", f"Invoice {inv_num} from {vendor}")
        eff_date = entry_date or invoice_data.get("invoice_date") or date.today().isoformat()
        tds_amount = float(invoice_data.get("tds_amount") or 0)

        lines = []

        if inv_type == "purchase":
            # PURCHASE: Dr Expense/Asset + Dr Input GST → Cr Accounts Payable
            lines.append({
                "account_name": "Cost of Goods Sold",  # Override per line items if possible
                "account_type": "Expense",
                "debit": round(subtotal, 2),
                "credit": 0.0,
                "description": f"Purchase from {vendor} — {narration}",
            })
            if cgst > 0:
                lines.append({
                    "account_name": "GST Input Credit – CGST",
                    "account_type": "Asset",
                    "debit": round(cgst, 2),
                    "credit": 0.0,
                    "description": "Input CGST on purchase",
                })
            if sgst > 0:
                lines.append({
                    "account_name": "GST Input Credit – SGST",
                    "account_type": "Asset",
                    "debit": round(sgst, 2),
                    "credit": 0.0,
                    "description": "Input SGST on purchase",
                })
            if igst > 0:
                lines.append({
                    "account_name": "GST Input Credit – IGST",
                    "account_type": "Asset",
                    "debit": round(igst, 2),
                    "credit": 0.0,
                    "description": "Input IGST on purchase",
                })
            # TDS deducted reduces payable
            net_payable = round(total - tds_amount, 2)
            if tds_amount > 0:
                lines.append({
                    "account_name": "TDS Payable",
                    "account_type": "Liability",
                    "debit": 0.0,
                    "credit": round(tds_amount, 2),
                    "description": f"TDS deducted u/s {invoice_data.get('tds_section','194J')} @ {invoice_data.get('tds_rate',0)}%",
                })
            lines.append({
                "account_name": "Accounts Payable",
                "account_type": "Liability",
                "debit": 0.0,
                "credit": round(net_payable, 2),
                "description": f"Amount payable to {vendor}",
            })

        else:
            # SALE: Dr Accounts Receivable → Cr Revenue + Cr Output GST
            lines.append({
                "account_name": "Accounts Receivable",
                "account_type": "Asset",
                "debit": round(total, 2),
                "credit": 0.0,
                "description": f"Receivable from {invoice_data.get('buyer_name', 'Customer')}",
            })
            lines.append({
                "account_name": "Sales Revenue – Services",
                "account_type": "Revenue",
                "debit": 0.0,
                "credit": round(subtotal, 2),
                "description": f"Sales revenue — {narration}",
            })
            if cgst > 0:
                lines.append({
                    "account_name": "GST Payable – CGST",
                    "account_type": "Liability",
                    "debit": 0.0,
                    "credit": round(cgst, 2),
                    "description": "Output CGST on sale",
                })
            if sgst > 0:
                lines.append({
                    "account_name": "GST Payable – SGST",
                    "account_type": "Liability",
                    "debit": 0.0,
                    "credit": round(sgst, 2),
                    "description": "Output SGST on sale",
                })
            if igst > 0:
                lines.append({
                    "account_name": "GST Payable – IGST",
                    "account_type": "Liability",
                    "debit": 0.0,
                    "credit": round(igst, 2),
                    "description": "Output IGST on sale",
                })

        # Validate: debits must equal credits
        total_dr = sum(l["debit"] for l in lines)
        total_cr = sum(l["credit"] for l in lines)
        if abs(total_dr - total_cr) > 0.01:
            # Self-heal: adjust the last credit line
            diff = round(total_dr - total_cr, 2)
            lines[-1]["credit"] = round(lines[-1]["credit"] + diff, 2)

        return {
            "description": narration,
            "entry_date": eff_date,
            "reference": f"INV-{inv_num}" if inv_num else "INV-AI",
            "lines": lines,
            "total_amount": round(total, 2),
            "transaction_type": "expense" if inv_type == "purchase" else "income",
        }

    # ── Parsing Helpers ───────────────────────────────────────────────────────

    def _parse_response(self, text: str) -> dict:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass

        return {"reply": text, "has_journal_entry": False, "journal_entry": None}


    # ── Bank Statement Processing ─────────────────────────────────────────────

    async def extract_bank_statement(self, csv_text: str) -> dict:
        """
        Uses Gemini to extract structured transactions from a raw CSV bank statement.
        """
        prompt = f"""You are a data extraction expert. Parse the following raw bank statement CSV and return a valid JSON object with an array of transactions.
Ignore headers, empty lines, and balance rows. Extract only actual debits/withdrawals and credits/deposits.

Expected JSON format:
{{
  "transactions": [
    {{
      "date": "YYYY-MM-DD",
      "description": "UPI/Zomato/1234",
      "amount": -500.00
    }},
    {{
      "date": "YYYY-MM-DD",
      "description": "NEFT from Client XYZ",
      "amount": 25000.00
    }}
  ]
}}

Rules:
1. Amount MUST be positive for deposits (credits) and negative for withdrawals (debits).
2. Date MUST be in YYYY-MM-DD format.
3. Return ONLY valid JSON, no markdown.

CSV Data:
{csv_text}
"""
        try:
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    response_mime_type="application/json",
                ),
            )
            return self._parse_response(response.text.strip())
        except Exception as e:
            raise RuntimeError(f"Failed to parse bank statement with AI: {e}")
