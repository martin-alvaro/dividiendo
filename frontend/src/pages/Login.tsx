import {
  useState,
  type FormEvent,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import { useStore } from '../lib/store'

export default function Login() {
  const {
    login,
  } = useStore()

  const navigate =
    useNavigate()

  const [error, setError] =
    useState('')

  const [
    loading,
    setLoading,
  ] = useState(false)

  const submit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    const form =
      new FormData(
        event.currentTarget,
      )

    const email =
      String(
        form.get('email') ?? '',
      )

    const password =
      String(
        form.get('password') ?? '',
      )

    const result =
      login(
        email,
        password,
      )

    if (result) {
      setError(result)
      setLoading(false)
      return
    }

    navigate('/home')
  }

  return (
    <main className="auth-page">
      <form
        className="auth-card"
        onSubmit={submit}
      >
        <Link
          className="back-button"
          to="/"
        >
          ←
        </Link>

        <div className="auth-logo">
          <span>Miti</span>Miti
        </div>

        <h1>
          Bienvenido de nuevo
        </h1>

        <p className="auth-description">
          Ingresá a tu cuenta para
          organizar gastos, grupos y
          pagos.
        </p>

        {error && (
          <p
            className="form-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <label>
          Email

          <input
            required
            name="email"
            type="email"
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </label>

        <label>
          Contraseña

          <input
            required
            name="password"
            type="password"
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            autoComplete="current-password"
          />
        </label>

        <button
          className="primary-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Ingresando...'
            : 'Iniciar sesión'}
        </button>

        <div className="demo-box">
          <strong>
            Cuentas de prueba
          </strong>

          <p>
            Martín:{' '}
            <b>
              martin@mitimiti.local
            </b>
            <br />
            Juan:{' '}
            <b>
              juan@example.com
            </b>
            <br />
            Sofía:{' '}
            <b>
              sofia@example.com
            </b>
          </p>

          <small>
            Contraseña de prueba:
            {' '}
            <b>123456</b>
          </small>
        </div>

        <p className="auth-footer">
          ¿No tenés cuenta?{' '}
          <Link to="/register">
            Crear cuenta
          </Link>
        </p>
      </form>
    </main>
  )
}