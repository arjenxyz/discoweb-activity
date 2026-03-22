-- wallet_ledger_type enum'una eksik değerleri ekle
ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'earn_message';
ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'earn_voice';
ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'market_fee';
ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'dividend';
ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'treasury_in';
ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'burn';
ALTER TYPE public.wallet_ledger_type ADD VALUE IF NOT EXISTS 'cross_server_transfer';
