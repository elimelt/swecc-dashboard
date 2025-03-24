import React from 'react'
import { useContainerDetails } from '../../hooks/useContainerDetails'

interface LabelsPanelProps {
  containerName: string
}

const LabelsPanel: React.FC<LabelsPanelProps> = ({ containerName }) => {
  const { getContainerLabels } = useContainerDetails(containerName)
  const labels = getContainerLabels()

  if (Object.keys(labels).length === 0) {
    return null
  }

  return (
    <div id='labels-panel' className='metric-panel'>
      <h3>Container Labels</h3>
      <div id='labels-grid' className='metrics-grid'>
        {Object.entries(labels).map(([key, value], index) => {
          const displayKey = key.split('.').pop() || key
          const displayValue =
            value.length > 100 ? `${value.substring(0, 97)}...` : value

          return (
            <div key={index} className='metric-card'>
              <div className='metric-title'>{displayKey}</div>
              <div
                className='metric-value'
                title={value.length > 100 ? value : undefined}
              >
                {displayValue}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LabelsPanel
