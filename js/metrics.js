class MetricsService {
  constructor() {
    this.containersList = {};
    this.containerDetails = {};
    this.containerUsage = {};
    this.lastFetchTimestamp = null;
  }

    async fetchContainers() {
    try {
      const response = await withCsrf(() => api.get('/metrics/containers/'));

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

    async fetchContainerDetails(containerName) {
    try {
      const response = await withCsrf(() => api.get(`/metrics/containers/${containerName}`));

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

    async fetchContainerUsage(containerName) {
    try {
      const response = await withCsrf(() => api.get(`/metrics/usage/${containerName}`));

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

    hasUsageData(containerName) {
    return containerName in this.containerUsage &&
           this.containerUsage[containerName] &&
           this.containerUsage[containerName].length > 0;
  }

    getContainerUsage(containerName) {
    return this.containerUsage[containerName] || [];
  }

    getLatestUsage(containerName) {
    if (!this.hasUsageData(containerName)) return null;

        const usage = [...this.containerUsage[containerName]];
    usage.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return usage[0] || null;
  }

    getContainers() {
    return this.containersList;
  }

    getContainerNames() {
    return Object.keys(this.containersList).sort();
  }

    getContainerStatus(containerName) {
    return this.containersList[containerName] || 'unknown';
  }

    getContainerDetails(containerName) {
    return this.containerDetails[containerName] || null;
  }

    formatBytes(bytes, decimals = 2) {
    if (!bytes || bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  }

  formatNumber(num) {
    if (!num) return '0';
    return new Intl.NumberFormat().format(num);
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  formatDuration(startDateString) {
    if (!startDateString) return 'N/A';

    const startDate = new Date(startDateString);
    const now = new Date();

    const diffMs = now - startDate;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours % 24} hours`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMin % 60} min`;
    } else {
      return `${diffMin} min`;
    }
  }

    getPortMappings(containerDetails) {
    if (!containerDetails || !containerDetails.ports) {
      return [];
    }

    const portMappings = [];

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

    getContainerLabels(containerDetails) {
    if (!containerDetails || !containerDetails.labels) {
      return {};
    }

    const importantLabels = {};
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

const metricsService = new MetricsService();