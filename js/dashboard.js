class Dashboard {
  constructor () {
    this.currentContainer = null
    this.refreshInterval = 30
    this.refreshTimer = null
    this.chart = null
  }

  initialize () {
    document
      .getElementById('container-selector')
      .addEventListener('change', this.handleContainerChange.bind(this))
    document
      .getElementById('refresh-interval')
      .addEventListener('change', this.handleRefreshIntervalChange.bind(this))
    document
      .getElementById('refresh-btn')
      .addEventListener('click', this.refreshData.bind(this))
  }

  async loadDashboard () {
    try {
      this.setLoadingState(true)

      const success = await metricsService.fetchContainers()

      if (!success) {
        log('Failed to load container data')
        return false
      }

      this.populateContainerSelector()

      const containerNames = metricsService.getContainerNames()
      if (containerNames.length > 0) {
        this.selectContainer(containerNames[0])
      }

      this.setupAutoRefresh()

      return true
    } catch (error) {
      log('Error loading dashboard:', error)
      return false
    } finally {
      this.setLoadingState(false)
    }
  }

  setLoadingState (isLoading) {
    const loadingIndicator = document.getElementById('dashboard-loading')
    if (loadingIndicator) {
      loadingIndicator.style.display = isLoading ? 'block' : 'none'
    }
  }

  populateContainerSelector () {
    const containerSelector = document.getElementById('container-selector')
    const containers = metricsService.getContainers()

    containerSelector.innerHTML = ''

    Object.entries(containers).forEach(([name, status]) => {
      const option = document.createElement('option')
      option.value = name
      option.textContent = `${name} (${status})`

      option.classList.add(`status-${status}`)

      containerSelector.appendChild(option)
    })
  }

  handleContainerChange (event) {
    const containerName = event.target.value
    this.selectContainer(containerName)
  }

  async selectContainer (containerName) {
    this.currentContainer = containerName
    document.getElementById('container-selector').value = containerName

    await metricsService.fetchContainerDetails(containerName)

    this.updateDashboard()
  }

  handleRefreshIntervalChange (event) {
    const intervalSeconds = parseInt(event.target.value, 10)
    this.refreshInterval = intervalSeconds

    this.setupAutoRefresh()
  }

  setupAutoRefresh () {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }

    if (this.refreshInterval > 0) {
      this.refreshTimer = setInterval(
        this.refreshData.bind(this),
        this.refreshInterval * 1000
      )
      log(`Auto-refresh set to ${this.refreshInterval} seconds`)
    } else {
      log('Auto-refresh disabled')
    }
  }

  async refreshData () {
    try {
      this.setLoadingState(true)

      await metricsService.fetchContainers()

      this.populateContainerSelector()

      if (this.currentContainer) {
        await metricsService.fetchContainerDetails(this.currentContainer)
      }

      this.updateDashboard()

      this.setLoadingState(false)
    } catch (error) {
      log('Error refreshing data:', error)
      this.setLoadingState(false)
    }
  }

  updateDashboard () {
    if (!this.currentContainer) return

    const status = metricsService.getContainerStatus(this.currentContainer)

    const containerDetails = metricsService.getContainerDetails(
      this.currentContainer
    )

    this.updateOverview(status, containerDetails)

    this.updateContainerDetails(containerDetails)

    this.updatePortsPanel(containerDetails)

    this.updateLabelsPanel(containerDetails)

    this.updateHistoryChart()
  }

  updateOverview (status, details) {
    const statusElement = document.getElementById('metric-status')
    statusElement.textContent = status || 'unknown'
    statusElement.className = 'metric-value status-' + (status || 'unknown')

    document.getElementById('metric-container-id').textContent =
      details?.short_id ? details.short_id : 'N/A'

    const createdAt = details?.created_at
      ? metricsService.formatDate(details.created_at)
      : 'N/A'
    document.getElementById('metric-created').textContent = createdAt

    const uptime = details?.created_at
      ? metricsService.formatDuration(details.created_at)
      : 'N/A'
    document.getElementById('metric-uptime').textContent = uptime

    document.getElementById('metric-image').textContent = details?.image
      ? details.image
      : 'N/A'
  }

  updateContainerDetails (details) {
    if (!details) {
      document.getElementById('container-details').style.display = 'none'
      return
    }

    document.getElementById('container-details').style.display = 'block'

    document.getElementById('detail-name').textContent = details.name
    document.getElementById('detail-id').textContent = details.short_id || 'N/A'

    document.getElementById('detail-image').textContent = details.image || 'N/A'

    document.getElementById('detail-created').textContent = details.created_at
      ? metricsService.formatDate(details.created_at)
      : 'N/A'

    document.getElementById('detail-command').textContent = details.command
      ? details.command
      : 'N/A'
  }

  updatePortsPanel (details) {
    const portsPanel = document.getElementById('ports-panel')
    const portsGrid = document.getElementById('ports-grid')

    if (!details || !details.ports || Object.keys(details.ports).length === 0) {
      portsPanel.style.display = 'none'
      return
    }

    portsPanel.style.display = 'block'
    portsGrid.innerHTML = ''

    const portMappings = metricsService.getPortMappings(details)

    portMappings.forEach(mapping => {
      const portCard = document.createElement('div')
      portCard.className = 'metric-card'

      const title = document.createElement('div')
      title.className = 'metric-title'
      title.textContent = `Container Port: ${mapping.containerPort}`

      const value = document.createElement('div')
      value.className = 'metric-value'
      value.textContent = `${mapping.hostIp}:${mapping.hostPort}`

      portCard.appendChild(title)
      portCard.appendChild(value)
      portsGrid.appendChild(portCard)
    })
  }

  updateLabelsPanel (details) {
    const labelsPanel = document.getElementById('labels-panel')
    const labelsGrid = document.getElementById('labels-grid')

    if (
      !details ||
      !details.labels ||
      Object.keys(details.labels).length === 0
    ) {
      labelsPanel.style.display = 'none'
      return
    }

    labelsPanel.style.display = 'block'
    labelsGrid.innerHTML = ''

    const importantLabels = metricsService.getContainerLabels(details)

    const labelsToShow =
      Object.keys(importantLabels).length > 0
        ? importantLabels
        : Object.fromEntries(Object.entries(details.labels).slice(0, 5))

    Object.entries(labelsToShow).forEach(([key, value]) => {
      const labelCard = document.createElement('div')
      labelCard.className = 'metric-card'

      const title = document.createElement('div')
      title.className = 'metric-title'
      title.textContent = key.split('.').pop()
      const valueElement = document.createElement('div')
      valueElement.className = 'metric-value'
      valueElement.textContent =
        value.length > 100 ? value.substring(0, 97) + '...' : value

      if (value.length > 100) {
        valueElement.title = value
      }

      labelCard.appendChild(title)
      labelCard.appendChild(valueElement)
      labelsGrid.appendChild(labelCard)
    })
  }

  updateHistoryChart () {
    const history = metricsService.getMetricHistoryForContainer(
      this.currentContainer,
      10
    )

    if (history.length === 0) return

    const timestamps = history.map(m => {
      const date = new Date(m.timestamp)
      return date.toLocaleTimeString()
    })

    const memoryData = history.map(m => m.memory_percent)

    if (!this.chart) {
      const ctx = document.getElementById('history-chart').getContext('2d')

      this.chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: timestamps,
          datasets: [
            {
              label: 'Memory Usage (mock data)',
              data: memoryData,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              borderWidth: 2,
              fill: true,
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 100
            }
          }
        }
      })
    } else {
      this.chart.data.labels = timestamps
      this.chart.data.datasets[0].data = memoryData
      this.chart.update()
    }
  }
}

const dashboard = new Dashboard()
