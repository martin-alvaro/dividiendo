import {
  CreditCard,
  LogOut,
  Mail,
  ReceiptText,
  Users,
  WalletCards,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { Shell } from '../components/Shell'
import { useStore } from '../lib/store'

const money = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value)

export default function Profile() {
  const { data, logout } = useStore()

  /*
   * Grupos de los que forma parte el usuario actual.
   */
  const myGroups = data.groups.filter((group) =>
    group.members.some(
      (member) => member.id === data.user.id,
    ),
  )

  /*
   * IDs de mis grupos.
   */
  const myGroupIds = new Set(
    myGroups.map((group) => group.id),
  )

  /*
   * Gastos pertenecientes a mis grupos.
   */
  const myExpenses = data.expenses.filter((expense) =>
    myGroupIds.has(expense.groupId),
  )

  /*
   * GASTO TOTAL:
   * sumamos solamente el dinero que realmente
   * pagó el usuario actual.
   *
   * Ejemplo:
   * Cena de $20.000
   * Martín pagó $12.000
   * Juan pagó $8.000
   *
   * En el perfil de Martín se suman $12.000,
   * no los $20.000 completos.
   */
  const totalSpent = myExpenses.reduce(
    (sum, expense) => {
      const myPayment = expense.payers.find(
        (payer) =>
          payer.memberId === data.user.id,
      )

      return sum + (myPayment?.amount ?? 0)
    },
    0,
  )

  /*
   * Cantidad de gastos registrados por el usuario.
   * Esto se conserva solamente para la tarjeta
   * de estadísticas superior.
   */
  const myRegisteredExpenses =
    myExpenses.filter(
      (expense) =>
        expense.uploadedById === data.user.id ||
        !expense.uploadedById,
    ).length

  /*
   * Pagos donde participa el usuario.
   * Se usa para la estadística superior.
   */
  const myPayments = data.payments.filter(
  (payment) => payment.fromId === data.user.id,)

  const firstName =
    data.user.name.trim().split(' ')[0] ||
    data.user.name

  const avatar =
    data.user.name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  return (
    <Shell title="Mi perfil">
      <main className="page profile-page-modern">
        {/* CABECERA */}

        <section className="profile-modern-hero">
          <div className="profile-modern-avatar">
            {avatar}
          </div>

          <div className="profile-modern-user">
            <span className="profile-modern-kicker">
              MI PERFIL
            </span>

            <h1>{data.user.name}</h1>

            <div className="profile-modern-email">
              <Mail size={16} />
              {data.user.email}
            </div>
          </div>

          <div className="profile-modern-badge">
            <WalletCards size={19} />
          </div>
        </section>

        {/* BIENVENIDA */}

        <section className="profile-modern-welcome">
          <div>
            <span>Todo en un solo lugar</span>

            <strong>
              Hola, {firstName}. Tené tus cuentas
              siempre organizadas.
            </strong>
          </div>

          <div className="profile-modern-welcome-icon">
            <ReceiptText size={23} />
          </div>
        </section>

        {/* ESTADÍSTICAS */}

        <section className="profile-modern-stats">
          <div className="profile-modern-stat-card">
            <div className="profile-modern-stat-icon green">
              <Users size={18} />
            </div>

            <div>
              <small>Grupos</small>
              <strong>{myGroups.length}</strong>
            </div>
          </div>

          <div className="profile-modern-stat-card">
            <div className="profile-modern-stat-icon purple">
              <ReceiptText size={18} />
            </div>

            <div>
              <small>Gastos</small>
              <strong>
                {myRegisteredExpenses}
              </strong>
            </div>
          </div>

          <div className="profile-modern-stat-card">
            <div className="profile-modern-stat-icon orange">
              <CreditCard size={18} />
            </div>

            <div>
              <small>Pagos realizados</small>
              <strong>{myPayments.length}</strong>
            </div>
          </div>
        </section>

        {/* TU ACTIVIDAD */}

        <section className="profile-modern-section">
          <div className="profile-modern-section-title">
            <div>
              <span>RESUMEN</span>
              <h2>Tu actividad</h2>
            </div>
          </div>

          <div className="profile-modern-summary">
            <div>
              <small>Gasto total</small>

              <strong>
                {money(totalSpent)}
              </strong>
            </div>
          </div>
        </section>

        {/* ACCIONES */}

        <section className="profile-modern-section">
          <div className="profile-modern-section-title">
            <div>
              <span>ACCESOS</span>
              <h2>Administrá tu cuenta</h2>
            </div>
          </div>

          <div className="profile-modern-actions">
            <Link
              to="/groups"
              className="profile-modern-action"
            >
              <div className="profile-modern-action-icon green">
                <Users size={18} />
              </div>

              <div>
                <strong>Mis grupos</strong>
                <small>
                  Ver y administrar tus grupos
                </small>
              </div>

              <span aria-hidden="true">›</span>
            </Link>

            <Link
              to="/payments"
              className="profile-modern-action"
            >
              <div className="profile-modern-action-icon blue">
                <CreditCard size={18} />
              </div>

              <div>
                <strong>Pagos</strong>
                <small>
                  Consultar deudas y pagos
                </small>
              </div>

              <span aria-hidden="true">›</span>
            </Link>
          </div>
        </section>

        {/* CERRAR SESIÓN */}

        <button
          type="button"
          className="profile-modern-logout"
          onClick={logout}
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>

        <p className="profile-modern-footer">
          Juntos todo es más fácil.
        </p>
      </main>
    </Shell>
  )
}