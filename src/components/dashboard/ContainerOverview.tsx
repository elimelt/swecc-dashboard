import React from 'react'
import { useContainers } from '../../hooks/useContainers'
import { useContainerDetails } from '../../hooks/useContainerDetails'

interface ContainerOverviewProps {
  containerName: string
}

const ContainerOverview: React.FC<ContainerOverviewProps> = ({
  containerName
}) => {
  const { getContainerStatus } = useContainers()
  const { details, formatDate, formatDuration } =
    useContainerDetails(containerName)

  const status = getContainerStatus(containerName)

  const formatCreatedAt = (createdAt?: string): string => {
    return createdAt ? formatDate(createdAt) : 'N/A'
  }

  const formatUptime = (createdAt?: string): string => {
    return createdAt ? formatDuration(createdAt) : 'N/A'
  }

  return (
    <div id='container-overview' className='metric-panel'>
      <h3>Container Overview</h3>
      <div className='metrics-grid'>
        <div className='metric-card'>
          <div className='metric-title'>Status</div>
          <div id='metric-status' className={`metric-value status-${status}`}>
            {status}
          </div>
        </div>

        <div className='metric-card'>
          <div className='metric-title'>Container ID</div>
          <div id='metric-container-id' className='metric-value'>
            {details?.short_id || 'N/A'}
          </div>
        </div>

        <div className='metric-card'>
          <div className='metric-title'>Created At</div>
          <div id='metric-created' className='metric-value'>
            {formatCreatedAt(details?.created_at)}
          </div>
        </div>

        <div className='metric-card'>
          <div className='metric-title'>Uptime</div>
          <div id='metric-uptime' className='metric-value'>
            {formatUptime(details?.created_at)}
          </div>
        </div>
        <div className='metric-card wide-card'>
          <div className='metric-title'>Image</div>
          <div id='metric-image' className='metric-value'>
            {details?.image || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContainerOverview
