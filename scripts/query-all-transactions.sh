#!/bin/bash

# Script to query transaction status for all 6 clients
# Make sure to set your M-Pesa credentials as environment variables first

# Array of Originator Conversation IDs
ORIGINATOR_IDS=(
  "f2b1-40c1-a220-7619c6f034df793486"      # JACOB MINDOTI MUTALI
  "e694-42b9-941a-9e925d007ac734845"        # VINCENT MANOTI NYANUMBA
  "79a5-49d8-b115-ea418254912636475"        # ONYANCHA KENYATTA JOSEPH
  "cd32-4f5a-9ec7-6c7b1af0e88e420409"        # DOUGLAS K KIPLAGAT
  "e18a-47cc-9cb2-f59cebf4e46d21005"        # VINCENT NYATANGI CHAKWA
  "012e-4077-9e75-d1e27265b99098043"        # RONOH GILBERT CHERUIYOT
)

# Client names (for reference)
CLIENT_NAMES=(
  "JACOB MINDOTI MUTALI"
  "VINCENT MANOTI NYANUMBA"
  "ONYANCHA KENYATTA JOSEPH"
  "DOUGLAS K KIPLAGAT"
  "VINCENT NYATANGI CHAKWA"
  "RONOH GILBERT CHERUIYOT"
)

echo "=========================================="
echo "Querying M-Pesa Transaction Status"
echo "=========================================="
echo ""

# Check if credentials are set
if [ -z "$MPESA_CONSUMER_KEY" ] || [ -z "$MPESA_CONSUMER_SECRET" ]; then
  echo "❌ Error: M-Pesa credentials not set"
  echo ""
  echo "Please set the following environment variables:"
  echo "  export MPESA_CONSUMER_KEY='your_consumer_key'"
  echo "  export MPESA_CONSUMER_SECRET='your_consumer_secret'"
  echo "  export MPESA_SECURITY_CREDENTIAL='your_security_credential'"
  echo "  export MPESA_INITIATOR_NAME='your_initiator_name'"
  echo "  export MPESA_SHORTCODE='your_shortcode'"
  echo "  export MPESA_ENVIRONMENT='production'  # or 'sandbox'"
  echo "  export MPESA_RESULT_URL='https://your-domain.com/api/mpesa-callback/transaction-status-result'"
  echo "  export MPESA_TIMEOUT_URL='https://your-domain.com/api/mpesa-callback/transaction-status-timeout'"
  exit 1
fi

# Query each transaction
for i in "${!ORIGINATOR_IDS[@]}"; do
  ORIGINATOR_ID="${ORIGINATOR_IDS[$i]}"
  CLIENT_NAME="${CLIENT_NAMES[$i]}"
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Querying: $CLIENT_NAME"
  echo "Originator Conversation ID: $ORIGINATOR_ID"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  node scripts/query-mpesa-transaction-status.js "$ORIGINATOR_ID"
  
  echo ""
  echo "⏳ Waiting 3 seconds before next query..."
  sleep 3
  echo ""
done

echo "=========================================="
echo "✅ All queries completed!"
echo "=========================================="
echo ""
echo "📋 Next steps:"
echo "1. Check your callback endpoint: $MPESA_RESULT_URL"
echo "2. Review the results in your database (mpesa_callbacks table)"
echo "3. Check server logs for callback receipts"
echo ""

