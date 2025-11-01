import crypto from 'crypto'

/**
 * Get SMS balance from AirTouch API
 * @param username - AirTouch username
 * @param apiKey - AirTouch API key (will be hashed with MD5 for password)
 * @returns SMS balance in KES
 */
export async function getAirTouchSMSBalance(username: string, apiKey: string): Promise<{ success: boolean; balance: number; error?: string }> {
  try {
    // Calculate MD5 hash of API key for password (as per AirTouch API requirement)
    const hashedPassword = crypto.createHash('md5').update(apiKey).digest('hex')

    // Call AirTouch balance API
    const balanceUrl = `https://client.airtouch.co.ke:9012/users/balance-api/?username=${encodeURIComponent(username)}&password=${encodeURIComponent(hashedPassword)}`

    const response = await fetch(balanceUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AirTouch balance API error:', response.status, response.statusText)
      return {
        success: false,
        balance: 0,
        error: `Failed to fetch SMS balance: ${response.status} ${response.statusText}`
      }
    }

    const responseText = await response.text()
    let data: any

    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse SMS balance response:', parseError)
      return {
        success: false,
        balance: 0,
        error: 'Invalid JSON response from AirTouch API'
      }
    }

    // Extract balance from response
    let balance = 0
    if (data.Balance !== undefined) {
      balance = Number(data.Balance)
    } else if (data.balance !== undefined) {
      balance = Number(data.balance)
    } else if (data.BALANCE !== undefined) {
      balance = Number(data.BALANCE)
    } else {
      // Try to find any numeric field
      for (const key of Object.keys(data)) {
        const value = data[key]
        if (typeof value === 'number') {
          balance = value
          break
        }
      }
    }

    return {
      success: true,
      balance: Number(balance)
    }
  } catch (error: any) {
    console.error('Error fetching SMS balance:', error.message || error)
    return {
      success: false,
      balance: 0,
      error: error.message || 'Failed to fetch SMS balance'
    }
  }
}

