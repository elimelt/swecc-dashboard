import api from './api'
import { log } from '../utils/utils'
import { IS_DEV } from '../constants'

export type LogType =
  | 'system'
  | 'error'
  | 'logs_started'
  | 'logs_stopped'
  | 'log_line'
  | 'log_error'

export interface LogEntry {
  type: LogType
  message: string
  timestamp?: string
}

export interface LogsServiceOptions {
  onLogEntry?: (entry: LogEntry) => void
  onConnectionStatusChange?: (isConnected: boolean) => void
}

class LogsService {
  private socket: WebSocket | null = null
  private isConnected = false
  private containerName: string | null = null
  private token: string | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private autoScrollEnabled = true
  private logBuffer: LogEntry[] = []
  private bufferMaxSize = 1000
  private reconnectTimerId: number | null = null
  private intentionalClosure = false

  public onLogEntry?: (entry: LogEntry) => void
  public onConnectionStatusChange?: (isConnected: boolean) => void

  constructor (options: LogsServiceOptions = {}) {
    this.onLogEntry = options.onLogEntry
    this.onConnectionStatusChange = options.onConnectionStatusChange
  }

  async initialize (): Promise<boolean> {
    try {
      const success = await this.fetchJwtToken()
      log('Logs service initialized')
      return success
    } catch (error) {
      log('Failed to initialize logs service:', error)
      return false
    }
  }

  async fetchJwtToken (): Promise<boolean> {
    try {
      interface TokenResponse {
        token?: string
      }

      const response = await api.get<TokenResponse>('/auth/jwt/')

      if (response.status === 200 && response.data.token) {
        this.token = response.data.token
        log('JWT token fetched successfully')
        return true
      } else {
        log('Invalid token response:', response)
        throw new Error('Invalid token response')
      }
    } catch (error) {
      log('Error fetching JWT token:', error)
      throw new Error('Failed to get authentication token for logs service')
    }
  }

  setAutoScroll (enabled: boolean): void {
    this.autoScrollEnabled = enabled
    log(`Auto-scroll ${this.autoScrollEnabled ? 'enabled' : 'disabled'}`)
  }

  isAutoScrollEnabled (): boolean {
    return this.autoScrollEnabled
  }

  async startLogging (containerName: string): Promise<void> {
    this.intentionalClosure = false
    this.containerName = containerName

    if (!this.containerName) {
      throw new Error('Please select a container first')
    }

    if (this.reconnectTimerId !== null) {
      clearTimeout(this.reconnectTimerId)
      this.reconnectTimerId = null
    }

    this.reconnectAttempts = 0

    if (!this.token) {
      try {
        await this.fetchJwtToken()
      } catch {
        throw new Error(
          'Failed to authenticate for log streaming. Please try again.'
        )
      }
    }

    this.connectWebSocket()
  }

  stopLogging (): void {
    this.intentionalClosure = true

    if (this.reconnectTimerId !== null) {
      clearTimeout(this.reconnectTimerId)
      this.reconnectTimerId = null
    }

    if (this.socket) {
      if (this.isConnected) {
        try {
          this.socket.send(
            JSON.stringify({
              type: 'stop_logs'
            })
          )
          log('Sent stop_logs message')
        } catch (e) {
          log('Error sending stop_logs message:', e)
        }
      }

      try {
        this.socket.close(1000, 'User stopped logging')
        log('Socket closure initiated')
      } catch (e) {
        log('Error closing socket:', e)
      }

      this.socket = null
      this.setConnectionStatus(false)
      log('Logging stopped by user')

      this.addLogEntry({
        type: 'system',
        message: 'Log streaming stopped'
      })
    }
  }

  clearLogs (): void {
    this.logBuffer = []
    log('Logs cleared')
  }

  connectWebSocket (): void {
    if (this.socket) {
      try {
        this.socket.close()
      } catch (e) {
        log('Error closing existing socket:', e)
      }
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
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      log('Error creating WebSocket:', error)
      this.addLogEntry({
        type: 'error',
        message: `Failed to connect to log service: ${errorMessage}`
      })
    }
  }

  private handleSocketOpen (): void {
    log('WebSocket connected')
    this.setConnectionStatus(true)
    this.reconnectAttempts = 0

    if (this.socket && this.containerName) {
      try {
        this.socket.send(
          JSON.stringify({
            type: 'start_logs',
            container_name: this.containerName
          })
        )
        log(`Sent start_logs request for ${this.containerName}`)
      } catch (error) {
        log('Error sending start_logs message:', error)
        this.addLogEntry({
          type: 'error',
          message: `Failed to start logs: ${String(error)}`
        })
      }
    }
  }

  private handleSocketMessage (event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as LogEntry
      log('Received message type:', data.type)

      this.addLogEntry(data)
    } catch (error) {
      log('Error parsing log message:', error, event.data)
      this.addLogEntry({
        type: 'error',
        message: `Failed to parse log message: ${String(error)}`
      })
    }
  }

  private handleSocketClose (event: CloseEvent): void {
    this.setConnectionStatus(false)
    log(
      `WebSocket closed: ${event.code} - ${
        event.reason || 'No reason provided'
      }`
    )

    if (!this.intentionalClosure && event.code !== 1000) {
      this.attemptReconnect()
    } else {
      log('Not reconnecting due to intentional closure or normal close code')
    }
  }

  private handleSocketError (event: Event): void {
    log('WebSocket error:', event)
    this.addLogEntry({
      type: 'error',
      message: 'WebSocket connection error'
    })
  }

  private attemptReconnect (): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.addLogEntry({
        type: 'error',
        message: `Failed to reconnect after ${this.maxReconnectAttempts} attempts`
      })
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

    if (this.reconnectTimerId !== null) {
      clearTimeout(this.reconnectTimerId)
    }

    this.reconnectTimerId = window.setTimeout(() => {
      this.reconnectTimerId = null
      if (!this.isConnected && this.containerName && !this.intentionalClosure) {
        this.connectWebSocket()
      }
    }, delay)
  }

  private setConnectionStatus (connected: boolean): void {
    if (this.isConnected !== connected) {
      this.isConnected = connected
      if (this.onConnectionStatusChange) {
        this.onConnectionStatusChange(connected)
      }
    }
  }

  private addLogEntry (data: LogEntry): void {
    if (!data.timestamp && data.type === 'log_line') {
      const timestampMatch = data.message?.match(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
      )
      if (timestampMatch) {
        data.timestamp = timestampMatch[0]
      }
    }

    this.logBuffer.push(data)
    if (this.logBuffer.length > this.bufferMaxSize) {
      this.logBuffer.shift()
    }

    if (this.onLogEntry) {
      this.onLogEntry(data)
    }
  }

  escapeHtml (text: string): string {
    if (!text) return ''

    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  highlightLogContent (message: string): string {
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
        '<span class="log-highlight-timestamp">$&</span>'
      )
  }

  getLogBuffer (): LogEntry[] {
    return [...this.logBuffer]
  }

  getConnectionStatus (): boolean {
    return this.isConnected
  }

  getCurrentContainer (): string | null {
    return this.containerName
  }
}

export const logsService = new LogsService()
export default logsService
