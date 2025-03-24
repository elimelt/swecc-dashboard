import React, { useEffect, useState } from 'react';
import metricsService, {
  ContainerDetails,
  ContainerStatus
} from '../../services/MetricsService';

interface ContainerOverviewProps {
  containerName: string;
}

const ContainerOverview: React.FC<ContainerOverviewProps> = ({ containerName }) => {
  const [details, setDetails] = useState<ContainerDetails | null>(null);
  const [status, setStatus] = useState<ContainerStatus>('unknown');

  useEffect(() => {
    const fetchDetails = async () => {
      const containerDetails = await metricsService.fetchContainerDetails(containerName);
      const containerStatus = metricsService.getContainerStatus(containerName);

      console.log('Fetched Details:', containerDetails);
      console.log('Fetched Status:', containerStatus);

      setDetails(containerDetails);
      setStatus(containerStatus);
    };

    fetchDetails();
    const interval = setInterval(fetchDetails, 5000); // Auto-refresh every 5 seconds

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [containerName]);

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
            {metricsService.formatDate(details?.created_at || 'unknown')}
          </div>
        </div>

        <div className='metric-card'>
          <div className='metric-title'>Uptime</div>
          <div id='metric-uptime' className='metric-value'>
            {metricsService.formatDuration(details?.created_at || 'unknown')}
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
  );
};

export default ContainerOverview;
