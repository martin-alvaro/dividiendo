import { useNavigate } from 'react-router-dom'
import './App.css'

function App() {
  const navigate = useNavigate()

  return (
    <main className="app">
      <section className="welcome-card">
        <div className="logo-mark">
          <div className="logo-person logo-person-left"></div>
          <div className="logo-person logo-person-right"></div>
        </div>

        <h1>
          Miti<span>Miti</span>
        </h1>

        <p className="tagline">
          Compartí experiencias,
          <br />
          no cuentas.
        </p>

        <div className="actions">
          <button
            className="primary-button"
            onClick={() => navigate('/login')}
          >
            Iniciar sesión
          </button>

          <button
            className="secondary-button"
            onClick={() => navigate('/register')}
          >
            Crear cuenta
          </button>
        </div>

        <p className="footer-text">
          Juntos todo es más fácil.
        </p>
      </section>
    </main>
  )
}

export default App