import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { formatBytes, formatNumber, formatDuration } from '../utils/utils'
import { log } from '../utils/utils'

export interface ContainerDetails {
  name: string
  short_id?: string
  created_at?: string
  image?: string
  command?: string
  ports?: Record<string, Array<{ HostIp: string; HostPort: string }>>
  labels?: Record<string, string>
  [key: string]: unknown
}

export interface PortMapping {
  containerPort: string
  hostIp: string
  hostPort: string
}

interface UseContainerDetailsReturn {
  details: ContainerDetails | null
  loading: boolean
  error: string | null
  fetchDetails: () => Promise<ContainerDetails | null>
  getPortMappings: () => PortMapping[]
  getContainerLabels: () => Record<string, string>
  formatDate: (dateString: string) => string
  formatBytes: (bytes: number, decimals?: number) => string
  formatNumber: (num: number) => string
  formatDuration: (startDateString: string) => string
}

export function useContainerDetails (
  containerName: string
): UseContainerDetailsReturn {
  const [details, setDetails] = useState<ContainerDetails | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDetails =
    useCallback(async (): Promise<ContainerDetails | null> => {
      if (!containerName) return null

      try {
        setLoading(true)
        setError(null)

        const response = await api.get<ContainerDetails>(
          `/metrics/containers/${containerName}/`
        )

        if (response.status === 200) {
          setDetails(response.data)
          log(`Fetched details for ${containerName}`)
          return response.data
        }

        return null
      } catch (error) {
        log(`Error fetching container details for ${containerName}:`, error)
        setError(`Failed to fetch details for ${containerName}`)
        return null
      } finally {
        setLoading(false)
      }
    }, [containerName])

  useEffect(() => {
    if (containerName) {
      fetchDetails()
    }
  }, [containerName, fetchDetails])

  const getPortMappings = useCallback((): PortMapping[] => {
    if (!details || !details.ports) {
      return []
    }

    const portMappings: PortMapping[] = []

    for (const [containerPort, hostBindings] of Object.entries(details.ports)) {
      for (const binding of hostBindings) {
        portMappings.push({
          containerPort,
          hostIp:
            binding.HostIp === '0.0.0.0' ? 'All Interfaces' : binding.HostIp,
          hostPort: binding.HostPort
        })
      }
    }

    return portMappings
  }, [details])

  const getContainerLabels = useCallback((): Record<string, string> => {
    if (!details || !details.labels) {
      return {}
    }

    const importantLabels: Record<string, string> = {}
    const labelsOfInterest = [
      'build_version',
      'org.opencontainers.image.version',
      'org.opencontainers.image.title',
      'org.opencontainers.image.description'
    ]

    for (const label of labelsOfInterest) {
      if (details.labels[label]) {
        importantLabels[label] = details.labels[label]
      }
    }

    if (Object.keys(importantLabels).length === 0 && details.labels) {
      return Object.fromEntries(
        Object.entries(details.labels as Record<string, string>)
      )
    }

    return importantLabels
  }, [details])

  const formatDate = useCallback((dateString: string): string => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
  }, [])

  return {
    details,
    loading,
    error,
    fetchDetails,
    getPortMappings,
    getContainerLabels,
    formatDate,
    formatBytes,
    formatNumber,
    formatDuration
  }
}
