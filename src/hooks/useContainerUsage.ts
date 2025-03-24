import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { log } from '../utils/utils';
import { POLL_USAGE } from '../constants';

export interface UsageData {
  timestamp: string;
  memory_usage_bytes: number;
  memory_limit_bytes: number;
  memory_percent: number;
  cpu_percent: number;
  online_cpus: number;
  system_cpu_usage: number;
  disk_read_bytes: number;
  disk_write_bytes: number;
  disk_reads: number;
  disk_writes: number;
  nw_rx_bytes: number;
  nw_tx_bytes: number;
  nw_rx_packets: number;
  nw_tx_packets: number;
  nw_rx_errors: number;
  nw_tx_errors: number;
  [key: string]: unknown;
}

interface UseContainerUsageReturn {
  usageData: UsageData[];
  loading: boolean;
  error: string | null;
  fetchUsage: () => Promise<UsageData[] | null>;
  latestUsage: UsageData | null;
}

export function useContainerUsage(
  containerName: string,
  refreshInterval?: number
): UseContainerUsageReturn {
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latestUsage, setLatestUsage] = useState<UsageData | null>(null);

  const fetchUsage = useCallback(async (): Promise<UsageData[] | null> => {
    if (!containerName || !POLL_USAGE) {
      setUsageData([]);
      setLatestUsage(null);
      return [];
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get<UsageData[]>(`/metrics/usage/${containerName}/`);

      if (response.status === 200) {
        if (Array.isArray(response.data) && response.data.length > 0) {
          setUsageData(response.data);
          
                    const latestData = [...response.data];
          latestData.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setLatestUsage(latestData[0] || null);
          
          log(`Fetched ${response.data.length} usage records for ${containerName}`);
          return response.data;
        } else {
          log(`No usage data available for ${containerName}`);
          setUsageData([]);
          setLatestUsage(null);
          return [];
        }
      }

      return null;
    } catch (error) {
      log(`Error fetching usage for ${containerName}:`, error);
      setError(`Failed to fetch usage for ${containerName}`);
      setUsageData([]);
      setLatestUsage(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [containerName]);

  useEffect(() => {
    if (containerName) {
      fetchUsage();
    }
  }, [containerName, fetchUsage]);

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0 || !containerName) return;

    const timer = setInterval(() => {
      fetchUsage();
    }, refreshInterval * 1000);

    return () => {
      clearInterval(timer);
    };
  }, [containerName, refreshInterval, fetchUsage]);

  return {
    usageData,
    loading,
    error,
    fetchUsage,
    latestUsage,
  };
}