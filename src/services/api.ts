import axios from 'axios';
import { log } from '../utils/utils';
import { LOCAL_API_ENDPOINT, PROD_API_ENDPOINT, IS_DEV } from '../constants';

export const api = axios.create({
  baseURL: IS_DEV ? LOCAL_API_ENDPOINT : PROD_API_ENDPOINT,
  withCredentials: true,
});

export const getCSRF = async (): Promise<string | undefined> => {
  try {
    const response = await api.get('/auth/csrf/');
    const csrfToken = response.headers['x-csrftoken'] as string | undefined;
    if (csrfToken) {
      api.defaults.headers.common['X-CSRFToken'] = csrfToken;
      log('CSRF token updated:', csrfToken);
      return csrfToken;
    }
    return undefined;
  } catch (error) {
    log('Failed to fetch CSRF token:', error);
    return undefined;
  }
};

export const withCsrf = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  if (!api.defaults.headers.common['X-CSRFToken']) {
    await getCSRF();
  }
  return apiCall();
};

api.interceptors.request.use(async (config) => {
  if (config.url === '/auth/csrf/') {
    return config;
  }
  if (!api.defaults.headers.common['X-CSRFToken']) {
    await getCSRF();
  }
  return config;
});

export default api;