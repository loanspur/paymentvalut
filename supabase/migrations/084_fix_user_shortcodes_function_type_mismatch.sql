-- Fix get_user_accessible_shortcodes_enhanced function type mismatch
-- The function declares TEXT return types but selects VARCHAR columns
-- This causes error: "Returned type character varying(50) does not match expected type text in column 2"

CREATE OR REPLACE FUNCTION get_user_accessible_shortcodes_enhanced(p_user_id UUID)
RETURNS TABLE(
    shortcode_id UUID, 
    shortcode TEXT, 
    partner_name TEXT,
    access_type TEXT,
    granted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        usa.shortcode_id,
        p.short_code::TEXT,  -- Cast VARCHAR(50) to TEXT
        p.name::TEXT as partner_name,  -- Cast VARCHAR(255) to TEXT
        CASE 
            WHEN usa.access_type IS NOT NULL THEN usa.access_type::TEXT
            ELSE 'read'::TEXT
        END as access_type,
        usa.created_at as granted_at
    FROM user_shortcode_access usa
    JOIN partners p ON usa.shortcode_id = p.id
    WHERE usa.user_id = p_user_id
    AND usa.is_active = true
    AND p.is_active = true
    
    UNION
    
    -- Also include shortcodes from user's partner if they have a partner_id
    SELECT 
        p.id as shortcode_id,
        p.short_code::TEXT,  -- Cast VARCHAR(50) to TEXT
        p.name::TEXT as partner_name,  -- Cast VARCHAR(255) to TEXT
        'read'::TEXT as access_type,
        u.created_at as granted_at
    FROM users u
    JOIN partners p ON u.partner_id = p.id
    WHERE u.id = p_user_id
    AND u.partner_id IS NOT NULL
    AND p.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM user_shortcode_access usa2 
        WHERE usa2.user_id = p_user_id 
        AND usa2.shortcode_id = p.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_accessible_shortcodes_enhanced IS 'Enhanced function to get all shortcodes a user can access. Fixed type mismatch by casting VARCHAR to TEXT.';

