import api from './api';
import { formatBytes, formatNumber, formatDuration } from '../utils/utils';
import { POLL_USAGE } from '../constants';
import { log } from '../utils/utils';

export interface ContainerDetails {
  name: string;
  short_id?: string;
  created_at?: string;
  image?: string;
  command?: string;
  ports?: Record<string, Array<{ HostIp: string; HostPort: string }>>;
  labels?: Record<string, string>;
  [key: string]: any;
}

export interface PortMapping {
  containerPort: string;
  hostIp: string;
  hostPort: string;
}

export interface UsageData {
  timestamp: string;
  memory_usage_bytes: number;
  memory_limit_bytes: number;
  memory_percent: number;
  cpu_percent: number;
  online_cpus: number;
  system_cpu_usage: number;
  disk_read_bytes: number;
  disk_write_bytes: number;
  disk_reads: number;
  disk_writes: number;
  nw_rx_bytes: number;
  nw_tx_bytes: number;
  nw_rx_packets: number;
  nw_tx_packets: number;
  nw_rx_errors: number;
  nw_tx_errors: number;
  [key: string]: any;
}

export type ContainerStatus = 'running' | 'stopped' | 'error' | 'unknown';

class MetricsService {
  private containersList: Record<string, ContainerStatus> = {};
  private containerDetails: Record<string, ContainerDetails> = {};
  private containerUsage: Record<string, UsageData[]> = {};
  private lastFetchTimestamp: Date | null = null;

  async fetchContainers(): Promise<boolean> {
    try {
      const response = await api.get<Record<string, ContainerStatus>>('/metrics/containers/');

      if (response.status === 200) {
        this.containersList = response.data;
        this.lastFetchTimestamp = new Date();

        log(`Fetched ${Object.keys(this.containersList).length} containers`);
        return true;
      }

      return false;
    } catch (error) {
      log('Error fetching containers:', error);
      return false;
    }
  }

  async fetchContainerDetails(containerName: string): Promise<ContainerDetails | null> {
    try {
      const response = await api.get<ContainerDetails>(`/metrics/containers/${containerName}`);

      if (response.status === 200) {
        this.containerDetails[containerName] = response.data;
        log(`Fetched details for ${containerName}`);
        return response.data;
      }

      return null;
    } catch (error) {
      log(`Error fetching container details for ${containerName}:`, error);
      return null;
    }
  }

  async fetchContainerUsage(containerName: string): Promise<UsageData[] | null> {
    if (!POLL_USAGE) {
      return [];
    }

    try {
      const response = await api.get<UsageData[]>(`/metrics/usage/${containerName}`);

      if (response.status === 200) {
        if (Array.isArray(response.data) && response.data.length > 0) {
          this.containerUsage[containerName] = response.data;
          log(`Fetched ${response.data.length} usage records for ${containerName}`);
          return response.data;
        } else {
          log(`No usage data available for ${containerName}`);
          this.containerUsage[containerName] = [];
          return [];
        }
      }

      return null;
    } catch (error) {
      log(`Error fetching usage for ${containerName}:`, error);
      this.containerUsage[containerName] = [];
      return null;
    }
  }

  hasUsageData(containerName: string): boolean {
    return (
      containerName in this.containerUsage &&
      this.containerUsage[containerName] &&
      this.containerUsage[containerName].length > 0
    );
  }

  getContainerUsage(containerName: string): UsageData[] {
    return this.containerUsage[containerName] || [];
  }

  getLatestUsage(containerName: string): UsageData | null {
    if (!this.hasUsageData(containerName)) return null;

    const usage = [...this.containerUsage[containerName]];
    usage.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return usage[0] || null;
  }

  getContainers(): Record<string, ContainerStatus> {
    return this.containersList;
  }

  getContainerNames(): string[] {
    return Object.keys(this.containersList).sort();
  }

  getContainerStatus(containerName: string): ContainerStatus {
    return this.containersList[containerName] || 'unknown';
  }

  getContainerDetails(containerName: string): ContainerDetails | null {
    return this.containerDetails[containerName] || null;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  formatBytes(bytes: number, decimals = 2): string {
    return formatBytes(bytes, decimals);
  }

  formatNumber(num: number): string {
    return formatNumber(num);
  }

  formatDuration(startDateString: string): string {
    if (!startDateString) return 'N/A';
    return formatDuration(startDateString);
  }

  getPortMappings(containerDetails: ContainerDetails | null): PortMapping[] {
    if (!containerDetails || !containerDetails.ports) {
      return [];
    }

    const portMappings: PortMapping[] = [];

    for (const [containerPort, hostBindings] of Object.entries(containerDetails.ports)) {
      for (const binding of hostBindings) {
        portMappings.push({
          containerPort,
          hostIp: binding.HostIp === '0.0.0.0' ? 'All Interfaces' : binding.HostIp,
          hostPort: binding.HostPort
        });
      }
    }

    return portMappings;
  }

  getContainerLabels(containerDetails: ContainerDetails | null): Record<string, string> {
    if (!containerDetails || !containerDetails.labels) {
      return {};
    }

    const importantLabels: Record<string, string> = {};
    const labelsOfInterest = [
      'build_version',
      'org.opencontainers.image.version',
      'org.opencontainers.image.title',
      'org.opencontainers.image.description'
    ];

    for (const label of labelsOfInterest) {
      if (containerDetails.labels[label]) {
        importantLabels[label] = containerDetails.labels[label];
      }
    }

    return importantLabels;
  }
}

export const metricsService = new MetricsService();
export default metricsService;