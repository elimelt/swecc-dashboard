import React from 'react'
import { useContainerUsage } from '../../hooks/useContainerUsage'
import { formatBytes, formatNumber } from '../../utils/utils'

interface ResourceMetricsProps {
  containerName: string
}

const ResourceMetrics: React.FC<ResourceMetricsProps> = ({ containerName }) => {
  const { latestUsage } = useContainerUsage(containerName)

  if (!latestUsage) {
    return null
  }

  const getMemoryBarColor = (memoryPercent: number): string => {
    if (memoryPercent > 80) {
      return 'var(--color-danger)'
    } else if (memoryPercent > 60) {
      return 'var(--color-warning)'
    } else {
      return 'var(--color-success)'
    }
  }

  return (
    <div id='resource-metrics' className='metric-panel'>
      <h3>Resource Usage</h3>
      <div className='dashboard-grid'>
        <div id='memory-panel' className='nested-panel'>
          <h4>Memory</h4>
          <div className='metrics-grid'>
            <div className='metric-card'>
              <div className='metric-title'>Usage</div>
              <div id='metric-memory-usage' className='metric-value'>
                {formatBytes(latestUsage.memory_usage_bytes)}
              </div>
            </div>
            <div className='metric-card'>
              <div className='metric-title'>Limit</div>
              <div id='metric-memory-limit' className='metric-value'>
                {formatBytes(latestUsage.memory_limit_bytes)}
              </div>
            </div>
            <div className='metric-card wide-card'>
              <div className='metric-title'>Percentage</div>
              <div className='progress-container'>
                <div
                  id='memory-usage-bar'
                  className='progress-bar'
                  style={{
                    width: `${latestUsage.memory_percent}%`,
                    backgroundColor: getMemoryBarColor(
                      latestUsage.memory_percent
                    )
                  }}
                ></div>
                <span id='metric-memory-percent' className='progress-text'>
                  {`${latestUsage.memory_percent}%`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div id='cpu-panel' className='nested-panel'>
          <h4>CPU</h4>
          <div className='metrics-grid'>
            <div className='metric-card'>
              <div className='metric-title'>Online CPUs</div>
              <div id='metric-cpu-online' className='metric-value'>
                {latestUsage.online_cpus || '-'}
              </div>
            </div>
            <div className='metric-card'>
              <div className='metric-title'>System Usage</div>
              <div id='metric-cpu-system' className='metric-value'>
                {latestUsage.system_cpu_usage.toExponential(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className='dashboard-grid'>
        <div id='disk-panel' className='nested-panel'>
          <h4>Disk I/O</h4>
          <div className='metrics-grid'>
            <div className='metric-card'>
              <div className='metric-title'>Read</div>
              <div id='metric-disk-read' className='metric-value'>
                {formatBytes(latestUsage.disk_read_bytes)}
              </div>
            </div>
            <div className='metric-card'>
              <div className='metric-title'>Write</div>
              <div id='metric-disk-write' className='metric-value'>
                {formatBytes(latestUsage.disk_write_bytes)}
              </div>
            </div>
            <div className='metric-card'>
              <div className='metric-title'>Operations</div>
              <div id='metric-disk-ops' className='metric-value'>
                {`${formatNumber(
                  latestUsage.disk_reads
                )} reads / ${formatNumber(latestUsage.disk_writes)} writes`}
              </div>
            </div>
          </div>
        </div>

        <div id='network-panel' className='nested-panel'>
          <h4>Network</h4>
          <div className='metrics-grid'>
            <div className='metric-card'>
              <div className='metric-title'>Received</div>
              <div id='metric-net-rx' className='metric-value'>
                {formatBytes(latestUsage.nw_rx_bytes)}
              </div>
            </div>
            <div className='metric-card'>
              <div className='metric-title'>Transmitted</div>
              <div id='metric-net-tx' className='metric-value'>
                {formatBytes(latestUsage.nw_tx_bytes)}
              </div>
            </div>
            <div className='metric-card'>
              <div className='metric-title'>Packets (RX/TX)</div>
              <div id='metric-net-packets' className='metric-value'>
                {`${formatNumber(latestUsage.nw_rx_packets)} / ${formatNumber(
                  latestUsage.nw_tx_packets
                )}`}
              </div>
            </div>
            <div className='metric-card'>
              <div className='metric-title'>Errors (RX/TX)</div>
              <div id='metric-net-errors' className='metric-value'>
                {`${formatNumber(latestUsage.nw_rx_errors)} / ${formatNumber(
                  latestUsage.nw_tx_errors
                )}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResourceMetrics
