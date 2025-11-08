-- Add trigger to log ALL direct wallet balance updates
-- This will catch any direct UPDATE statements that bypass UnifiedWalletService and RPC

CREATE OR REPLACE FUNCTION log_wallet_balance_update()
RETURNS TRIGGER AS $$
DECLARE
    v_balance_change DECIMAL(15,2);
    v_change_type TEXT;
    v_pending_charges_count INTEGER;
BEGIN
    v_balance_change := NEW.current_balance - OLD.current_balance;
    v_change_type := CASE WHEN v_balance_change < 0 THEN 'DEBIT' ELSE 'CREDIT' END;
    
    -- Count pending charges for this partner to see if this might be related
    SELECT COUNT(*) INTO v_pending_charges_count
    FROM partner_charge_transactions
    WHERE partner_id = NEW.partner_id
    AND status = 'pending'
    AND related_transaction_type = 'disbursement';
    
    -- Log direct wallet updates (only for debugging)
    RAISE WARNING '[DIRECT WALLET UPDATE] Partner: %, Balance: % -> % KES (%), Pending charges: %', 
        NEW.partner_id, OLD.current_balance, NEW.current_balance, v_change_type, v_pending_charges_count;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on partner_wallets table
DROP TRIGGER IF EXISTS log_wallet_balance_update_trigger ON partner_wallets;

CREATE TRIGGER log_wallet_balance_update_trigger
    AFTER UPDATE OF current_balance ON partner_wallets
    FOR EACH ROW
    WHEN (OLD.current_balance IS DISTINCT FROM NEW.current_balance)
    EXECUTE FUNCTION log_wallet_balance_update();

COMMENT ON FUNCTION log_wallet_balance_update() IS 
'Logs all direct wallet balance updates that bypass UnifiedWalletService. This helps identify unauthorized or unintended wallet balance changes.';

