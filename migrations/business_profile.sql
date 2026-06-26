-- ============================================================
-- NexBooks — Business Profile Schema
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.business_profiles (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name        TEXT         NOT NULL,
    business_type       TEXT,        -- Sole Proprietorship | Partnership | LLP | Pvt Ltd | Public Ltd | Other
    industry            TEXT,
    gstin               TEXT,
    pan_number          TEXT,
    country             TEXT         NOT NULL DEFAULT 'India',
    currency            TEXT         NOT NULL DEFAULT 'INR',
    financial_year_start TEXT        NOT NULL DEFAULT 'April',   -- April | January | July
    financial_year      TEXT,        -- e.g. '2024-25'
    address_line1       TEXT,
    address_line2       TEXT,
    city                TEXT,
    state               TEXT,
    pincode             TEXT,
    phone               TEXT,
    email               TEXT,
    website             TEXT,
    logo_url            TEXT,
    tds_applicable      BOOLEAN      NOT NULL DEFAULT FALSE,
    gst_registered      BOOLEAN      NOT NULL DEFAULT FALSE,
    onboarding_complete BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)   -- one profile per user
);

-- RLS
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own business profile"
    ON public.business_profiles
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_business_profiles_user ON public.business_profiles(user_id);
