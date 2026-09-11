import './App.css'

function App() {
  return (
    <main className="app">
      <section className="welcome-card">
        <div className="logo-mark">
          <div className="logo-person logo-person-left"></div>
          <div className="logo-person logo-person-right"></div>
        </div>

        <h1>
          Split<span>Up</span>
        </h1>

        <p className="tagline">
          Compartí experiencias,
          <br />
          no cuentas.
        </p>

        <div className="actions">
          <button className="primary-button">
            Iniciar sesión
          </button>

          <button className="secondary-button">
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