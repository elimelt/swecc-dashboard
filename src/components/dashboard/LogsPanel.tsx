import React, { useEffect, useState, useRef, useCallback } from 'react';
import logsService, { LogEntry } from '../../services/LogsService';
import { log } from '../../utils/utils';

interface LogsPanelProps {
  containerName: string;
}

const LogsPanel: React.FC<LogsPanelProps> = ({ containerName }) => {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showTimestamps, setShowTimestamps] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>('');
  const [logLevel, setLogLevel] = useState<string>('all');
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const logsContainerRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useCallback(() => {
    if (!filterText && logLevel === 'all') return logs;

    return logs.filter(entry => {
      // Filter by log level
      if (logLevel !== 'all') {
        if (logLevel === 'error' && !['error', 'log_error'].includes(entry.type)) {
          return false;
        }
        if (logLevel === 'system' && entry.type !== 'system') {
          return false;
        }
        if (logLevel === 'success' && entry.type !== 'logs_started') {
          return false;
        }
      }

      // Filter by text
      if (filterText && (!entry.message || !entry.message.toLowerCase().includes(filterText.toLowerCase()))) {
        return false;
      }

      return true;
    });
  }, [logs, filterText, logLevel]);

  const handleLogEntry = useCallback((entry: LogEntry) => {
    log('Log entry received:', entry.type, entry.message?.substring(0, 50));
    setLogs(prev => {
      const newLogs = [...prev, entry];
      if (newLogs.length > 1000) {
        return newLogs.slice(-1000);
      }
      return newLogs;
    });

    if (autoScroll && logsContainerRef.current) {
      setTimeout(() => {
        if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
        }
      }, 0);
    }
  }, [autoScroll]);

  const handleConnectionStatusChange = useCallback((connected: boolean) => {
    log('Connection status changed:', connected);
    setIsStreaming(connected);
  }, []);

  // Initialize logs
  useEffect(() => {
    logsService.onLogEntry = handleLogEntry;
    logsService.onConnectionStatusChange = handleConnectionStatusChange;

    setAutoScroll(logsService.isAutoScrollEnabled());
    setIsStreaming(logsService.getConnectionStatus());

    const initialLogs = logsService.getLogBuffer();
    if (initialLogs.length > 0) {
      setLogs(initialLogs);
    }

    return () => {
      logsService.onLogEntry = undefined;
      logsService.onConnectionStatusChange = undefined;

      if (logsService.getConnectionStatus()) {
        logsService.stopLogging();
      }
    };
  }, [containerName, handleLogEntry, handleConnectionStatusChange]);

  const handleStartLogging = async () => {
    try {
      setError(null);
      log('Starting logs for container:', containerName);
      await logsService.startLogging(containerName);
    } catch (err) {
      log('Error starting logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to start log streaming');
    }
  };

  const handleStopLogging = () => {
    try {
      logsService.stopLogging();
    } catch (err) {
      log('Error stopping logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to stop log streaming');
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    logsService.clearLogs();
    setExpandedLogs(new Set());
  };

  const handleAutoScrollToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setAutoScroll(enabled);
    logsService.setAutoScroll(enabled);
  };

  const handleTimestampsToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowTimestamps(e.target.checked);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
  };

  const handleLogLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLogLevel(e.target.value);
  };

  const toggleExpandLog = (index: number) => {
    const newExpandedLogs = new Set(expandedLogs);
    if (expandedLogs.has(index)) {
      newExpandedLogs.delete(index);
    } else {
      newExpandedLogs.add(index);
    }
    setExpandedLogs(newExpandedLogs);
  };

  const isLogExpandable = (message: string | undefined): boolean => {
    if (!message) return false;
    return message.length > 150 || message.includes('\n');
  };

  // Highlight search terms in log message
  const highlightSearchTerms = (message: string): string => {
    if (!filterText || !message) return message;

    const escapedFilter = filterText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedFilter})`, 'gi');
    return message.replace(regex, '<span class="log-search-highlight">$1</span>');
  };

  const formatLogEntry = (entry: LogEntry, index: number) => {
    const timestamp = entry.timestamp
      ? new Date(entry.timestamp).toLocaleTimeString()
      : new Date().toLocaleTimeString();

    const isExpanded = expandedLogs.has(index);
    const canExpand = isLogExpandable(entry.message);

    const message = entry.message || '';
    const escapedMessage = logsService.escapeHtml(message);
    const highlightedMessage = logsService.highlightLogContent(escapedMessage);
    const searchHighlightedMessage = filterText ? highlightSearchTerms(highlightedMessage) : highlightedMessage;

    const logClasses = [
      'log-line',
      entry.type,
      canExpand ? (isExpanded ? 'log-line-expanded' : 'log-line-collapsed') : '',
      index === logs.length - 1 ? 'log-line-new' : ''
    ].filter(Boolean).join(' ');

    const handleClick = canExpand ? () => toggleExpandLog(index) : undefined;

    switch (entry.type) {
      case 'system':
        return (
          <div key={index} className={`log-line log-system ${canExpand ? 'log-line-expandable' : ''}`} onClick={handleClick}>
            <span className="log-time">[{timestamp}]</span>
            <span className="log-system">SYSTEM:</span> {message}
          </div>
        );
      case 'error':
        return (
          <div key={index} className={`log-line log-error ${canExpand ? 'log-line-expandable' : ''}`} onClick={handleClick}>
            <span className="log-time">[{timestamp}]</span>
            <span className="log-error">ERROR:</span> {message}
          </div>
        );
      case 'logs_started':
        return (
          <div key={index} className="log-line log-success">
            <span className="log-time">[{timestamp}]</span>
            <span className="log-success">STARTED:</span> {message}
          </div>
        );
      case 'logs_stopped':
        return (
          <div key={index} className="log-line log-info">
            <span className="log-time">[{timestamp}]</span>
            <span className="log-info">STOPPED:</span> {message}
          </div>
        );
      case 'log_line': {
        let logTimestamp = timestamp;
        const timestampMatch = entry.message?.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        if (timestampMatch) {
          try {
            logTimestamp = new Date(timestampMatch[0]).toLocaleTimeString();
          } catch {
            // Use default timestamp if parsing fails
          }
        }

        return (
          <div
            key={index}
            className={`log-line ${canExpand ? 'log-line-expandable' : ''} ${isExpanded ? 'log-line-expanded' : 'log-line-collapsed'}`}
            onClick={handleClick}
          >
            <span className="log-time">[{logTimestamp}]</span>
            <span dangerouslySetInnerHTML={{ __html: searchHighlightedMessage }} />
          </div>
        );
      }
      case 'log_error': {
        return (
          <div
            key={index}
            className={`log-line log-stderr ${canExpand ? 'log-line-expandable' : ''} ${isExpanded ? 'log-line-expanded' : 'log-line-collapsed'}`}
            onClick={handleClick}
          >
            <span className="log-time">[{timestamp}]</span>
            <span className="log-stderr">STDERR:</span>
            <span dangerouslySetInnerHTML={{ __html: searchHighlightedMessage }} />
          </div>
        );
      }
      default:
        return (
          <div key={index} className={logClasses} onClick={handleClick}>
            <span className="log-time">[{timestamp}]</span>
            {message || JSON.stringify(entry)}
          </div>
        );
    }
  };

  return (
    <div id="logs-panel" className={`logs-panel ${isStreaming ? 'logs-streaming' : ''}`}>
      <div className="logs-header">
        <h3>Container Logs</h3>
        <div
          id="logs-status"
          className={`log-status ${
            isStreaming ? 'status-running' : 'status-stopped'
          }`}
        >
          {isStreaming
            ? `Streaming logs for ${containerName}...`
            : 'Logs streaming stopped'}
        </div>
      </div>

      {error && <div className="error-message logs-error">{error}</div>}

      <div className="logs-controls">
        <button
          id="start-logs-btn"
          onClick={handleStartLogging}
          disabled={isStreaming}
          className={isStreaming ? '' : 'button-primary'}
        >
          {isStreaming ? 'Streaming...' : 'Start Streaming'}
        </button>
        <button
          id="stop-logs-btn"
          onClick={handleStopLogging}
          disabled={!isStreaming}
          className="button-danger"
        >
          Stop Streaming
        </button>
        <button
          id="clear-logs-btn"
          onClick={handleClearLogs}
        >
          Clear Logs
        </button>

        <div className="logs-filter">
          <input
            type="text"
            placeholder="Filter logs..."
            value={filterText}
            onChange={handleFilterChange}
            className="logs-filter-input"
          />
        </div>

        <div className="logs-level-filter">
          <select
            value={logLevel}
            onChange={handleLogLevelChange}
            aria-label="Filter log level"
          >
            <option value="all">All Logs</option>
            <option value="error">Errors Only</option>
            <option value="system">System Only</option>
            <option value="success">Success Only</option>
          </select>
        </div>

        <div className="logs-timestamps-toggle">
          <label className="toggle-switch">
            <input
              type="checkbox"
              aria-label='Toggle timestamps'
              id="timestamps-toggle"
              checked={showTimestamps}
              onChange={handleTimestampsToggle}
            />
            <span className="toggle-slider"></span>
          </label>
          <span>Timestamps</span>
        </div>

        <div className="auto-scroll-container">
          <span>Auto-scroll:</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              aria-label='Toggle auto-scroll'
              id="auto-scroll-toggle"
              checked={autoScroll}
              onChange={handleAutoScrollToggle}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div
        id="logs-container"
        className={`logs-viewer ${!showTimestamps ? 'hide-timestamps' : ''}`}
        ref={logsContainerRef}
      >
        <div className="logs-content">
          {filteredLogs().length === 0 ? (
            <div className="logs-empty">
              <div className="logs-empty-icon">📋</div>
              <p>No logs available</p>
              <p className="text-muted">Click "Start Streaming" to begin capturing logs for this container</p>
            </div>
          ) : (
            filteredLogs().map((log, index) => formatLogEntry(log, index))
          )}
        </div>
      </div>

      <div className="logs-actions">
        <button
          className="logs-action-button"
          onClick={() => {
            if (logsContainerRef.current) {
              logsContainerRef.current.scrollTop = 0;
            }
          }}
        >
          ⇧
          <div className="logs-action-tooltip">Scroll to top</div>
        </button>
        <button
          className="logs-action-button"
          onClick={() => {
            if (logsContainerRef.current) {
              logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
            }
          }}
        >
          ⇩
          <div className="logs-action-tooltip">Scroll to bottom</div>
        </button>
      </div>
    </div>
  );
};

export default LogsPanel;