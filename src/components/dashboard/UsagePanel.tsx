import React, { useEffect, useState, useRef } from 'react';
import metricsService, { UsageData } from '../../services/MetricsService';
import { Chart, ChartData, ChartOptions } from 'chart.js/auto';

interface UsagePanelProps {
  containerName: string;
}

const UsagePanel: React.FC<UsagePanelProps> = ({ containerName }) => {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [hasData, setHasData] = useState<boolean>(false);

  const memoryChartRef = useRef<HTMLCanvasElement | null>(null);
  const networkChartRef = useRef<HTMLCanvasElement | null>(null);
  const memoryChartInstance = useRef<Chart | null>(null);
  const networkChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    const data = metricsService.getContainerUsage(containerName);
    setUsageData(data);
    setHasData(data.length > 0);
  }, [containerName]);

  useEffect(() => {
    if (hasData && memoryChartRef.current && networkChartRef.current) {
      if (memoryChartInstance.current) {
        memoryChartInstance.current.destroy();
      }
      if (networkChartInstance.current) {
        networkChartInstance.current.destroy();
      }

      createMemoryChart();
      createNetworkChart();
    }

    return () => {
      if (memoryChartInstance.current) {
        memoryChartInstance.current.destroy();
      }
      if (networkChartInstance.current) {
        networkChartInstance.current.destroy();
      }
    };
  }, [usageData, hasData]);

  const createMemoryChart = (): void => {
    if (!memoryChartRef.current) return;

    const timestamps = usageData.map(data => {
      const date = new Date(data.timestamp);
      return date.toLocaleTimeString();
    });

    const memoryPercent = usageData.map(data => data.memory_percent);

    const chartData: ChartData = {
      labels: timestamps,
      datasets: [
        {
          label: 'Memory Usage (%)',
          data: memoryPercent,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }
      ]
    };

    const chartOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Memory Usage (%)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time'
          }
        }
      }
    };

    const ctx = memoryChartRef.current.getContext('2d');
    if (ctx) {
      memoryChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: chartOptions
      });
    }
  };

  const createNetworkChart = (): void => {
    if (!networkChartRef.current) return;

    const timestamps = usageData.map(data => {
      const date = new Date(data.timestamp);
      return date.toLocaleTimeString();
    });

    const rxBytes = usageData.map(data => data.nw_rx_bytes / 1024);
    const txBytes = usageData.map(data => data.nw_tx_bytes / 1024);

    const chartData: ChartData = {
      labels: timestamps,
      datasets: [
        {
          label: 'Data Received (KB)',
          data: rxBytes,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        },
        {
          label: 'Data Transmitted (KB)',
          data: txBytes,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }
      ]
    };

    const chartOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          title: {
            display: true,
            text: 'Network Traffic (KB)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time'
          }
        }
      }
    };

    const ctx = networkChartRef.current.getContext('2d');
    if (ctx) {
      networkChartInstance.current = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: chartOptions
      });
    }
  };

  if (!hasData) {
    return null;
  }

  return (
    <div id="usage-panel" className="metric-panel">
      <h3>Usage History</h3>
      <div className="dashboard-grid">
        <div className="chart-container">
          <h4>Memory Usage</h4>
          <div className="chart-wrapper">
            <canvas ref={memoryChartRef} id="memory-chart"></canvas>
          </div>
        </div>
        <div className="chart-container">
          <h4>Network Traffic</h4>
          <div className="chart-wrapper">
            <canvas ref={networkChartRef} id="network-chart"></canvas>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsagePanel;