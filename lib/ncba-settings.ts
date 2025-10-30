import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type NcbaOpenBankingSettings = {
  environment: 'uat' | 'prod'
  baseUrl: string
  tokenPath: string
  floatPurchasePath: string
  subscriptionKey: string
  username: string
  password: string
  debitAccountNumber: string
  debitAccountCurrency: string
  country: string
}

export async function loadNcbaOpenBankingSettings(): Promise<{ ok: boolean, data?: NcbaOpenBankingSettings, error?: string }>{
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value, is_encrypted')
      .in('setting_key', [
        'ncba_ob_environment',
        'ncba_ob_uat_base_url',
        'ncba_ob_prod_base_url',
        'ncba_ob_token_path',
        'ncba_ob_float_purchase_path',
        'ncba_ob_subscription_key',
        'ncba_ob_username',
        'ncba_ob_password',
        'ncba_ob_debit_account_number',
        'ncba_ob_debit_account_currency',
        'ncba_ob_country'
      ])

    if (error) {
      return { ok: false, error: error.message }
    }

    const map: Record<string, string> = {}
    for (const row of data || []) {
      map[row.setting_key] = (row.setting_value || '').trim()
    }

    const environment = (map['ncba_ob_environment'] as 'uat' | 'prod') || 'uat'
    const baseUrl = environment === 'prod' ? (map['ncba_ob_prod_base_url'] || '') : (map['ncba_ob_uat_base_url'] || '')

    const settings: NcbaOpenBankingSettings = {
      environment,
      baseUrl,
      tokenPath: map['ncba_ob_token_path'] || '',
      floatPurchasePath: map['ncba_ob_float_purchase_path'] || '',
      subscriptionKey: map['ncba_ob_subscription_key'] || '',
      username: map['ncba_ob_username'] || '',
      password: map['ncba_ob_password'] || '',
      debitAccountNumber: map['ncba_ob_debit_account_number'] || '',
      debitAccountCurrency: map['ncba_ob_debit_account_currency'] || 'KES',
      country: map['ncba_ob_country'] || 'Kenya'
    }

    // Basic validation
    const missing = Object.entries(settings)
      .filter(([k, v]) => !v)
      .map(([k]) => k)

    if (missing.length > 0) {
      return { ok: false, error: `Missing NCBA OB settings: ${missing.join(', ')}` }
    }

    return { ok: true, data: settings }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}

export const REQUIRED_NCBA_OB_KEYS = [
  'ncba_ob_environment',
  'ncba_ob_uat_base_url',
  'ncba_ob_prod_base_url',
  'ncba_ob_token_path',
  'ncba_ob_float_purchase_path',
  'ncba_ob_subscription_key',
  'ncba_ob_username',
  'ncba_ob_password',
  'ncba_ob_debit_account_number',
  'ncba_ob_debit_account_currency',
  'ncba_ob_country'
]


