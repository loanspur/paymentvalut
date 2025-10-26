// Comprehensive Duplicate Prevention Service
// Handles multiple layers of duplicate prevention and intelligent insufficient funds management

export interface DuplicateCheckResult {
  isDuplicate: boolean
  blockReason?: string
  blockType?: string
  existingRequest?: any
  shouldQueue?: boolean
  queueReason?: string
}

export interface InsufficientFundsResult {
  hasInsufficientFunds: boolean
  currentBalance: number
  requestedAmount: number
  shortfall: number
  shouldQueue: boolean
  estimatedRefillTime?: Date
}

export class DuplicatePreventionService {
  private supabaseClient: any

  constructor(supabaseClient: any) {
    this.supabaseClient = supabaseClient
  }

  /**
   * Comprehensive duplicate check with multiple layers
   */
  async checkForDuplicates(
    partnerId: string,
    customerId: string,
    msisdn: string,
    amount: number,
    clientIp: string,
    clientRequestId: string,
    origin?: string
  ): Promise<DuplicateCheckResult> {
    
    // 1. Check basic idempotency (client_request_id) - Always check this
    const idempotencyCheck = await this.checkIdempotency(partnerId, clientRequestId)
    if (idempotencyCheck.isDuplicate) {
      return idempotencyCheck
    }

    // 2. BYPASS: Skip restrictions for USSD transactions to prevent blocking legitimate transactions
    if (origin === 'ussd') {
      console.log('🚀 [USSD Bypass] Skipping duplicate prevention restrictions for USSD transaction')
      return { isDuplicate: false }
    }

    // 3. Check if restrictions are disabled for this partner
    const { data: restrictions } = await this.supabaseClient
      .from('disbursement_restrictions')
      .select('is_enabled')
      .eq('partner_id', partnerId)
      .eq('is_enabled', true)
      .limit(1)

    if (!restrictions || restrictions.length === 0) {
      console.log('🚀 [Restrictions Disabled] No active restrictions found for partner, allowing transaction')
      return { isDuplicate: false }
    }

    // 4. Check time-based restrictions
    const timeBasedCheck = await this.checkTimeBasedRestrictions(
      partnerId, customerId, msisdn, amount, clientIp
    )
    if (timeBasedCheck.isDuplicate) {
      return timeBasedCheck
    }

    // 5. Check daily limits
    const dailyLimitCheck = await this.checkDailyLimits(
      partnerId, customerId, clientIp, amount
    )
    if (dailyLimitCheck.isDuplicate) {
      return dailyLimitCheck
    }

    // 6. Check active blocks
    const blockCheck = await this.checkActiveBlocks(
      partnerId, customerId, clientIp
    )
    if (blockCheck.isDuplicate) {
      return blockCheck
    }

    return { isDuplicate: false }
  }

  /**
   * Check basic idempotency using client_request_id
   */
  private async checkIdempotency(
    partnerId: string, 
    clientRequestId: string
  ): Promise<DuplicateCheckResult> {
    const { data: existingRequest } = await this.supabaseClient
      .from('disbursement_requests')
      .select('id, status, conversation_id, created_at')
      .eq('client_request_id', clientRequestId)
      .eq('partner_id', partnerId)
      .single()

    if (existingRequest) {
      return {
        isDuplicate: true,
        blockReason: `Request with client_request_id '${clientRequestId}' already exists`,
        blockType: 'idempotency',
        existingRequest
      }
    }

    return { isDuplicate: false }
  }

  /**
   * Check time-based restrictions (same customer+amount, similar amounts, same IP within time window)
   */
  private async checkTimeBasedRestrictions(
    partnerId: string,
    customerId: string,
    msisdn: string,
    amount: number,
    clientIp: string
  ): Promise<DuplicateCheckResult> {
    
    // Get time-based restrictions for this partner
    const { data: restrictions } = await this.supabaseClient
      .from('disbursement_restrictions')
      .select('restriction_type, time_window_minutes, amount_tolerance_percentage, action_type, log_similar_amounts')
      .eq('partner_id', partnerId)
      .eq('is_enabled', true)
      .in('restriction_type', ['same_customer_amount_time', 'same_customer_similar_amount', 'same_ip_time'])

    for (const restriction of restrictions || []) {
      const timeWindow = restriction.time_window_minutes * 60 * 1000 // Convert to milliseconds
      const cutoffTime = new Date(Date.now() - timeWindow)

      if (restriction.restriction_type === 'same_customer_amount_time') {
        // Check for same customer + exact same amount within time window
        const { data: recentRequest } = await this.supabaseClient
          .from('disbursement_requests')
          .select('id, created_at, status, amount')
          .eq('partner_id', partnerId)
          .eq('customer_id', customerId)
          .eq('amount', amount)
          .gte('created_at', cutoffTime.toISOString())
          .in('status', ['queued', 'accepted', 'success'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (recentRequest) {
          const timeDiff = Date.now() - new Date(recentRequest.created_at).getTime()
          const minutesAgo = Math.floor(timeDiff / 60000)
          
          // Log the exact duplicate detection
          await this.logDuplicateDetection({
            partnerId,
            customerId,
            msisdn,
            amount,
            clientIp,
            detectionType: 'exact_duplicate',
            restrictionType: restriction.restriction_type,
            timeWindowMinutes: restriction.time_window_minutes,
            actionTaken: 'blocked',
            similarAmountsFound: [recentRequest],
            amountDifference: 0,
            percentageDifference: 0
          })
          
          return {
            isDuplicate: true,
            blockReason: `Exact duplicate disbursement: Same customer (${customerId}) and exact amount (KES ${amount}) within ${restriction.time_window_minutes} minutes. Last request was ${minutesAgo} minutes ago.`,
            blockType: 'duplicate_customer_amount',
            existingRequest: recentRequest
          }
        }
      }

      if (restriction.restriction_type === 'same_customer_similar_amount') {
        // Check for same customer + similar amount within time window
        const tolerance = restriction.amount_tolerance_percentage / 100
        const minAmount = amount * (1 - tolerance)
        const maxAmount = amount * (1 + tolerance)

        const { data: similarRequests } = await this.supabaseClient
          .from('disbursement_requests')
          .select('id, created_at, status, amount')
          .eq('partner_id', partnerId)
          .eq('customer_id', customerId)
          .gte('amount', minAmount)
          .lte('amount', maxAmount)
          .gte('created_at', cutoffTime.toISOString())
          .in('status', ['queued', 'accepted', 'success'])
          .order('created_at', { ascending: false })
          .limit(5)

        if (similarRequests && similarRequests.length > 0) {
          const timeDiff = Date.now() - new Date(similarRequests[0].created_at).getTime()
          const minutesAgo = Math.floor(timeDiff / 60000)
          
          // Calculate amount differences
          const similarAmounts = similarRequests.map(req => ({
            id: req.id,
            amount: req.amount,
            created_at: req.created_at,
            amount_difference: Math.abs(req.amount - amount),
            percentage_difference: Math.abs((req.amount - amount) / amount * 100)
          }))

          // Log the similar amount detection
          await this.logDuplicateDetection({
            partnerId,
            customerId,
            msisdn,
            amount,
            clientIp,
            detectionType: 'similar_amount',
            restrictionType: restriction.restriction_type,
            timeWindowMinutes: restriction.time_window_minutes,
            amountTolerancePercentage: restriction.amount_tolerance_percentage,
            actionTaken: restriction.action_type === 'block' ? 'blocked' : 'allowed_with_warning',
            similarAmountsFound: similarAmounts,
            amountDifference: similarAmounts[0].amount_difference,
            percentageDifference: similarAmounts[0].percentage_difference
          })

          if (restriction.action_type === 'block') {
            return {
              isDuplicate: true,
              blockReason: `Similar amount disbursement: Same customer (${customerId}) with similar amount (KES ${amount}) within ${restriction.time_window_minutes} minutes. Found ${similarRequests.length} similar requests. Last request was ${minutesAgo} minutes ago.`,
              blockType: 'duplicate_customer_similar_amount',
              existingRequest: similarRequests[0]
            }
          } else {
            // Allow but log for monitoring
            console.log(`⚠️ [Similar Amount Warning] Customer ${customerId} requested KES ${amount} with ${similarRequests.length} similar requests in last ${restriction.time_window_minutes} minutes`)
          }
        }
      }

      if (restriction.restriction_type === 'same_ip_time') {
        // Check for same IP within time window
        const { data: recentRequest } = await this.supabaseClient
          .from('disbursement_requests')
          .select('id, created_at, status, customer_id, amount')
          .eq('partner_id', partnerId)
          .eq('client_ip', clientIp)
          .gte('created_at', cutoffTime.toISOString())
          .in('status', ['queued', 'accepted', 'success'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (recentRequest) {
          const timeDiff = Date.now() - new Date(recentRequest.created_at).getTime()
          const minutesAgo = Math.floor(timeDiff / 60000)
          
          // Log the IP rate limit detection
          await this.logDuplicateDetection({
            partnerId,
            customerId,
            msisdn,
            amount,
            clientIp,
            detectionType: 'rate_limit',
            restrictionType: restriction.restriction_type,
            timeWindowMinutes: restriction.time_window_minutes,
            actionTaken: 'rate_limited',
            similarAmountsFound: [recentRequest],
            amountDifference: 0,
            percentageDifference: 0
          })
          
          return {
            isDuplicate: true,
            blockReason: `Rate limit exceeded: Same IP (${clientIp}) within ${restriction.time_window_minutes} minutes. Last request was ${minutesAgo} minutes ago.`,
            blockType: 'duplicate_ip',
            existingRequest: recentRequest
          }
        }
      }
    }

    return { isDuplicate: false }
  }

  /**
   * Check daily limits per customer and IP
   */
  private async checkDailyLimits(
    partnerId: string,
    customerId: string,
    clientIp: string,
    amount: number
  ): Promise<DuplicateCheckResult> {
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get daily limit restrictions
    const { data: restrictions } = await this.supabaseClient
      .from('disbursement_restrictions')
      .select('restriction_type, daily_limit_amount, daily_limit_count')
      .eq('partner_id', partnerId)
      .eq('is_enabled', true)
      .in('restriction_type', ['same_customer_daily_limit', 'same_ip_daily_limit'])

    for (const restriction of restrictions || []) {
      if (restriction.restriction_type === 'same_customer_daily_limit') {
        // Check customer daily limits
        const { data: dailyStats } = await this.supabaseClient
          .from('disbursement_requests')
          .select('amount')
          .eq('partner_id', partnerId)
          .eq('customer_id', customerId)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
          .in('status', ['queued', 'accepted', 'success'])

        const dailyAmount = dailyStats?.reduce((sum: number, req: any) => sum + parseFloat(req.amount), 0) || 0
        const dailyCount = dailyStats?.length || 0

        if (dailyAmount + amount > restriction.daily_limit_amount) {
          return {
            isDuplicate: true,
            blockReason: `Daily amount limit exceeded: Customer ${customerId} has already disbursed KES ${dailyAmount} today (limit: KES ${restriction.daily_limit_amount})`,
            blockType: 'daily_limit_exceeded'
          }
        }

        if (dailyCount >= restriction.daily_limit_count) {
          return {
            isDuplicate: true,
            blockReason: `Daily count limit exceeded: Customer ${customerId} has already made ${dailyCount} disbursements today (limit: ${restriction.daily_limit_count})`,
            blockType: 'daily_limit_exceeded'
          }
        }
      }

      if (restriction.restriction_type === 'same_ip_daily_limit') {
        // Check IP daily limits
        const { data: dailyStats } = await this.supabaseClient
          .from('disbursement_requests')
          .select('amount')
          .eq('partner_id', partnerId)
          .gte('created_at', today.toISOString())
          .lt('created_at', tomorrow.toISOString())
          .in('status', ['queued', 'accepted', 'success'])

        const dailyAmount = dailyStats?.reduce((sum: number, req: any) => sum + parseFloat(req.amount), 0) || 0
        const dailyCount = dailyStats?.length || 0

        if (dailyAmount + amount > restriction.daily_limit_amount) {
          return {
            isDuplicate: true,
            blockReason: `Daily IP amount limit exceeded: IP ${clientIp} has already disbursed KES ${dailyAmount} today (limit: KES ${restriction.daily_limit_amount})`,
            blockType: 'daily_limit_exceeded'
          }
        }

        if (dailyCount >= restriction.daily_limit_count) {
          return {
            isDuplicate: true,
            blockReason: `Daily IP count limit exceeded: IP ${clientIp} has already made ${dailyCount} disbursements today (limit: ${restriction.daily_limit_count})`,
            blockType: 'daily_limit_exceeded'
          }
        }
      }
    }

    return { isDuplicate: false }
  }

  /**
   * Check for active blocks
   */
  private async checkActiveBlocks(
    partnerId: string,
    customerId: string,
    clientIp: string
  ): Promise<DuplicateCheckResult> {
    
    const now = new Date()

    // Check customer blocks
    const { data: customerBlock } = await this.supabaseClient
      .from('disbursement_blocks')
      .select('block_reason, block_expires_at, block_type')
      .eq('partner_id', partnerId)
      .eq('customer_id', customerId)
      .or(`block_expires_at.is.null,block_expires_at.gt.${now.toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (customerBlock) {
      return {
        isDuplicate: true,
        blockReason: `Customer blocked: ${customerBlock.block_reason}`,
        blockType: customerBlock.block_type
      }
    }

    // Check IP blocks
    const { data: ipBlock } = await this.supabaseClient
      .from('disbursement_blocks')
      .select('block_reason, block_expires_at, block_type')
      .eq('partner_id', partnerId)
      .eq('client_ip', clientIp)
      .or(`block_expires_at.is.null,block_expires_at.gt.${now.toISOString()}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (ipBlock) {
      return {
        isDuplicate: true,
        blockReason: `IP blocked: ${ipBlock.block_reason}`,
        blockType: ipBlock.block_type
      }
    }

    return { isDuplicate: false }
  }

  /**
   * Check for insufficient funds and determine if should queue
   */
  async checkInsufficientFunds(
    partnerId: string,
    amount: number
  ): Promise<InsufficientFundsResult> {
    
    // Get current balance
    const { data: latestBalance } = await this.supabaseClient
      .from('balance_requests')
      .select('utility_account_balance, created_at')
      .eq('partner_id', partnerId)
      .eq('status', 'completed')
      .not('utility_account_balance', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!latestBalance) {
      return {
        hasInsufficientFunds: false,
        currentBalance: 0,
        requestedAmount: amount,
        shortfall: amount,
        shouldQueue: false
      }
    }

    const currentBalance = parseFloat(latestBalance.utility_account_balance)
    const shortfall = amount - currentBalance

    if (shortfall <= 0) {
      return {
        hasInsufficientFunds: false,
        currentBalance,
        requestedAmount: amount,
        shortfall: 0,
        shouldQueue: false
      }
    }

    // Check if insufficient funds queueing is enabled
    const { data: queueRestriction } = await this.supabaseClient
      .from('disbursement_restrictions')
      .select('is_enabled')
      .eq('partner_id', partnerId)
      .eq('restriction_type', 'insufficient_funds_queue')
      .eq('is_enabled', true)
      .single()

    const shouldQueue = !!queueRestriction

    return {
      hasInsufficientFunds: true,
      currentBalance,
      requestedAmount: amount,
      shortfall,
      shouldQueue,
      estimatedRefillTime: this.estimateRefillTime(partnerId, shortfall)
    }
  }

  /**
   * Queue disbursement for insufficient funds
   */
  async queueForInsufficientFunds(
    disbursementRequestId: string,
    partnerId: string,
    customerId: string,
    msisdn: string,
    amount: number,
    clientIp: string,
    priority: number = 1
  ): Promise<void> {
    
    const nextRetryAt = new Date(Date.now() + (5 * 60 * 1000)) // 5 minutes from now

    await this.supabaseClient
      .from('insufficient_funds_queue')
      .insert({
        disbursement_request_id: disbursementRequestId,
        partner_id: partnerId,
        customer_id: customerId,
        msisdn: msisdn,
        amount: amount,
        client_ip: clientIp,
        priority: priority,
        retry_count: 0,
        max_retries: 3,
        next_retry_at: nextRetryAt.toISOString(),
        status: 'queued'
      })
  }

  /**
   * Create a block for duplicate prevention
   */
  async createBlock(
    partnerId: string,
    blockType: string,
    blockReason: string,
    customerId?: string,
    clientIp?: string,
    amount?: number,
    originalRequestId?: string,
    expiresInMinutes?: number
  ): Promise<void> {
    
    const blockExpiresAt = expiresInMinutes 
      ? new Date(Date.now() + (expiresInMinutes * 60 * 1000))
      : null

    await this.supabaseClient
      .from('disbursement_blocks')
      .insert({
        partner_id: partnerId,
        block_type: blockType,
        block_reason: blockReason,
        customer_id: customerId,
        client_ip: clientIp,
        amount: amount,
        block_expires_at: blockExpiresAt?.toISOString(),
        original_request_id: originalRequestId
      })
  }

  /**
   * Log duplicate detection for monitoring and analysis
   */
  private async logDuplicateDetection(logData: {
    partnerId: string
    customerId?: string
    msisdn: string
    amount: number
    clientIp: string
    detectionType: string
    restrictionType: string
    timeWindowMinutes: number
    amountTolerancePercentage?: number
    actionTaken: string
    similarAmountsFound: any[]
    amountDifference: number
    percentageDifference: number
  }): Promise<void> {
    try {
      await this.supabaseClient
        .from('duplicate_prevention_logs')
        .insert({
          partner_id: logData.partnerId,
          customer_id: logData.customerId,
          msisdn: logData.msisdn,
          amount: logData.amount,
          client_ip: logData.clientIp,
          detection_type: logData.detectionType,
          restriction_type: logData.restrictionType,
          time_window_minutes: logData.timeWindowMinutes,
          amount_tolerance_percentage: logData.amountTolerancePercentage,
          action_taken: logData.actionTaken,
          similar_amounts_found: logData.similarAmountsFound,
          amount_difference: logData.amountDifference,
          percentage_difference: logData.percentageDifference
        })
    } catch (error) {
      console.error('Failed to log duplicate detection:', error)
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Estimate when funds might be available (simple heuristic)
   */
  private estimateRefillTime(partnerId: string, shortfall: number): Date {
    // Simple heuristic: assume funds might be available in 1-4 hours
    // In production, this could be based on historical patterns
    const hoursToAdd = Math.min(4, Math.max(1, Math.ceil(shortfall / 10000)))
    return new Date(Date.now() + (hoursToAdd * 60 * 60 * 1000))
  }

  /**
   * Process insufficient funds queue
   */
  async processInsufficientFundsQueue(partnerId: string): Promise<void> {
    const now = new Date()

    // Get queued items ready for retry
    const { data: queuedItems } = await this.supabaseClient
      .from('insufficient_funds_queue')
      .select(`
        *,
        disbursement_requests!inner(id, status)
      `)
      .eq('partner_id', partnerId)
      .eq('status', 'queued')
      .lte('next_retry_at', now.toISOString())
      .lt('retry_count', 'max_retries')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(10)

    for (const item of queuedItems || []) {
      try {
        // Check if funds are now available
        const fundsCheck = await this.checkInsufficientFunds(partnerId, item.amount)
        
        if (!fundsCheck.hasInsufficientFunds) {
          // Funds available, process the disbursement
          await this.supabaseClient
            .from('insufficient_funds_queue')
            .update({ 
              status: 'processing',
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)

          // Here you would trigger the actual disbursement
          // This would be handled by the main disbursement service
          
        } else {
          // Still insufficient funds, schedule next retry
          const nextRetryMinutes = Math.min(60, 5 * Math.pow(2, item.retry_count)) // Exponential backoff
          const nextRetryAt = new Date(Date.now() + (nextRetryMinutes * 60 * 1000))

          await this.supabaseClient
            .from('insufficient_funds_queue')
            .update({
              retry_count: item.retry_count + 1,
              next_retry_at: nextRetryAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
        }
      } catch (error) {
        // Mark as failed after max retries
        await this.supabaseClient
          .from('insufficient_funds_queue')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
      }
    }
  }
}
