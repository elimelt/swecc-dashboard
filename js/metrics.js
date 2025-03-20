class MetricsService {
  constructor () {
    this.metricsData = []
    this.containerNames = new Set()
    this.lastFetchTimestamp = null
  }

  async fetchMetrics () {
    try {
      const response = await withCsrf(() => api.get('/metrics/all'))

      if (response.status === 200) {
        this.metricsData = response.data
        this.lastFetchTimestamp = new Date()

        this.containerNames = new Set(
          this.metricsData.map(metric => metric.container_name)
        )

        log(
          `Fetched ${this.metricsData.length} metrics for ${this.containerNames.size} containers`
        )
        return true
      }

      return false
    } catch (error) {
      log('Error fetching metrics:', error)
      return false
    }
  }

  getContainerNames () {
    return Array.from(this.containerNames).sort()
  }

  getLatestMetricForContainer (containerName) {
    const containerMetrics = this.metricsData.filter(
      metric => metric.container_name === containerName
    )

    containerMetrics.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    )

    return containerMetrics.length > 0 ? containerMetrics[0] : null
  }

  getMetricHistoryForContainer (containerName, limit = 30) {
    const containerMetrics = this.metricsData.filter(
      metric => metric.container_name === containerName
    )

    containerMetrics.sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    )

    return containerMetrics.slice(-limit)
  }

  formatBytes (bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
    )
  }

  formatNumber (num) {
    return new Intl.NumberFormat().format(num)
  }

  formatDate (dateString) {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  formatDuration (startDateString) {
    const startDate = new Date(startDateString)
    const now = new Date()

    const diffMs = now - startDate
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ${diffHours % 24} hours`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ${diffMin % 60} min`
    } else {
      return `${diffMin} min`
    }
  }
}

const metricsService = new MetricsService()
