import React, { useState, useEffect, useCallback } from 'react';
import { useContainers } from '../../hooks/useContainers';
import ContainerOverview from './ContainerOverview';
import ContainerDetails from './ContainerDetails';
import ResourceMetrics from './ResourceMetrics';
import UsagePanel from './UsagePanel';
import PortsPanel from './PortsPanel';
import LabelsPanel from './LabelsPanel';
import LogsPanel from './LogsPanel';
import { REFRESH_INTERVALS, DEFAULT_REFRESH_INTERVAL } from '../../constants';

const Dashboard: React.FC = () => {
    const [currentContainer, setCurrentContainer] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(DEFAULT_REFRESH_INTERVAL);

    const {
    containers,
    containerNames,
    loading: containersLoading,
    error: containersError,
    fetchContainers
  } = useContainers();

    useEffect(() => {
    if (containerNames.length > 0 && !currentContainer) {
      setCurrentContainer(containerNames[0]);
    }
  }, [containerNames, currentContainer]);

    const handleContainerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const containerName = e.target.value;
    setCurrentContainer(containerName);
  };

    const handleRefreshIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const interval = parseInt(e.target.value, 10);
    setRefreshInterval(interval);
  };

    const refreshData = useCallback(async () => {
    await fetchContainers();
  }, [fetchContainers]);

  return (
    <div id="dashboard">
      {containersLoading && (
        <div id="dashboard-loading" className="loading-indicator">
          <div className="loading-spinner"></div>
          <p>Loading data...</p>
        </div>
      )}

      {containersError && <div className="error-message dashboard-error">{containersError}</div>}

      <div className="dashboard-header">
        <h2>Container Info</h2>
        <div className="dashboard-controls">
          <select
            id="container-selector"
            value={currentContainer || ''}
            onChange={handleContainerChange}
            aria-label="Select a container"
          >
            {Object.keys(containers).length === 0 ? (
              <option value="">Loading containers...</option>
            ) : (
              Object.entries(containers).map(([name, status]) => (
                <option
                  key={name}
                  value={name}
                  className={`status-${status}`}
                >
                  {name} ({status})
                </option>
              ))
            )}
          </select>

          <label htmlFor="refresh-interval">Auto Refresh:</label>
          <select
            id="refresh-interval"
            value={refreshInterval}
            onChange={handleRefreshIntervalChange}
          >
            {REFRESH_INTERVALS.map(interval => (
              <option key={interval.value} value={interval.value}>
                {interval.label}
              </option>
            ))}
          </select>

          <button id="refresh-btn" onClick={refreshData}>
            Refresh Now
          </button>
        </div>
      </div>

      {currentContainer && (
        <>
          <ContainerOverview containerName={currentContainer} />

          <ContainerDetails containerName={currentContainer} />

          <ResourceMetrics containerName={currentContainer} />

          <div className="dashboard-grid">
            <PortsPanel containerName={currentContainer} />
            <LabelsPanel containerName={currentContainer} />
          </div>

          <UsagePanel containerName={currentContainer} refreshInterval={refreshInterval} />

          <LogsPanel containerName={currentContainer} />
        </>
      )}
    </div>
  );
};

export default Dashboard;