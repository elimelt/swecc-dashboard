function parseDate (dateString) {
  if (dateString instanceof Date) {
    return dateString
  }
  return new Date(dateString)
}

function formatDateForAPI (date, includeTime = true) {
  const parsedDate = parseDate(date)

  if (includeTime) {
    return parsedDate.toISOString()
  } else {
    return parsedDate.toISOString().split('T')[0]
  }
}

function formatDateForDisplay (date, includeTime = false) {
  const parsedDate = parseDate(date)

  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }

  if (includeTime) {
    options.hour = '2-digit'
    options.minute = '2-digit'
  }

  return parsedDate.toLocaleDateString(undefined, options)
}

function getCookie (name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
  return ''
}

function formatBytes (bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i]
}

function formatNumber (num) {
  return new Intl.NumberFormat().format(num)
}

function log (...args) {
  if (IS_DEV) {
    console.log(...args)
  }
}

function debounce (func, wait) {
  let timeout
  return function executedFunction (...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

function formatDuration (startDateString) {
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
