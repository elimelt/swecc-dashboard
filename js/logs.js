class LogsService {
  constructor () {
    this.socket = null
    this.isConnected = false
    this.containerName = null
    this.token = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 2000
    this.autoScrollEnabled = true
    this.logBuffer = []
    this.bufferMaxSize = 1000
  }

  async initialize () {
    try {
      await this.fetchJwtToken()

      this.setupEventListeners()

      log('Logs service initialized')
      return true
    } catch (error) {
      log('Failed to initialize logs service:', error)
      this.showError('Failed to initialize logs streaming service.')
      return false
    }
  }

  async fetchJwtToken () {
    try {
      const response = await withCsrf(() => api.get('/auth/jwt/'))

      if (response.status === 200 && response.data.token) {
        this.token = response.data.token
        log('JWT token fetched successfully')
        return true
      } else {
        throw new Error('Invalid token response')
      }
    } catch (error) {
      log('Error fetching JWT token:', error)
      throw new Error('Failed to get authentication token for logs service')
    }
  }

  setupEventListeners () {
    const startLogsBtn = document.getElementById('start-logs-btn')
    const stopLogsBtn = document.getElementById('stop-logs-btn')
    const clearLogsBtn = document.getElementById('clear-logs-btn')
    const autoScrollToggle = document.getElementById('auto-scroll-toggle')

    if (startLogsBtn) {
      startLogsBtn.addEventListener('click', () => this.startLogging())
    }

    if (stopLogsBtn) {
      stopLogsBtn.addEventListener('click', () => this.stopLogging())
    }

    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => this.clearLogs())
    }

    if (autoScrollToggle) {
      autoScrollToggle.addEventListener('change', e => {
        this.autoScrollEnabled = e.target.checked
        log(`Auto-scroll ${this.autoScrollEnabled ? 'enabled' : 'disabled'}`)
      })
    }
  }

  updateLogsUIState (isStreaming) {
    const startLogsBtn = document.getElementById('start-logs-btn')
    const stopLogsBtn = document.getElementById('stop-logs-btn')
    const logsStatus = document.getElementById('logs-status')

    if (startLogsBtn && stopLogsBtn) {
      startLogsBtn.disabled = isStreaming
      stopLogsBtn.disabled = !isStreaming
    }

    if (logsStatus) {
      logsStatus.textContent = isStreaming
        ? `Streaming logs for ${this.containerName}...`
        : 'Logs streaming stopped'
      logsStatus.className = isStreaming ? 'status-running' : 'status-stopped'
    }
  }

  async startLogging () {
    const containerSelector = document.getElementById('container-selector')
    this.containerName = containerSelector.value

    if (!this.containerName) {
      this.showError('Please select a container first')
      return
    }

    if (!this.token) {
      try {
        await this.fetchJwtToken()
      } catch (error) {
        this.showError(
          'Failed to authenticate for log streaming. Please try again.'
        )
        return
      }
    }

    this.connectWebSocket()
  }

  stopLogging () {
    if (this.socket) {
      if (this.isConnected) {
        this.socket.send(
          JSON.stringify({
            type: 'stop_logs'
          })
        )
      }

      this.socket.close(1000, 'User stopped logging')
      this.socket = null
      this.isConnected = false

      this.updateLogsUIState(false)
      log('Logging stopped by user')

      this.addLogEntry({
        type: 'system',
        message: 'Log streaming stopped'
      })
    }
  }

  clearLogs () {
    const logsContainer = document.getElementById('logs-container')
    if (logsContainer) {
      logsContainer.innerHTML = ''
      this.logBuffer = []
      log('Logs cleared')
    }
  }

  connectWebSocket () {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsBaseUrl = IS_DEV
        ? `${protocol}//localhost:8004`
        : `${protocol}//api.swecc.org`

      const wsUrl = `${wsBaseUrl}/ws/logs/${this.token}`
      log(`Connecting to WebSocket: ${wsUrl}`)

      this.socket = new WebSocket(wsUrl)

      this.socket.onopen = this.handleSocketOpen.bind(this)
      this.socket.onmessage = this.handleSocketMessage.bind(this)
      this.socket.onclose = this.handleSocketClose.bind(this)
      this.socket.onerror = this.handleSocketError.bind(this)

      this.addLogEntry({
        type: 'system',
        message: `Connecting to logs for ${this.containerName}...`
      })
    } catch (error) {
      log('Error creating WebSocket:', error)
      this.showError(`Failed to connect to log service: ${error.message}`)
    }
  }

  handleSocketOpen (event) {
    log('WebSocket connected')
    this.isConnected = true
    this.reconnectAttempts = 0

    this.socket.send(
      JSON.stringify({
        type: 'start_logs',
        container_name: this.containerName
      })
    )

    this.updateLogsUIState(true)
  }

  handleSocketMessage (event) {
    try {
      const data = JSON.parse(event.data)
      this.addLogEntry(data)
    } catch (error) {
      log('Error parsing log message:', error)
      this.addLogEntry({
        type: 'error',
        message: `Failed to parse log message: ${error.message}`
      })
    }
  }

  handleSocketClose (event) {
    this.isConnected = false
    log(
      `WebSocket closed: ${event.code} - ${
        event.reason || 'No reason provided'
      }`
    )

    if (event.code !== 1000) {
      this.attemptReconnect()
    } else {
      this.updateLogsUIState(false)
    }
  }

  handleSocketError (event) {
    log('WebSocket error:', event)
    this.addLogEntry({
      type: 'error',
      message: 'WebSocket connection error'
    })
  }

  attemptReconnect () {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.addLogEntry({
        type: 'error',
        message: `Failed to reconnect after ${this.maxReconnectAttempts} attempts`
      })
      this.updateLogsUIState(false)
      return
    }

    this.reconnectAttempts++
    const delay =
      this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)

    this.addLogEntry({
      type: 'system',
      message: `Connection lost. Reconnecting in ${Math.round(
        delay / 1000
      )} seconds... (Attempt ${this.reconnectAttempts}/${
        this.maxReconnectAttempts
      })`
    })

    setTimeout(() => {
      if (!this.isConnected) {
        this.connectWebSocket()
      }
    }, delay)
  }

  addLogEntry (data) {
    const logsContainer = document.getElementById('logs-container')
    if (!logsContainer) return

    this.logBuffer.push(data)
    if (this.logBuffer.length > this.bufferMaxSize) {
      this.logBuffer.shift()

      if (logsContainer.children.length > this.bufferMaxSize) {
        logsContainer.removeChild(logsContainer.children[0])
      }
    }

    const logLine = document.createElement('div')
    logLine.className = `log-line log-${data.type}`

    const timestamp = new Date().toLocaleTimeString()

    switch (data.type) {
      case 'system':
        logLine.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-system">SYSTEM:</span> ${this.escapeHtml(
          data.message
        )}`
        break
      case 'error':
        logLine.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-error">ERROR:</span> ${this.escapeHtml(
          data.message
        )}`
        break
      case 'logs_started':
        logLine.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-success">STARTED:</span> ${this.escapeHtml(
          data.message
        )}`
        break
      case 'logs_stopped':
        logLine.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-info">STOPPED:</span> ${this.escapeHtml(
          data.message
        )}`
        break
      case 'log_line':
        const message = this.escapeHtml(data.message)
        const formattedMessage = this.highlightLogContent(message)
        logLine.innerHTML = `<span class="log-time">[${timestamp}]</span> ${formattedMessage}`
        break
      case 'log_error':
        const errorMessage = this.escapeHtml(data.message)
        const formattedErrorMessage = this.highlightLogContent(errorMessage)
        logLine.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-stderr">STDERR:</span> ${formattedErrorMessage}`
        break
      default:
        logLine.textContent = `[${timestamp}] ${
          data.message || JSON.stringify(data)
        }`
    }

    logsContainer.appendChild(logLine)

    if (this.autoScrollEnabled) {
      logsContainer.scrollTop = logsContainer.scrollHeight
    }
  }

  escapeHtml (text) {
    if (!text) return ''

    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  highlightLogContent (message) {
    return message
      .replace(
        /\b(error|failed|exception|warning|warn|critical)\b/gi,
        '<span class="log-highlight-error">$1</span>'
      )
      .replace(
        /\b(success|completed|started|listening on|ready)\b/gi,
        '<span class="log-highlight-success">$1</span>'
      )
      .replace(
        /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?\b/g,
        '<span class="log-highlight-ip">$1$2</span>'
      )
      .replace(
        /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}([.,]\d{3})?(Z|[+-]\d{2}:?\d{2})?\b/g,
        '<span class="log-highlight-time">$&</span>'
      )
  }

  showError (message) {
    const errorElement = document.createElement('div')
    errorElement.className = 'error-message logs-error'
    errorElement.textContent = message

    const existingErrors = document.querySelectorAll('.logs-error')
    existingErrors.forEach(el => el.remove())

    const logsPanel = document.getElementById('logs-panel')
    if (logsPanel) {
      logsPanel.insertBefore(
        errorElement,
        logsPanel.querySelector('.logs-controls')
      )

      setTimeout(() => {
        if (errorElement.parentNode) {
          errorElement.parentNode.removeChild(errorElement)
        }
      }, 5000)
    }
  }
}

const logsService = new LogsService()
