async function getCsrfToken () {
  try {
    const existingToken = getActiveToken()
    if (existingToken) {
      log('Using existing CSRF token:', existingToken)
      return existingToken
    }

    log('Fetching new CSRF token')
    const response = await fetch(`${API_BASE_URL}/auth/csrf/`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to get CSRF token: ${response.status}`)
    }

    const csrfToken =
      response.headers.get('x-csrftoken') || getCookie('csrftoken')
    if (csrfToken) {
      localStorage.setItem('csrfToken', csrfToken)
      log('Set new CSRF token:', csrfToken)
    }

    return csrfToken
  } catch (error) {
    log('Failed to fetch CSRF token:', error)
    return ''
  }
}

function getActiveToken () {
  return localStorage.getItem('csrfToken') || getCookie('csrftoken') || ''
}

const api = {
  async get (endpoint) {
    try {
      const url = endpoint.startsWith('http')
        ? endpoint
        : `${API_BASE_URL}${endpoint}`
      log(`API GET: ${url}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': getActiveToken(),
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include'
      })

      let responseData
      try {
        responseData = await response.json()
      } catch (e) {
        responseData = {}
        log('Response not JSON:', e)
      }

      if (!response.ok) {
        log(`API error (${response.status}):`, responseData)
        throw {
          response: {
            status: response.status,
            data: responseData
          }
        }
      }

      return {
        status: response.status,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries())
      }
    } catch (error) {
      log('API request failed:', error)
      throw error
    }
  },

  async post (endpoint, data) {
    try {
      const url = `${API_BASE_URL}${endpoint}`
      log(`API POST: ${url}`, data)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': getActiveToken(),
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      let responseData
      try {
        responseData = await response.json()
      } catch (e) {
        responseData = {}
        log('Response not JSON:', e)
      }

      if (!response.ok) {
        log(`API error (${response.status}):`, responseData)
        throw {
          response: {
            status: response.status,
            data: responseData
          }
        }
      }

      return {
        status: response.status,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries())
      }
    } catch (error) {
      log('API request failed:', error)
      throw error
    }
  },

  async put (endpoint, data) {
    try {
      const url = `${API_BASE_URL}${endpoint}`
      log(`API PUT: ${url}`, data)

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': getActiveToken(),
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      let responseData
      try {
        responseData = await response.json()
      } catch (e) {
        responseData = {}
        log('Response not JSON:', e)
      }

      if (!response.ok) {
        log(`API error (${response.status}):`, responseData)
        throw {
          response: {
            status: response.status,
            data: responseData
          }
        }
      }

      return {
        status: response.status,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries())
      }
    } catch (error) {
      log('API request failed:', error)
      throw error
    }
  }
}

async function withCsrf (callback) {
  if (!getActiveToken()) {
    await getCsrfToken()
  }
  return callback()
}
