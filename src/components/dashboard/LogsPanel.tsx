import React, { useEffect, useState, useRef } from 'react'
import logsService, { LogEntry } from '../../services/LogsService'
import { log } from '../../utils/utils'

interface LogsPanelProps {
  containerName: string
}

const LogsPanel: React.FC<LogsPanelProps> = ({ containerName }) => {
  const [isStreaming, setIsStreaming] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)

  const logsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Setup logs service event handlers
    const handleLogEntry = (entry: LogEntry) => {
      log('Log entry received:', entry.type, entry.message?.substring(0, 50))
      setLogs(prev => {
        const newLogs = [...prev, entry]
        // Limit the number of logs stored in state
        if (newLogs.length > 1000) {
          return newLogs.slice(-1000)
        }
        return newLogs
      })

      if (autoScroll && logsContainerRef.current) {
        setTimeout(() => {
          if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
          }
        }, 0)
      }
    }

    const handleConnectionStatusChange = (connected: boolean) => {
      log('Connection status changed:', connected)
      setIsStreaming(connected)
    }

    // Register event handlers
    logsService.onLogEntry = handleLogEntry
    logsService.onConnectionStatusChange = handleConnectionStatusChange

    // Set initial state
    setAutoScroll(logsService.isAutoScrollEnabled())
    setIsStreaming(logsService.getConnectionStatus())

    // Initialize logs buffer if available
    const initialLogs = logsService.getLogBuffer()
    if (initialLogs.length > 0) {
      setLogs(initialLogs)
    }

    // Cleanup logs service on component unmount
    return () => {
      // Remove event handlers
      logsService.onLogEntry = undefined
      logsService.onConnectionStatusChange = undefined

      if (logsService.getConnectionStatus()) {
        logsService.stopLogging()
      }
    }
  }, [containerName, autoScroll])

  const handleStartLogging = async () => {
    try {
      setError(null)
      log('Starting logs for container:', containerName)
      await logsService.startLogging(containerName)
    } catch (err: any) {
      log('Error starting logs:', err)
      setError(err.message || 'Failed to start log streaming')
    }
  }

  const handleStopLogging = () => {
    try {
      logsService.stopLogging()
    } catch (err: any) {
      log('Error stopping logs:', err)
      setError(err.message || 'Failed to stop log streaming')
    }
  }

  const handleClearLogs = () => {
    setLogs([])
    logsService.clearLogs()
  }

  const handleAutoScrollToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked
    setAutoScroll(enabled)
    logsService.setAutoScroll(enabled)
  }

  const formatLogEntry = (entry: LogEntry, index: number) => {
    // Use entry timestamp if available, otherwise use current time
    const timestamp = entry.timestamp
      ? new Date(entry.timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString()

    switch (entry.type) {
      case 'system':
        return (
          <div key={index} className='log-line log-system'>
            <span className='log-time'>[{timestamp}]</span>{' '}
            <span className='log-system'>SYSTEM:</span> {entry.message}
          </div>
        )
      case 'error':
        return (
          <div key={index} className='log-line log-error'>
            <span className='log-time'>[{timestamp}]</span>{' '}
            <span className='log-error'>ERROR:</span> {entry.message}
          </div>
        )
      case 'logs_started':
        return (
          <div key={index} className='log-line log-success'>
            <span className='log-time'>[{timestamp}]</span>{' '}
            <span className='log-success'>STARTED:</span> {entry.message}
          </div>
        )
      case 'logs_stopped':
        return (
          <div key={index} className='log-line log-info'>
            <span className='log-time'>[{timestamp}]</span>{' '}
            <span className='log-info'>STOPPED:</span> {entry.message}
          </div>
        )
      case 'log_line': {
        // Extract timestamp from log message if available
        let logTimestamp = timestamp;
        const timestampMatch = entry.message?.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        if (timestampMatch) {
          try {
            logTimestamp = new Date(timestampMatch[0]).toLocaleTimeString();
          } catch (e) {
            // Use default timestamp if parsing fails
          }
        }

        const message = logsService.escapeHtml(entry.message || '')
        const formattedMessage = logsService.highlightLogContent(message)
        return (
          <div key={index} className='log-line'>
            <span className='log-time'>[{logTimestamp}]</span>
            <span dangerouslySetInnerHTML={{ __html: formattedMessage }} />
          </div>
        )
      }
      case 'log_error': {
        const errorMessage = logsService.escapeHtml(entry.message || '')
        const formattedErrorMessage =
          logsService.highlightLogContent(errorMessage)
        return (
          <div key={index} className='log-line log-stderr'>
            <span className='log-time'>[{timestamp}]</span>{' '}
            <span className='log-stderr'>STDERR:</span>
            <span dangerouslySetInnerHTML={{ __html: formattedErrorMessage }} />
          </div>
        )
      }
      default:
        return (
          <div key={index} className='log-line'>
            <span className='log-time'>[{timestamp}]</span>{' '}
            {entry.message || JSON.stringify(entry)}
          </div>
        )
    }
  }

  return (
    <div id='logs-panel' className='metric-panel'>
      <div className='logs-header'>
        <h3>Container Logs</h3>
        <div
          id='logs-status'
          className={`log-status ${
            isStreaming ? 'status-running' : 'status-stopped'
          }`}
        >
          {isStreaming
            ? `Streaming logs for ${containerName}...`
            : 'Logs streaming stopped'}
        </div>
      </div>

      {error && <div className='error-message logs-error'>{error}</div>}

      <div className='logs-controls'>
        <button
          id='start-logs-btn'
          onClick={handleStartLogging}
          disabled={isStreaming}
        >
          Start Streaming
        </button>
        <button
          id='stop-logs-btn'
          onClick={handleStopLogging}
          disabled={!isStreaming}
        >
          Stop Streaming
        </button>
        <button id='clear-logs-btn' onClick={handleClearLogs}>
          Clear Logs
        </button>

        <div className='auto-scroll-container'>
          <span>Auto-scroll:</span>
          <label className='toggle-switch'>
            <input
              type='checkbox'
              id='auto-scroll-toggle'
              checked={autoScroll}
              onChange={handleAutoScrollToggle}
            />
            <span className='toggle-slider'></span>
          </label>
        </div>
      </div>

      <div id='logs-container' className='logs-viewer' ref={logsContainerRef}>
        {logs.length === 0 ? (
          <div className="log-line log-system">
            No logs available. Click "Start Streaming" to begin.
          </div>
        ) : (
          logs.map((log, index) => formatLogEntry(log, index))
        )}
      </div>
    </div>
  )
}

export default LogsPanel