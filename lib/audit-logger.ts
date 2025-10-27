import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface AuditLogData {
  actionType: string
  actionCategory: string
  actionDescription: string
  status: 'success' | 'failed' | 'pending' | 'info' | 'warning' | 'error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  userEmail?: string
  partnerId?: string
  partnerName?: string
  requestId?: string
  method?: string
  endpoint?: string
  originIp?: string
  userAgent?: string
  targetType?: string
  targetId?: string
  oldValue?: any
  newValue?: any
  errorCode?: string
  errorMessage?: string
  sourceComponent?: string
  metadata?: any
}

export interface UserActivityData {
  userId: string
  userEmail: string
  activityType: string
  activityCategory: string
  activityDescription: string
  partnerId?: string
  partnerName?: string
  targetType?: string
  targetId?: string
  oldValue?: any
  newValue?: any
  ipAddress?: string
  userAgent?: string
  sessionId?: string
}

export interface SystemEventData {
  eventType: string
  eventCategory: string
  eventDescription: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  sourceComponent?: string
  metadata?: any
  hostName?: string
  processId?: number
}

export interface ApiRequestData {
  requestId: string
  method: string
  endpoint: string
  path?: string
  queryParams?: any
  requestHeaders?: any
  requestBody?: any
  responseStatus?: number
  responseHeaders?: any
  responseBody?: any
  responseTimeMs?: number
  originIp?: string
  userAgent?: string
  userId?: string
  userEmail?: string
  partnerId?: string
  partnerName?: string
  requestSource?: string
}

class AuditLogger {
  /**
   * Log a general audit event
   */
  async logAuditEvent(data: AuditLogData): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_audit_event', {
        p_action_type: data.actionType,
        p_action_category: data.actionCategory,
        p_action_description: data.actionDescription,
        p_status: data.status,
        p_severity: data.severity,
        p_user_id: data.userId || null,
        p_user_email: data.userEmail || null,
        p_partner_id: data.partnerId || null,
        p_partner_name: data.partnerName || null,
        p_request_id: data.requestId || null,
        p_method: data.method || null,
        p_endpoint: data.endpoint || null,
        p_origin_ip: data.originIp || null,
        p_user_agent: data.userAgent || null,
        p_target_type: data.targetType || null,
        p_target_id: data.targetId || null,
        p_old_value: data.oldValue || null,
        p_new_value: data.newValue || null,
        p_error_code: data.errorCode || null,
        p_error_message: data.errorMessage || null,
        p_source_component: data.sourceComponent || null,
        p_metadata: data.metadata || null
      })

      if (error) {
        console.error('Error logging audit event:', error)
      }
    } catch (error) {
      console.error('Error in audit logger:', error)
    }
  }

  /**
   * Log user activity
   */
  async logUserActivity(data: UserActivityData): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_user_activity', {
        p_user_id: data.userId,
        p_user_email: data.userEmail,
        p_activity_type: data.activityType,
        p_activity_category: data.activityCategory,
        p_activity_description: data.activityDescription,
        p_partner_id: data.partnerId || null,
        p_partner_name: data.partnerName || null,
        p_target_type: data.targetType || null,
        p_target_id: data.targetId || null,
        p_old_value: data.oldValue || null,
        p_new_value: data.newValue || null,
        p_ip_address: data.ipAddress || null,
        p_user_agent: data.userAgent || null,
        p_session_id: data.sessionId || null
      })

      if (error) {
        console.error('Error logging user activity:', error)
      }
    } catch (error) {
      console.error('Error in user activity logger:', error)
    }
  }

  /**
   * Log system event
   */
  async logSystemEvent(data: SystemEventData): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_system_event', {
        p_event_type: data.eventType,
        p_event_category: data.eventCategory,
        p_event_description: data.eventDescription,
        p_severity: data.severity,
        p_source_component: data.sourceComponent || null,
        p_metadata: data.metadata || null,
        p_host_name: data.hostName || null,
        p_process_id: data.processId || null
      })

      if (error) {
        console.error('Error logging system event:', error)
      }
    } catch (error) {
      console.error('Error in system event logger:', error)
    }
  }

  /**
   * Log API request
   */
  async logApiRequest(data: ApiRequestData): Promise<void> {
    try {
      const { error } = await supabase.rpc('log_api_request', {
        p_request_id: data.requestId,
        p_method: data.method,
        p_endpoint: data.endpoint,
        p_path: data.path || null,
        p_query_params: data.queryParams || null,
        p_request_headers: data.requestHeaders || null,
        p_request_body: data.requestBody || null,
        p_response_status: data.responseStatus || null,
        p_response_headers: data.responseHeaders || null,
        p_response_body: data.responseBody || null,
        p_response_time_ms: data.responseTimeMs || null,
        p_origin_ip: data.originIp || null,
        p_user_agent: data.userAgent || null,
        p_user_id: data.userId || null,
        p_user_email: data.userEmail || null,
        p_partner_id: data.partnerId || null,
        p_partner_name: data.partnerName || null,
        p_request_source: data.requestSource || null
      })

      if (error) {
        console.error('Error logging API request:', error)
      }
    } catch (error) {
      console.error('Error in API request logger:', error)
    }
  }

  /**
   * Log error with context
   */
  async logError(error: Error, context?: any): Promise<void> {
    await this.logSystemEvent({
      eventType: 'error',
      eventCategory: 'system',
      eventDescription: `Error: ${error.message}`,
      severity: 'high',
      sourceComponent: context?.endpoint || 'unknown',
      metadata: {
        stack: error.stack,
        context
      }
    })
  }

  /**
   * Log successful login
   */
  async logLogin(userId: string, userEmail: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logUserActivity({
      userId,
      userEmail,
      activityType: 'login',
      activityCategory: 'authentication',
      activityDescription: 'User logged in successfully',
      ipAddress,
      userAgent
    })
  }

  /**
   * Log failed login attempt
   */
  async logFailedLogin(email: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logAuditEvent({
      actionType: 'login_failed',
      actionCategory: 'authentication',
      actionDescription: `Failed login attempt for ${email}: ${reason}`,
      status: 'failed',
      severity: 'medium',
      userEmail: email,
      originIp: ipAddress,
      userAgent,
      errorMessage: reason
    })
  }

  /**
   * Log disbursement request
   */
  async logDisbursement(
    userId: string,
    userEmail: string,
    partnerId: string,
    partnerName: string,
    amount: number,
    phoneNumber: string,
    status: 'success' | 'failed',
    errorMessage?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logAuditEvent({
      actionType: 'disbursement',
      actionCategory: 'financial',
      actionDescription: `Disbursement ${status}: ${amount} to ${phoneNumber}`,
      status,
      severity: status === 'success' ? 'low' : 'high',
      userId,
      userEmail,
      partnerId,
      partnerName,
      originIp: ipAddress,
      metadata: {
        amount,
        phoneNumber,
        status
      },
      errorMessage
    })
  }

  /**
   * Log profile update
   */
  async logProfileUpdate(
    userId: string,
    userEmail: string,
    oldValue: any,
    newValue: any,
    ipAddress?: string
  ): Promise<void> {
    await this.logUserActivity({
      userId,
      userEmail,
      activityType: 'profile_update',
      activityCategory: 'user_management',
      activityDescription: 'User profile updated',
      targetType: 'user',
      targetId: userId,
      oldValue,
      newValue,
      ipAddress
    })
  }
}

export const auditLogger = new AuditLogger()