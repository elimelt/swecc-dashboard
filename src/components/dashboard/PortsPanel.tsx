import React, { useEffect, useState } from 'react';
import metricsService, { PortMapping } from '../../services/MetricsService';

interface PortsPanelProps {
  containerName: string;
}

const PortsPanel: React.FC<PortsPanelProps> = ({ containerName }) => {
  const [portMappings, setPortMappings] = useState<PortMapping[]>([]);

  useEffect(() => {
    const containerDetails = metricsService.getContainerDetails(containerName);
    if (containerDetails) {
      const mappings = metricsService.getPortMappings(containerDetails);
      setPortMappings(mappings);
    }
  }, [containerName]);

  if (portMappings.length === 0) {
    return null;
  }

  return (
    <div id="ports-panel" className="metric-panel">
      <h3>Port Mappings</h3>
      <div id="ports-grid" className="metrics-grid">
        {portMappings.map((mapping, index) => (
          <div key={index} className="metric-card">
            <div className="metric-title">
              Container Port: {mapping.containerPort}
            </div>
            <div className="metric-value">
              {mapping.hostIp}:{mapping.hostPort}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortsPanel;