-- Add database-level protection to prevent wallet deductions for failed disbursements
-- This creates a trigger that blocks direct wallet balance updates if there are pending charges for failed disbursements

CREATE OR REPLACE FUNCTION prevent_failed_disbursement_charges()
RETURNS TRIGGER AS $$
DECLARE
    v_balance_change DECIMAL(15,2);
    v_pending_charges RECORD;
    v_disbursement_status VARCHAR(50);
    v_blocked BOOLEAN := FALSE;
BEGIN
    v_balance_change := NEW.current_balance - OLD.current_balance;
    
    -- Only check for DEBIT transactions (negative balance changes)
    IF v_balance_change < 0 THEN
        -- Check if there are pending charges for disbursements that might be causing this deduction
        FOR v_pending_charges IN
            SELECT 
                pct.id,
                pct.related_transaction_id,
                pct.charge_amount,
                pct.status,
                dr.status as disbursement_status,
                dr.result_code
            FROM partner_charge_transactions pct
            LEFT JOIN disbursement_requests dr ON dr.id = pct.related_transaction_id
            WHERE pct.partner_id = NEW.partner_id
            AND pct.related_transaction_type = 'disbursement'
            AND pct.status IN ('pending', 'completed') -- Check both pending and recently completed
            AND ABS(v_balance_change) >= (pct.charge_amount * 0.9) -- Within 10% tolerance
            AND ABS(v_balance_change) <= (pct.charge_amount * 1.1)
            AND pct.created_at > NOW() - INTERVAL '1 hour' -- Only check recent charges (last hour)
            ORDER BY pct.created_at DESC
            LIMIT 5
        LOOP
            -- Get the actual disbursement status
            IF v_pending_charges.related_transaction_id IS NOT NULL THEN
                SELECT status INTO v_disbursement_status
                FROM disbursement_requests
                WHERE id = v_pending_charges.related_transaction_id;
                
                -- CRITICAL: Block deduction if disbursement is not 'success'
                IF v_disbursement_status IS NOT NULL AND v_disbursement_status != 'success' THEN
                    RAISE WARNING '[BLOCKED] Wallet deduction blocked - Disbursement % status is ''%'' (not ''success'')', 
                        v_pending_charges.related_transaction_id, v_disbursement_status;
                    NEW.current_balance := OLD.current_balance;
                    v_blocked := TRUE;
                    EXIT;
                END IF;
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger BEFORE UPDATE to block the update if disbursement is not successful
DROP TRIGGER IF EXISTS prevent_failed_disbursement_charges_trigger ON partner_wallets;

CREATE TRIGGER prevent_failed_disbursement_charges_trigger
    BEFORE UPDATE OF current_balance ON partner_wallets
    FOR EACH ROW
    WHEN (OLD.current_balance IS DISTINCT FROM NEW.current_balance AND NEW.current_balance < OLD.current_balance)
    EXECUTE FUNCTION prevent_failed_disbursement_charges();

COMMENT ON FUNCTION prevent_failed_disbursement_charges() IS 
'Blocks wallet balance deductions (DEBITs) if there are pending charges for disbursements that are not in ''success'' status. This provides database-level protection against unauthorized deductions.';