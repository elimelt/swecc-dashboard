class Dashboard {
  constructor() {
    this.currentContainer = null;
    this.refreshInterval = 30; // Default interval in seconds
    this.refreshTimer = null;
    this.chart = null;
  }

  initialize() {
    // Set up event listeners
    document.getElementById('container-selector').addEventListener('change', this.handleContainerChange.bind(this));
    document.getElementById('refresh-interval').addEventListener('change', this.handleRefreshIntervalChange.bind(this));
    document.getElementById('refresh-btn').addEventListener('click', this.refreshData.bind(this));
  }

  async loadDashboard() {
    try {
      // Show loading state
      this.setLoadingState(true);

      // Fetch container list
      const success = await metricsService.fetchContainers();

      if (!success) {
        log('Failed to load container data');
        this.showError('Failed to load containers. Please try again later.');
        return false;
      }

      // Populate container selector
      this.populateContainerSelector();

      // If we have containers, select the first one
      const containerNames = metricsService.getContainerNames();
      if (containerNames.length > 0) {
        this.selectContainer(containerNames[0]);
      } else {
        this.showError('No containers found.');
      }

      // Set up auto-refresh
      this.setupAutoRefresh();

      return true;
    } catch (error) {
      log('Error loading dashboard:', error);
      this.showError('An error occurred while loading the dashboard.');
      return false;
    } finally {
      this.setLoadingState(false);
    }
  }

  setLoadingState(isLoading) {
    const loadingIndicator = document.getElementById('dashboard-loading');
    if (loadingIndicator) {
      loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
  }

  showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message dashboard-error';
    errorElement.textContent = message;

    // Remove any existing error messages
    const existingErrors = document.querySelectorAll('.dashboard-error');
    existingErrors.forEach(el => el.remove());

    // Insert the error message at the top of the dashboard
    const dashboard = document.getElementById('dashboard');
    dashboard.insertBefore(errorElement, dashboard.firstChild);
  }

  populateContainerSelector() {
    const containerSelector = document.getElementById('container-selector');
    const containers = metricsService.getContainers();

    // Clear existing options
    containerSelector.innerHTML = '';

    // Add options for each container
    Object.entries(containers).forEach(([name, status]) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = `${name} (${status})`;

      // Add a class based on status
      option.classList.add(`status-${status}`);

      containerSelector.appendChild(option);
    });
  }

  handleContainerChange(event) {
    const containerName = event.target.value;
    this.selectContainer(containerName);
  }

  async selectContainer(containerName) {
    this.currentContainer = containerName;
    document.getElementById('container-selector').value = containerName;

    // Show loading state
    this.setLoadingState(true);

    try {
      // Fetch detailed container information
      const details = await metricsService.fetchContainerDetails(containerName);

      if (!details) {
        log(`Failed to fetch details for ${containerName}`);
        this.showError(`Failed to load details for ${containerName}.`);
      }

      // Update the dashboard with the selected container's data
      this.updateDashboard();
    } catch (error) {
      log('Error selecting container:', error);
      this.showError(`An error occurred while loading details for ${containerName}.`);
    } finally {
      this.setLoadingState(false);
    }
  }

  handleRefreshIntervalChange(event) {
    const intervalSeconds = parseInt(event.target.value, 10);
    this.refreshInterval = intervalSeconds;

    // Reset auto-refresh timer
    this.setupAutoRefresh();
  }

  setupAutoRefresh() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Set up new timer if interval is greater than 0
    if (this.refreshInterval > 0) {
      this.refreshTimer = setInterval(
        this.refreshData.bind(this),
        this.refreshInterval * 1000
      );
      log(`Auto-refresh set to ${this.refreshInterval} seconds`);
    } else {
      log('Auto-refresh disabled');
    }
  }

  async refreshData() {
    try {
      this.setLoadingState(true);

      // Refresh containers list
      await metricsService.fetchContainers();

      // Update container selector
      this.populateContainerSelector();

      // Refresh details for current container
      if (this.currentContainer) {
        await metricsService.fetchContainerDetails(this.currentContainer);
      }

      // Update the dashboard
      this.updateDashboard();

      // Remove any error messages since refresh was successful
      const existingErrors = document.querySelectorAll('.dashboard-error');
      existingErrors.forEach(el => el.remove());
    } catch (error) {
      log('Error refreshing data:', error);
      this.showError('Failed to refresh container data.');
    } finally {
      this.setLoadingState(false);
    }
  }

  updateDashboard() {
    if (!this.currentContainer) return;

    // Get the container status
    const status = metricsService.getContainerStatus(this.currentContainer);

    // Get container details if available
    const containerDetails = metricsService.getContainerDetails(this.currentContainer);

    // Update overview panel
    this.updateOverview(status, containerDetails);

    // Update container details panel
    this.updateContainerDetails(containerDetails);

    // Update ports panel
    this.updatePortsPanel(containerDetails);

    // Update labels panel
    this.updateLabelsPanel(containerDetails);

    // Remove history panel since we have no real data for it
    const historyPanel = document.getElementById('history-panel');
    if (historyPanel) {
      historyPanel.style.display = 'none';
    }
  }

  updateOverview(status, details) {
    // Container Status
    const statusElement = document.getElementById('metric-status');
    statusElement.textContent = status || 'unknown';
    statusElement.className = 'metric-value status-' + (status || 'unknown');

    // Container ID
    document.getElementById('metric-container-id').textContent =
      details?.short_id ? details.short_id : 'N/A';

    // Creation date
    const createdAt = details?.created_at ? metricsService.formatDate(details.created_at) : 'N/A';
    document.getElementById('metric-created').textContent = createdAt;

    // Uptime (if we have creation date)
    const uptime = details?.created_at ? metricsService.formatDuration(details.created_at) : 'N/A';
    document.getElementById('metric-uptime').textContent = uptime;

    // Image
    document.getElementById('metric-image').textContent =
      details?.image ? details.image : 'N/A';
  }

  updateContainerDetails(details) {
    if (!details) {
      document.getElementById('container-details').style.display = 'none';
      return;
    }

    document.getElementById('container-details').style.display = 'block';

    // Display container name and ID
    document.getElementById('detail-name').textContent = details.name;
    document.getElementById('detail-id').textContent = details.short_id || 'N/A';

    // Display image info
    document.getElementById('detail-image').textContent = details.image || 'N/A';

    // Display creation time
    document.getElementById('detail-created').textContent =
      details.created_at ? metricsService.formatDate(details.created_at) : 'N/A';

    // Display command if available
    document.getElementById('detail-command').textContent =
      details.command ? details.command : 'N/A';
  }

  updatePortsPanel(details) {
    const portsPanel = document.getElementById('ports-panel');
    const portsGrid = document.getElementById('ports-grid');

    if (!details || !details.ports || Object.keys(details.ports).length === 0) {
      portsPanel.style.display = 'none';
      return;
    }

    portsPanel.style.display = 'block';
    portsGrid.innerHTML = '';

    // Get port mappings
    const portMappings = metricsService.getPortMappings(details);

    // Create port mapping cards
    portMappings.forEach(mapping => {
      const portCard = document.createElement('div');
      portCard.className = 'metric-card';

      const title = document.createElement('div');
      title.className = 'metric-title';
      title.textContent = `Container Port: ${mapping.containerPort}`;

      const value = document.createElement('div');
      value.className = 'metric-value';
      value.textContent = `${mapping.hostIp}:${mapping.hostPort}`;

      portCard.appendChild(title);
      portCard.appendChild(value);
      portsGrid.appendChild(portCard);
    });
  }

  updateLabelsPanel(details) {
    const labelsPanel = document.getElementById('labels-panel');
    const labelsGrid = document.getElementById('labels-grid');

    if (!details || !details.labels || Object.keys(details.labels).length === 0) {
      labelsPanel.style.display = 'none';
      return;
    }

    labelsPanel.style.display = 'block';
    labelsGrid.innerHTML = '';

    // Get important labels
    const importantLabels = metricsService.getContainerLabels(details);

    // If no important labels, show a selection of available labels
    const labelsToShow = Object.keys(importantLabels).length > 0 ?
      importantLabels :
      Object.fromEntries(
        Object.entries(details.labels).slice(0, 5)
      );

    // Create label cards
    Object.entries(labelsToShow).forEach(([key, value]) => {
      const labelCard = document.createElement('div');
      labelCard.className = 'metric-card';

      const title = document.createElement('div');
      title.className = 'metric-title';
      title.textContent = key.split('.').pop(); // Show only the last part of the label name

      const valueElement = document.createElement('div');
      valueElement.className = 'metric-value';
      valueElement.textContent = value.length > 100 ? value.substring(0, 97) + '...' : value;

      // Add tooltip for long values
      if (value.length > 100) {
        valueElement.title = value;
      }

      labelCard.appendChild(title);
      labelCard.appendChild(valueElement);
      labelsGrid.appendChild(labelCard);
    });
  }
}

const dashboard = new Dashboard();