const LOCAL_API_ENDPOINT = 'http://localhost'
const PROD_API_ENDPOINT = 'https://api.swecc.org'

const IS_DEV =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'

const API_BASE_URL = IS_DEV ? LOCAL_API_ENDPOINT : PROD_API_ENDPOINT

const CACHE_DURATION = 5 * 60 * 1000
const DEFAULT_REFRESH_INTERVAL = 30
const REFRESH_INTERVALS = [
  { value: 0, label: 'Off' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' }
]
