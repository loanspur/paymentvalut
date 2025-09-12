Likeliest causes (ranked)

You’re on SANDBOX, not PRODUCTION

If MPESA_ENV=sandbox or your base URL is https://sandbox.safaricom.co.ke, Safaricom will return success + a dummy receipt, but no real funds move.

The receipt style like TIB123456789 strongly looks non-production/test (production receipts are typically alphanumeric like LGxxxxxx, though formats can vary).

Prod app/credentials mismatch

Using sandbox consumer key/secret or sandbox initiator password with the production endpoint (or vice-versa) can yield confusing results.

The SecurityCredential must be encrypted with the correct (prod) public cert for your initiator, and the InitiatorName must match the B2C profile on your shortcode.

B2C product or float not set on the shortcode

Your shortcode must have B2C enabled and a funded Operating/B2C wallet.

If B2C isn’t provisioned or float is zero, some integrators see “accepted” but the org wallet never pays out. (A proper prod setup should return a failure, but misconfigs happen.)

Wrong PartyA/CommandID or wrong MSISDN

PartyA must be your shortcode (B2C/Paybill) and CommandID should be BusinessPayment (or SalaryPayment/PromotionPayment as contracted).

PartyB must be a valid M-Pesa-registered MSISDN in international format (2547…).

Your callback is not from the env you think

If you pointed ResultURL to dev/sandbox while calling prod, you might be recording a sandbox-style callback unrelated to a real disbursement.

10-minute verification checklist

A. Log the environment actually used
In your Edge Function before calling OAuth/B2C, log the base URL you computed:

Expect prod: https://api.safaricom.co.ke

Expect sandbox: https://sandbox.safaricom.co.ke

B. Confirm the secrets in Supabase:

MPESA_CONSUMER_KEY/SECRET → production app (not sandbox).

MPESA_INITIATOR_NAME → exactly as provisioned for B2C on your shortcode.

MPESA_INITIATOR_PASSWORD → prod encryption using the production cert.

MPESA_SHORTCODE → the prod shortcode with B2C enabled.

C. Check your B2C wallet balance (Org portal) or call AccountBalance API from the same function. If balance doesn’t decrease after a “success,” you didn’t do a live payout.

D. Call Transaction Status API on the receipt
Add a quick Edge Function to call TransactionStatus for TIB123456789.

If it’s unknown in prod, you’re not on prod or receipt is sandbox.

If it returns details, verify the MSISDN/amount; otherwise, not a real payout.

E. Inspect your callback headers
Log source IPs / headers for callbacks. If they’re your own test posts or from a sandbox simulator, that explains it.

What to fix (actionable)

Set MPESA_ENV=production and prod base URL
Make sure your code selects:

const envBase = Deno.env.get("MPESA_ENV") === "production"
  ? "https://api.safaricom.co.ke"
  : "https://sandbox.safaricom.co.ke";


Recreate the SecurityCredential for PROD

Download the production Safaricom public cert.

Encrypt your Initiator password with that cert to produce the prod SecurityCredential.

Store it in Function Secrets (not Vault-exposed to clients).

Verify B2C is provisioned on the shortcode
Ask Safaricom or check your account: the shortcode needs B2C product activated and float funded.

Harden the request you store
Save these fields in disbursement_requests: env_used, base_url, command_id, party_a, party_b, so you can audit exactly what you sent.

Gate USSD loan creation/SMS on a second check
Even with callbacks, add a Transaction Status verification before telling USSD “success.” That way, if you ever get a misleading callback, you still won’t create loans without a verifiable M-Pesa record.

Quick code: add a Transaction Status check (server-side)

Use this when your callback shows result_code=0, before you notify USSD:

async function checkTransactionStatus(envBase: string, accessToken: string, receipt: string) {
  const payload = {
    CommandID: "TransactionStatusQuery",
    PartyA: Number(Deno.env.get("MPESA_SHORTCODE")),
    IdentifierType: "4", // 4 = Shortcode, per docs
    Remarks: "Verify B2C Txn",
    Initiator: Deno.env.get("MPESA_INITIATOR_NAME"),
    SecurityCredential: Deno.env.get("MPESA_INITIATOR_PASSWORD"),
    QueueTimeOutURL: `${Deno.env.get("CALLBACK_BASE_URL")}/mpesa/txnstatus/timeout`,
    ResultURL: `${Deno.env.get("CALLBACK_BASE_URL")}/mpesa/txnstatus/result`,
    TransactionID: receipt
  };
  const res = await fetch(`${envBase}/mpesa/transactionstatus/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}


If TransactionStatus confirms the payout and matches msisdn/amount, proceed to notify USSD and create the loan with that receipt. If not, flag and stop.

Interpret your current record
{
  "result_code": "0",
  "result_desc": "processed successfully",
  "receipt_number": "TIB123456789",
  "transaction_amount": "5.00"
}


Looks like sandbox/test (receipt pattern, tiny amount).

If you expected real cash, you’re almost certainly still using sandbox endpoints/credentials or a prod misconfig that generated a non-live callback.