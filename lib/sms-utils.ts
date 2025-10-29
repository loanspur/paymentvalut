/**
 * Calculate SMS count based on message length
 * SMS charging is based on 160 characters per SMS
 * Any additional characters are charged as additional SMS
 */
export function calculateSMSCount(message: string): number {
  const smsLength = message.length
  // Each SMS can contain up to 160 characters
  // Any additional characters are charged as additional SMS
  return Math.ceil(smsLength / 160)
}

/**
 * Calculate SMS cost based on message length and cost per SMS
 */
export function calculateSMSCost(message: string, costPerMessage: number): number {
  const smsCount = calculateSMSCount(message)
  return smsCount * costPerMessage
}

