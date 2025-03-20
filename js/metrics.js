class MetricsService {
  constructor() {
    this.containersList = {};
    this.containerDetails = {};
    this.lastFetchTimestamp = null;
  }

  // Fetch containers list with status
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

  // Fetch detailed information for a specific container
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

  // Get all container names with their status
  getContainers() {
    return this.containersList;
  }

  // Get container names as an array
  getContainerNames() {
    return Object.keys(this.containersList).sort();
  }

  // Get container status
  getContainerStatus(containerName) {
    return this.containersList[containerName] || 'unknown';
  }

  // Get detailed information for a container
  getContainerDetails(containerName) {
    return this.containerDetails[containerName] || null;
  }

  // Format utilities
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

  // Extract port mapping information from container details
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

  // Get important labels from container
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