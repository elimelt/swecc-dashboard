import React from 'react';
import { useContainerDetails } from '../../hooks/useContainerDetails';

interface ContainerDetailsProps {
  containerName: string;
}

const ContainerDetails: React.FC<ContainerDetailsProps> = ({ containerName }) => {
  const { details, formatDate } = useContainerDetails(containerName);

  if (!details) {
    return null;
  }

  return (
    <div id="container-details" className="metric-panel">
      <h3>Container Details</h3>
      <div className="detail-grid">
        <div className="detail-row">
          <div className="detail-label">Name:</div>
          <div id="detail-name" className="detail-value">
            {details.name}
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">ID:</div>
          <div id="detail-id" className="detail-value">
            {details.short_id || 'N/A'}
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Image:</div>
          <div id="detail-image" className="detail-value">
            {details.image || 'N/A'}
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Created:</div>
          <div id="detail-created" className="detail-value">
            {details.created_at 
              ? formatDate(details.created_at)
              : 'N/A'
            }
          </div>
        </div>

        <div className="detail-row">
          <div className="detail-label">Command:</div>
          <div id="detail-command" className="detail-value">
            {details.command || 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContainerDetails;