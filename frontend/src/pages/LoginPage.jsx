import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import {
  FormBody,
  FormButton,
  FormCard,
  FormField,
  FormFooter,
  FormHeader,
  FormInput,
} from '../components/form'
import GalaxyBackground from '../components/layout/GalaxyBackground'
import BootstrapIcon from '../components/icons/BootstrapIcon'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { validateLoginForm } from '../utils/formValidation'
import { usePageTitle } from '../utils/pageTitle'

function LoginPage() {
  usePageTitle('Login')
  const { login, isAuthenticated, isLoading, isInitializing } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [clientPan, setClientPan] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const redirectTo = location.state?.from || '/overview'

  if (isInitializing) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const validationMessage = validateLoginForm({ clientPan, password })
    if (validationMessage) {
      showToast(validationMessage)
      return
    }

    try {
      await login(clientPan, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const message =
        err.response?.data?.detail || 'Unable to sign in. Please try again.'
      showToast(message)
    }
  }

  const handlePanChange = (event) => {
    setClientPan(event.target.value.toUpperCase())
  }

  return (
    <GalaxyBackground className="flex min-h-screen items-center">
      <div className="w-full max-w-md">
        <FormCard onSubmit={handleSubmit}>
          <FormHeader title="Client Login" />

          <FormBody>
            <FormField label="Client PAN" htmlFor="clientPan">
              <FormInput
                id="clientPan"
                name="clientPan"
                type="text"
                value={clientPan}
                onChange={handlePanChange}
                maxLength={10}
                placeholder="ABCDE1234F"
                aria-required="true"
                disabled={isLoading}
              />
            </FormField>

            <FormField label="Password" htmlFor="password">
              <div className="relative">
                <FormInput
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="pr-10"
                  aria-required="true"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <BootstrapIcon icon={showPassword ? 'bi-eye-slash' : 'bi-eye'} />
                </button>
              </div>
            </FormField>
          </FormBody>

          <FormFooter>
            <FormButton disabled={isLoading}>
              {isLoading ? 'Signing in…' : 'Sign in'}
            </FormButton>
          </FormFooter>
        </FormCard>
      </div>
    </GalaxyBackground>
  )
}

export default LoginPage
