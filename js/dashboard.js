class Dashboard {
  constructor () {
    this.currentContainer = null
    this.refreshInterval = 30
    this.refreshTimer = null
    this.charts = {
      memory: null,
      network: null
    }
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
        this.showError('Failed to load containers. Please try again later.')
        return false
      }

      this.populateContainerSelector()

      const containerNames = metricsService.getContainerNames()
      if (containerNames.length > 0) {
        this.selectContainer(containerNames[0])
      } else {
        this.showError('No containers found.')
      }

      this.setupAutoRefresh()

      return true
    } catch (error) {
      log('Error loading dashboard:', error)
      this.showError('An error occurred while loading the dashboard.')
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

  showError (message) {
    const errorElement = document.createElement('div')
    errorElement.className = 'error-message dashboard-error'
    errorElement.textContent = message

    const existingErrors = document.querySelectorAll('.dashboard-error')
    existingErrors.forEach(el => el.remove())

    const dashboard = document.getElementById('dashboard')
    dashboard.insertBefore(errorElement, dashboard.firstChild)
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

    this.setLoadingState(true)

    try {
      const detailsPromise = metricsService.fetchContainerDetails(containerName)

      const usagePromise = metricsService.fetchContainerUsage(containerName)

      const details = await detailsPromise

      if (!details) {
        log(`Failed to fetch details for ${containerName}`)
        this.showError(`Failed to load details for ${containerName}.`)
      }

      this.updateDashboard()

      await usagePromise
      this.updateUsageCharts()
    } catch (error) {
      log('Error selecting container:', error)
      this.showError(
        `An error occurred while loading details for ${containerName}.`
      )
    } finally {
      this.setLoadingState(false)
    }
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
        const detailsPromise = metricsService.fetchContainerDetails(
          this.currentContainer
        )
        const usagePromise = metricsService.fetchContainerUsage(
          this.currentContainer
        )

        await detailsPromise

        this.updateDashboard()

        await usagePromise
        this.updateUsageCharts()
      }

      const existingErrors = document.querySelectorAll('.dashboard-error')
      existingErrors.forEach(el => el.remove())
    } catch (error) {
      log('Error refreshing data:', error)
      this.showError('Failed to refresh container data.')
    } finally {
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

    const latestUsage = metricsService.getLatestUsage(this.currentContainer)
    if (latestUsage) {
      this.updateResourceMetrics(latestUsage)
    }
  }

  updateUsageCharts () {
    if (!this.currentContainer) return

    const usagePanel = document.getElementById('usage-panel')
    if (!metricsService.hasUsageData(this.currentContainer)) {
      if (usagePanel) {
        usagePanel.style.display = 'none'
      }
      return
    }

    if (usagePanel) {
      usagePanel.style.display = 'block'
    }

    const usageData = metricsService.getContainerUsage(this.currentContainer)

    this.updateMemoryChart(usageData)

    this.updateNetworkChart(usageData)
  }

  updateMemoryChart (usageData) {
    if (!usageData || usageData.length === 0) return

    const ctx = document.getElementById('memory-chart').getContext('2d')

    const timestamps = usageData.map(data => {
      const date = new Date(data.timestamp)
      return date.toLocaleTimeString()
    })

    const memoryPercent = usageData.map(data => data.memory_percent)

    if (this.charts.memory) {
      this.charts.memory.data.labels = timestamps
      this.charts.memory.data.datasets[0].data = memoryPercent
      this.charts.memory.update()
    } else {
      this.charts.memory = new Chart(ctx, {
        type: 'line',
        data: {
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
        },
        options: {
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
        }
      })
    }
  }

  updateNetworkChart (usageData) {
    if (!usageData || usageData.length === 0) return

    const ctx = document.getElementById('network-chart').getContext('2d')

    const timestamps = usageData.map(data => {
      const date = new Date(data.timestamp)
      return date.toLocaleTimeString()
    })

    const rxBytes = usageData.map(data => data.nw_rx_bytes / 1024)
    const txBytes = usageData.map(data => data.nw_tx_bytes / 1024)
    if (this.charts.network) {
      this.charts.network.data.labels = timestamps
      this.charts.network.data.datasets[0].data = rxBytes
      this.charts.network.data.datasets[1].data = txBytes
      this.charts.network.update()
    } else {
      this.charts.network = new Chart(ctx, {
        type: 'line',
        data: {
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
        },
        options: {
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
        }
      })
    }
  }

  updateResourceMetrics (usage) {
    const memoryUsage = document.getElementById('metric-memory-usage')
    const memoryLimit = document.getElementById('metric-memory-limit')
    const memoryPercent = document.getElementById('metric-memory-percent')
    const memoryBar = document.getElementById('memory-usage-bar')

    if (memoryUsage && memoryLimit && memoryPercent && memoryBar) {
      memoryUsage.textContent = metricsService.formatBytes(
        usage.memory_usage_bytes
      )
      memoryLimit.textContent = metricsService.formatBytes(
        usage.memory_limit_bytes
      )
      memoryPercent.textContent = `${usage.memory_percent}%`
      memoryBar.style.width = `${usage.memory_percent}%`

      if (usage.memory_percent > 80) {
        memoryBar.style.backgroundColor = 'var(--color-danger)'
      } else if (usage.memory_percent > 60) {
        memoryBar.style.backgroundColor = 'var(--color-warning)'
      } else {
        memoryBar.style.backgroundColor = 'var(--color-success)'
      }
    }

    const diskRead = document.getElementById('metric-disk-read')
    const diskWrite = document.getElementById('metric-disk-write')
    const diskOps = document.getElementById('metric-disk-ops')

    if (diskRead && diskWrite && diskOps) {
      diskRead.textContent = metricsService.formatBytes(usage.disk_read_bytes)
      diskWrite.textContent = metricsService.formatBytes(usage.disk_write_bytes)
      diskOps.textContent = `${metricsService.formatNumber(
        usage.disk_reads
      )} reads / ${metricsService.formatNumber(usage.disk_writes)} writes`
    }

    const netRx = document.getElementById('metric-net-rx')
    const netTx = document.getElementById('metric-net-tx')
    const netPackets = document.getElementById('metric-net-packets')
    const netErrors = document.getElementById('metric-net-errors')

    if (netRx && netTx && netPackets && netErrors) {
      netRx.textContent = metricsService.formatBytes(usage.nw_rx_bytes)
      netTx.textContent = metricsService.formatBytes(usage.nw_tx_bytes)
      netPackets.textContent = `${metricsService.formatNumber(
        usage.nw_rx_packets
      )} / ${metricsService.formatNumber(usage.nw_tx_packets)}`
      netErrors.textContent = `${metricsService.formatNumber(
        usage.nw_rx_errors
      )} / ${metricsService.formatNumber(usage.nw_tx_errors)}`
    }

    const cpuOnline = document.getElementById('metric-cpu-online')
    const cpuSystem = document.getElementById('metric-cpu-system')

    if (cpuOnline && cpuSystem) {
      cpuOnline.textContent = usage.online_cpus
      cpuSystem.textContent = usage.system_cpu_usage.toExponential(2)
    }

    const resourcePanel = document.getElementById('resource-metrics')
    if (resourcePanel) {
      resourcePanel.style.display = 'block'
    }
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
}

const dashboard = new Dashboard()
