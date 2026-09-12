import {
  Bell,
  CreditCard,
  FilePlus2,
  Home,
  Plus,
  UserCircle,
  Users,
  X,
} from 'lucide-react'

import {
  NavLink,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import { useEffect, useState } from 'react'

import { useStore } from '../lib/store'

export function Shell({
  children,
  title,
  action,
}: {
  children: React.ReactNode
  title?: string
  action?: React.ReactNode
}) {
  const { data } = useStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [
    quickMenuOpen,
    setQuickMenuOpen,
  ] = useState(false)

  const pendingInvitations =
    data.invitations.filter(
      (invitation) =>
        invitation.toUserId === data.user.id &&
        invitation.status === 'pending',
    ).length

  useEffect(() => {
    setQuickMenuOpen(false)
  }, [location.pathname])

  const goTo = (path: string) => {
    setQuickMenuOpen(false)
    navigate(path)
  }

  return (
    <main className="shell">

      {/* =================================================
          TOPBAR
      ================================================== */}

      <header className="topbar">
        <button
          className="brand"
          onClick={() => navigate('/home')}
        >
          <span>Miti</span>Miti
        </button>

        {title && <h1>{title}</h1>}

        <div className="top-action">

          {action}

          <button
            className="notification-button"
            title="Notificaciones"
            onClick={() =>
              navigate('/notifications')
            }
          >
            <Bell size={22} strokeWidth={2.2} />

            {pendingInvitations > 0 && (
              <span className="notification-badge">
                {pendingInvitations}
              </span>
            )}
          </button>

          <button
            className="avatar"
            title="Ver perfil"
            onClick={() => navigate('/profile')}
          >
            {data.user.name[0]}
          </button>

        </div>
      </header>

      {/* =================================================
          CONTENIDO
      ================================================== */}

      {children}

      {/* =================================================
          OVERLAY
      ================================================== */}

      {quickMenuOpen && (
        <div
          className="quick-menu-overlay"
          onClick={() => setQuickMenuOpen(false)}
        />
      )}

      {/* =================================================
          MENÚ +
      ================================================== */}

      <div
        className={`quick-menu ${
          quickMenuOpen ? 'open' : ''
        }`}
      >
        <button
          type="button"
          className="quick-menu-item expense"
          onClick={() => goTo('/expenses/new')}
        >
          <span className="quick-menu-icon">
            <FilePlus2
              size={24}
              strokeWidth={2.2}
            />
          </span>

          <span>
            <strong>Nuevo gasto</strong>
            <small>Registrá una compra</small>
          </span>
        </button>

        <button
          type="button"
          className="quick-menu-item payment"
          onClick={() => goTo('/payments')}
        >
          <span className="quick-menu-icon">
            <CreditCard
              size={24}
              strokeWidth={2.2}
            />
          </span>

          <span>
            <strong>Registrar pago</strong>
            <small>Saldá una deuda</small>
          </span>
        </button>

        <button
          type="button"
          className="quick-menu-item groups"
          onClick={() => goTo('/groups')}
        >
          <span className="quick-menu-icon">
            <Users
              size={24}
              strokeWidth={2.2}
            />
          </span>

          <span>
            <strong>Mis grupos</strong>
            <small>
              Ver y administrar grupos
            </small>
          </span>
        </button>
      </div>

      {/* =================================================
          BOTTOM NAV
      ================================================== */}

      <nav className="bottom-nav">

        <NavLink
          to="/home"
          className={({ isActive }) =>
            isActive ? 'active' : undefined
          }
        >
          <span>
            <Home
              size={24}
              strokeWidth={2.1}
            />
          </span>

          <small>Inicio</small>
        </NavLink>

        <NavLink
          to="/groups"
          className={({ isActive }) =>
            isActive ? 'active' : undefined
          }
        >
          <span>
            <Users
              size={24}
              strokeWidth={2.1}
            />
          </span>

          <small>Grupos</small>
        </NavLink>

        {/* BOTÓN + */}

        <button
          type="button"
          className={`nav-add ${
            quickMenuOpen ? 'menu-open' : ''
          }`}
          onClick={() =>
            setQuickMenuOpen(
              (current) => !current,
            )
          }
          aria-label="Abrir acciones rápidas"
          aria-expanded={quickMenuOpen}
        >
          <span>
            {quickMenuOpen ? (
              <X
                size={32}
                strokeWidth={2.4}
              />
            ) : (
              <Plus
                size={32}
                strokeWidth={2.4}
              />
            )}
          </span>
        </button>

        <NavLink
          to="/payments"
          className={({ isActive }) =>
            isActive ? 'active' : undefined
          }
        >
          <span>
            <CreditCard
              size={24}
              strokeWidth={2.1}
            />
          </span>

          <small>Pagos</small>
        </NavLink>

        <NavLink
          to="/profile"
          className={({ isActive }) =>
            isActive ? 'active' : undefined
          }
        >
          <span>
            <UserCircle
              size={24}
              strokeWidth={2.1}
            />
          </span>

          <small>Perfil</small>
        </NavLink>

      </nav>
    </main>
  )
}