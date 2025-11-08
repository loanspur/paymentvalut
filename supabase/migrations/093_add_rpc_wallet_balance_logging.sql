-- Add logging to update_partner_wallet_balance RPC function
-- This will help us track when wallet balance is updated via RPC (bypassing UnifiedWalletService)

CREATE OR REPLACE FUNCTION update_partner_wallet_balance(
    p_partner_id UUID,
    p_amount DECIMAL(15,2),
    p_transaction_type VARCHAR(50),
    p_reference VARCHAR(255) DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance DECIMAL(15,2) := 0;
    v_new_balance DECIMAL(15,2);
    v_transaction_id UUID;
    v_result JSONB;
BEGIN
    
    -- If this is a charge related to a disbursement, check disbursement status
    IF p_transaction_type = 'charge' AND p_metadata ? 'related_transaction_id' AND p_metadata->>'related_transaction_type' = 'disbursement' THEN
        DECLARE
            v_disbursement_status VARCHAR(50);
            v_disbursement_id UUID;
        BEGIN
            v_disbursement_id := (p_metadata->>'related_transaction_id')::UUID;
            
            -- Get disbursement status
            SELECT status INTO v_disbursement_status
            FROM disbursement_requests
            WHERE id = v_disbursement_id;
            
            -- CRITICAL: Only allow deduction if disbursement status is 'success'
            IF v_disbursement_status IS NOT NULL AND v_disbursement_status != 'success' THEN
                RETURN jsonb_build_object(
                    'success', FALSE,
                    'error', format('Cannot deduct wallet: Related disbursement status is ''%s'', not ''success''', v_disbursement_status),
                    'partner_id', p_partner_id,
                    'amount', p_amount,
                    'transaction_type', p_transaction_type,
                    'disbursement_id', v_disbursement_id,
                    'disbursement_status', v_disbursement_status
                );
            END IF;
        END;
    END IF;
    
    -- Get or create wallet for the partner
    SELECT id, current_balance INTO v_wallet_id, v_current_balance
    FROM partner_wallets 
    WHERE partner_id = p_partner_id;
    
    -- If wallet doesn't exist, create it
    IF v_wallet_id IS NULL THEN
        INSERT INTO partner_wallets (
            partner_id, 
            current_balance, 
            currency, 
            is_active,
            created_at,
            updated_at
        ) VALUES (
            p_partner_id, 
            0, 
            'KES', 
            TRUE,
            NOW(),
            NOW()
        ) RETURNING id, current_balance INTO v_wallet_id, v_current_balance;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- Validate balance (prevent negative balances for charges and disbursements)
    IF p_transaction_type IN ('charge', 'sms_charge', 'disbursement') AND v_new_balance < 0 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', format('Insufficient balance. Required: %s KES, Available: %s KES', 
                ABS(p_amount), v_current_balance),
            'partner_id', p_partner_id,
            'amount', p_amount,
            'transaction_type', p_transaction_type,
            'previous_balance', v_current_balance
        );
    END IF;
    
    -- Update wallet balance
    UPDATE partner_wallets 
    SET 
        current_balance = v_new_balance,
        updated_at = NOW(),
        -- Update topup fields if this is a topup transaction
        last_topup_date = CASE 
            WHEN p_transaction_type IN ('top_up', 'manual_credit') THEN NOW()
            ELSE last_topup_date 
        END,
        last_topup_amount = CASE 
            WHEN p_transaction_type IN ('top_up', 'manual_credit') THEN p_amount
            ELSE last_topup_amount 
        END
    WHERE id = v_wallet_id;
    
    -- Create or update wallet_transactions record for audit trail
    IF p_reference IS NOT NULL THEN
        SELECT id INTO v_transaction_id
        FROM wallet_transactions
        WHERE reference = p_reference AND wallet_id = v_wallet_id;
    END IF;
    
    IF v_transaction_id IS NOT NULL THEN
        -- Update existing transaction
        UPDATE wallet_transactions
        SET 
            amount = p_amount,
            status = 'completed',
            metadata = jsonb_build_object(
                'wallet_balance_before', v_current_balance,
                'wallet_balance_after', v_new_balance
            ) || COALESCE(p_metadata, '{}'::jsonb),
            updated_at = NOW()
        WHERE id = v_transaction_id;
    ELSE
        -- Create new transaction record
        INSERT INTO wallet_transactions (
            wallet_id,
            transaction_type,
            amount,
            reference,
            description,
            status,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            v_wallet_id,
            p_transaction_type,
            p_amount,
            COALESCE(p_reference, format('RPC_%s_%s', p_transaction_type, NOW()::text)),
            COALESCE(p_description, format('%s transaction', p_transaction_type)),
            'completed',
            jsonb_build_object(
                'wallet_balance_before', v_current_balance,
                'wallet_balance_after', v_new_balance
            ) || COALESCE(p_metadata, '{}'::jsonb),
            NOW(),
            NOW()
        ) RETURNING id INTO v_transaction_id;
    END IF;
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', TRUE,
        'wallet_id', v_wallet_id,
        'partner_id', p_partner_id,
        'previous_balance', v_current_balance,
        'amount', p_amount,
        'new_balance', v_new_balance,
        'transaction_type', p_transaction_type,
        'transaction_id', v_transaction_id,
        'updated_at', NOW()
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'partner_id', p_partner_id,
            'amount', p_amount,
            'transaction_type', p_transaction_type
        );
END;
$$;

-- Update comment
COMMENT ON FUNCTION update_partner_wallet_balance(UUID, DECIMAL, VARCHAR, VARCHAR, TEXT, JSONB) IS 
'Updates partner wallet balance by adding/subtracting amount. Creates wallet if it does not exist. Creates wallet_transactions record for audit trail. Used by STK callback and SMS services. NOW INCLUDES DISBURSEMENT STATUS CHECKING AND LOGGING.';

