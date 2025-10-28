-- Create the missing update_partner_wallet_balance RPC function
-- This function is called by STK callback and SMS services but was never created

CREATE OR REPLACE FUNCTION update_partner_wallet_balance(
    p_partner_id UUID,
    p_amount DECIMAL(15,2),
    p_transaction_type VARCHAR(50)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id UUID;
    v_current_balance DECIMAL(15,2) := 0;
    v_new_balance DECIMAL(15,2);
    v_result JSONB;
BEGIN
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
    
    -- Update wallet balance
    UPDATE partner_wallets 
    SET 
        current_balance = v_new_balance,
        updated_at = NOW(),
        -- Update topup fields if this is a topup transaction
        last_topup_date = CASE 
            WHEN p_transaction_type = 'top_up' THEN NOW()
            ELSE last_topup_date 
        END,
        last_topup_amount = CASE 
            WHEN p_transaction_type = 'top_up' THEN p_amount
            ELSE last_topup_amount 
        END
    WHERE id = v_wallet_id;
    
    -- Return success result
    v_result := jsonb_build_object(
        'success', TRUE,
        'wallet_id', v_wallet_id,
        'partner_id', p_partner_id,
        'previous_balance', v_current_balance,
        'amount', p_amount,
        'new_balance', v_new_balance,
        'transaction_type', p_transaction_type,
        'updated_at', NOW()
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Return error result
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', SQLERRM,
            'partner_id', p_partner_id,
            'amount', p_amount,
            'transaction_type', p_transaction_type
        );
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION update_partner_wallet_balance(UUID, DECIMAL, VARCHAR) IS 
'Updates partner wallet balance by adding/subtracting amount. Creates wallet if it does not exist. Used by STK callback and SMS services.';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_partner_wallet_balance(UUID, DECIMAL, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_partner_wallet_balance(UUID, DECIMAL, VARCHAR) TO service_role;
