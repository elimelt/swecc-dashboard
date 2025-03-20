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

      const success = await metricsService.fetchMetrics()

      if (!success) {
        log('Failed to load metrics data')
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

  setLoadingState (isLoading) {}

  populateContainerSelector () {
    const containerSelector = document.getElementById('container-selector')
    const containerNames = metricsService.getContainerNames()

    containerSelector.innerHTML = ''

    containerNames.forEach(name => {
      const option = document.createElement('option')
      option.value = name
      option.textContent = name
      containerSelector.appendChild(option)
    })
  }

  handleContainerChange (event) {
    const containerName = event.target.value
    this.selectContainer(containerName)
  }

  selectContainer (containerName) {
    this.currentContainer = containerName
    document.getElementById('container-selector').value = containerName

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
      const success = await metricsService.fetchMetrics()

      if (success) {
        this.updateDashboard()
      }
    } catch (error) {
      log('Error refreshing data:', error)
    }
  }

  updateDashboard () {
    if (!this.currentContainer) return

    const latestMetric = metricsService.getLatestMetricForContainer(
      this.currentContainer
    )

    if (!latestMetric) {
      log(`No metrics found for container: ${this.currentContainer}`)
      return
    }

    this.updateOverview(latestMetric)

    this.updateMemoryMetrics(latestMetric)

    this.updateDiskMetrics(latestMetric)

    this.updateNetworkMetrics(latestMetric)

    this.updateCpuMetrics(latestMetric)

    this.updateHistoryChart()
  }

  updateOverview (metric) {
    const statusElement = document.getElementById('metric-status')
    statusElement.textContent = metric.status
    statusElement.className = 'metric-value status-' + metric.status

    document.getElementById(
      'metric-started'
    ).textContent = `${metricsService.formatDate(
      metric.started_at
    )} (${metricsService.formatDuration(metric.started_at)})`

    const healthText = metric.health_status || 'Not monitored'
    const healthElement = document.getElementById('metric-health')
    healthElement.textContent = healthText
    healthElement.className =
      'metric-value health-' + (metric.health_status || 'none')

    document.getElementById('metric-restarts').textContent = metric.restarts
  }

  updateMemoryMetrics (metric) {
    document.getElementById('metric-memory-usage').textContent =
      metricsService.formatBytes(metric.memory_usage_bytes)

    document.getElementById('metric-memory-limit').textContent =
      metricsService.formatBytes(metric.memory_limit_bytes)

    const percentElement = document.getElementById('metric-memory-percent')
    percentElement.textContent = `${metric.memory_percent}%`

    const progressBar = document.getElementById('memory-usage-bar')
    progressBar.style.width = `${metric.memory_percent}%`

    let barColor = 'var(--color-success)'
    if (metric.memory_percent > 80) {
      barColor = 'var(--color-danger)'
    } else if (metric.memory_percent > 60) {
      barColor = 'var(--color-warning)'
    }
    progressBar.style.backgroundColor = barColor
  }

  updateDiskMetrics (metric) {
    document.getElementById('metric-disk-read').textContent =
      metricsService.formatBytes(metric.disk_read_bytes)

    document.getElementById('metric-disk-write').textContent =
      metricsService.formatBytes(metric.disk_write_bytes)

    document.getElementById(
      'metric-disk-ops'
    ).textContent = `${metricsService.formatNumber(
      metric.disk_reads
    )} reads / ${metricsService.formatNumber(metric.disk_writes)} writes`
  }

  updateNetworkMetrics (metric) {
    document.getElementById('metric-net-rx').textContent =
      metricsService.formatBytes(metric.nw_rx_bytes)

    document.getElementById('metric-net-tx').textContent =
      metricsService.formatBytes(metric.nw_tx_bytes)

    document.getElementById(
      'metric-net-packets'
    ).textContent = `${metricsService.formatNumber(
      metric.nw_rx_packets
    )} / ${metricsService.formatNumber(metric.nw_tx_packets)}`

    document.getElementById(
      'metric-net-errors'
    ).textContent = `${metricsService.formatNumber(
      metric.nw_rx_errors
    )} / ${metricsService.formatNumber(metric.nw_tx_errors)}`
  }

  updateCpuMetrics (metric) {
    document.getElementById('metric-cpu-online').textContent =
      metric.online_cpus

    document.getElementById('metric-cpu-system').textContent =
      metric.system_cpu_usage.toExponential(2)
  }

  updateHistoryChart () {
    const history = metricsService.getMetricHistoryForContainer(
      this.currentContainer,
      20
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
              label: 'Memory Usage (%)',
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
