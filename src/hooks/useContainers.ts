import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { log } from '../utils/utils';

export type ContainerStatus = 'running' | 'stopped' | 'error' | 'unknown';

interface UseContainersReturn {
  containers: Record<string, ContainerStatus>;
  containerNames: string[];
  loading: boolean;
  error: string | null;
  fetchContainers: () => Promise<boolean>;
  getContainerStatus: (containerName: string) => ContainerStatus;
}

export function useContainers(): UseContainersReturn {
  const [containers, setContainers] = useState<Record<string, ContainerStatus>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContainers = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get<Record<string, ContainerStatus>>('/metrics/containers/');

      if (response.status === 200) {
        setContainers(response.data);
        log(`Fetched ${Object.keys(response.data).length} containers`);
        return true;
      }

      return false;
    } catch (error) {
      log('Error fetching containers:', error);
      setError('Failed to fetch containers. Please try again later.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  const getContainerStatus = useCallback(
    (containerName: string): ContainerStatus => {
      return containers[containerName] || 'unknown';
    },
    [containers]
  );

  const containerNames = Object.keys(containers).sort();

  return {
    containers,
    containerNames,
    loading,
    error,
    fetchContainers,
    getContainerStatus,
  };
}