import React, { useState, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'

const Login: React.FC = () => {
  const { login, error, clearError } = useAuth()
  const [showForm, setShowForm] = useState<boolean>(false)
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const formRef = useRef<HTMLDivElement>(null)

  const handleShowLogin = (): void => {
    setShowForm(true)
    clearError()
  }

  const handleCancel = (): void => {
    setShowForm(false)
    setUsername('')
    setPassword('')
    clearError()
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await login(username, password)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showForm) {
    return (
      <div id='login-form' className='auth-form' ref={formRef}>
        <h2>Login</h2>
        <form id='login' onSubmit={handleSubmit}>
          <div className='form-group'>
            <label htmlFor='login-username'>Username</label>
            <input
              type='text'
              id='login-username'
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className='form-group'>
            <label htmlFor='login-password'>Password</label>
            <input
              type='password'
              id='login-password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className='form-actions'>
            <button type='submit' disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
            <button
              type='button'
              className='cancel-btn'
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
          {error && (
            <p id='login-error' className='error-message'>
              {error}
            </p>
          )}
        </form>
      </div>
    )
  }

  return (
    <div id='logged-out-view'>
      <button id='show-login-btn' onClick={handleShowLogin}>
        Login
      </button>
    </div>
  )
}

export default Login
