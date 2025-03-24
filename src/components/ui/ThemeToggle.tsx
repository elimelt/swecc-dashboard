import React from 'react'
import { useTheme } from '../../context/ThemeContext'

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button id='theme-toggle' onClick={toggleTheme}>
      {theme === 'dark' ? '🌙' : '☀️'} Toggle{' '}
      {theme === 'dark' ? 'Light' : 'Dark'} Mode
    </button>
  )
}

export default ThemeToggle
