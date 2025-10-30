NCBA Open Banking Settings (UAT/PROD)

Add the following keys into `system_settings` to support NCBA Open Banking token and fund transfer APIs.

Keys
- ncba_ob_environment: uat | prod
- ncba_ob_uat_base_url: e.g. https://openbankingtest.api.ncbagroup.com/test/apigateway/
- ncba_ob_prod_base_url: e.g. https://openbanking.api.ncbagroup.com/apigateway/
- ncba_ob_subscription_key: subscription key for headers
- ncba_ob_token_path: token endpoint path (e.g., auth/token)
- ncba_ob_float_purchase_path: float purchase endpoint path
- ncba_ob_username: token username
- ncba_ob_password: token password
- ncba_ob_debit_account_number: NCBA account to debit
- ncba_ob_debit_account_currency: KES
- ncba_ob_country: Kenya

Notes
- Token: POST body { "username": "...", "password": "..." } and header `Ocp-Apim-Subscription-Key: ...`.
- All other endpoints must include the `Authorization: Bearer <token>` and subscription key header.

SQL helper
```sql
-- Insert placeholders
INSERT INTO system_settings (setting_key, setting_value, is_encrypted)
VALUES
 ('ncba_ob_environment','uat',false),
 ('ncba_ob_uat_base_url','https://openbankingtest.api.ncbagroup.com/test/apigateway/',false),
 ('ncba_ob_prod_base_url','',false),
 ('ncba_ob_subscription_key','',true),
 ('ncba_ob_username','',true),
 ('ncba_ob_password','',true),
 ('ncba_ob_debit_account_number','',false),
 ('ncba_ob_debit_account_currency','KES',false),
 ('ncba_ob_country','Kenya',false)
ON CONFLICT (setting_key) DO NOTHING;
```

Loader
- Use `loadNcbaOpenBankingSettings()` from `lib/ncba-settings.ts` to read and validate settings.


