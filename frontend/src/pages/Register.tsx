import {
  useState,
  type FormEvent,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import { useStore } from '../lib/store'

export default function Register() {
  const {
    register,
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

    const name =
      String(
        form.get('name') ?? '',
      )

    const email =
      String(
        form.get('email') ?? '',
      )

    const password =
      String(
        form.get('password') ?? '',
      )

    const confirmPassword =
      String(
        form.get(
          'confirmPassword',
        ) ?? '',
      )

    if (
      password !==
      confirmPassword
    ) {
      setError(
        'Las contraseñas no coinciden.',
      )
      setLoading(false)
      return
    }

    const result =
      register(
        name,
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
          Creá tu cuenta
        </h1>

        <p className="auth-description">
          Empezá a compartir gastos
          sin perder de vista quién
          pagó y quién debe.
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
          Nombre

          <input
            required
            name="name"
            minLength={2}
            placeholder="Tu nombre"
            autoComplete="name"
          />
        </label>

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
            autoComplete="new-password"
          />
        </label>

        <label>
          Repetir contraseña

          <input
            required
            name="confirmPassword"
            type="password"
            minLength={6}
            placeholder="Repetí tu contraseña"
            autoComplete="new-password"
          />
        </label>

        <button
          className="primary-button"
          type="submit"
          disabled={loading}
        >
          {loading
            ? 'Creando cuenta...'
            : 'Crear cuenta'}
        </button>

        <p className="auth-footer">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </main>
  )
}