-- ============================================================
-- NexBooks Phase 4 — Bank Reconciliation & Parties Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. PARTIES (Customers, Vendors, Employees)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.parties (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    party_type    TEXT         NOT NULL CHECK (party_type IN ('Customer','Vendor','Employee')),
    party_name    TEXT         NOT NULL,
    gstin         TEXT,
    pan           TEXT,
    phone         TEXT,
    email         TEXT,
    address       TEXT,
    created_by    UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (party_name, created_by)
);

-- Add party_id to invoices
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='invoices' AND column_name='party_id'
    ) THEN
        ALTER TABLE public.invoices
            ADD COLUMN party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add party_id to journal_entries
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='journal_entries' AND column_name='party_id'
    ) THEN
        ALTER TABLE public.journal_entries
            ADD COLUMN party_id UUID REFERENCES public.parties(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 2. BANK TRANSACTIONS (For Reconciliation)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date DATE         NOT NULL,
    description      TEXT         NOT NULL,
    amount           NUMERIC(15,2) NOT NULL, -- Positive for deposits, Negative for withdrawals
    transaction_type TEXT         NOT NULL CHECK (transaction_type IN ('Deposit','Withdrawal')),
    reference_number TEXT,
    status           TEXT         NOT NULL DEFAULT 'unreconciled' CHECK (status IN ('unreconciled','reconciled','ignored')),
    journal_entry_id UUID         REFERENCES public.journal_entries(id) ON DELETE SET NULL,
    created_by       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
