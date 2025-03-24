import React, { useEffect, useState } from 'react';
import metricsService, { UsageData } from '../../services/MetricsService';

interface ResourceMetricsProps {
  containerName: string;
}

const ResourceMetrics: React.FC<ResourceMetricsProps> = ({ containerName }) => {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [hasData, setHasData] = useState<boolean>(false);

  useEffect(() => {
    const latestUsage = metricsService.getLatestUsage(containerName);
    setUsageData(latestUsage);
    setHasData(!!latestUsage);
  }, [containerName]);

  if (!hasData) {
    return null;
  }

  const getMemoryBarColor = (memoryPercent: number) => {
    if (memoryPercent > 80) {
      return 'var(--color-danger)';
    } else if (memoryPercent > 60) {
      return 'var(--color-warning)';
    } else {
      return 'var(--color-success)';
    }
  };

  return (
    <div id="resource-metrics" className="metric-panel">
      <h3>Resource Usage</h3>
      <div className="dashboard-grid">
        <div id="memory-panel" className="nested-panel">
          <h4>Memory</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-title">Usage</div>
              <div id="metric-memory-usage" className="metric-value">
                {usageData ? metricsService.formatBytes(usageData.memory_usage_bytes) : '-'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Limit</div>
              <div id="metric-memory-limit" className="metric-value">
                {usageData ? metricsService.formatBytes(usageData.memory_limit_bytes) : '-'}
              </div>
            </div>
            <div className="metric-card wide-card">
              <div className="metric-title">Percentage</div>
              <div className="progress-container">
                <div 
                  id="memory-usage-bar" 
                  className="progress-bar" 
                  style={{
                    width: `${usageData?.memory_percent || 0}%`,
                    backgroundColor: getMemoryBarColor(usageData?.memory_percent || 0)
                  }}
                ></div>
                <span id="metric-memory-percent" className="progress-text">
                  {usageData ? `${usageData.memory_percent}%` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div id="cpu-panel" className="nested-panel">
          <h4>CPU</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-title">Online CPUs</div>
              <div id="metric-cpu-online" className="metric-value">
                {usageData?.online_cpus || '-'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-title">System Usage</div>
              <div id="metric-cpu-system" className="metric-value">
                {usageData ? usageData.system_cpu_usage.toExponential(2) : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div id="disk-panel" className="nested-panel">
          <h4>Disk I/O</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-title">Read</div>
              <div id="metric-disk-read" className="metric-value">
                {usageData ? metricsService.formatBytes(usageData.disk_read_bytes) : '-'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Write</div>
              <div id="metric-disk-write" className="metric-value">
                {usageData ? metricsService.formatBytes(usageData.disk_write_bytes) : '-'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Operations</div>
              <div id="metric-disk-ops" className="metric-value">
                {usageData ? (
                  `${metricsService.formatNumber(usageData.disk_reads)} reads / ${metricsService.formatNumber(usageData.disk_writes)} writes`
                ) : '-'}
              </div>
            </div>
          </div>
        </div>

        <div id="network-panel" className="nested-panel">
          <h4>Network</h4>
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-title">Received</div>
              <div id="metric-net-rx" className="metric-value">
                {usageData ? metricsService.formatBytes(usageData.nw_rx_bytes) : '-'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Transmitted</div>
              <div id="metric-net-tx" className="metric-value">
                {usageData ? metricsService.formatBytes(usageData.nw_tx_bytes) : '-'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Packets (RX/TX)</div>
              <div id="metric-net-packets" className="metric-value">
                {usageData ? (
                  `${metricsService.formatNumber(usageData.nw_rx_packets)} / ${metricsService.formatNumber(usageData.nw_tx_packets)}`
                ) : '-'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-title">Errors (RX/TX)</div>
              <div id="metric-net-errors" className="metric-value">
                {usageData ? (
                  `${metricsService.formatNumber(usageData.nw_rx_errors)} / ${metricsService.formatNumber(usageData.nw_tx_errors)}`
                ) : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceMetrics;