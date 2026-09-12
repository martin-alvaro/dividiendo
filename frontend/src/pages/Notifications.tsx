import {
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Users,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Shell } from '../components/Shell'
import { useStore } from '../lib/store'

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

export default function Notifications() {
  const {
    data,
    acceptInvitation,
    rejectInvitation,
  } = useStore()

  const pendingInvitations = data.invitations.filter(
    invitation =>
      invitation.toUserId === data.user.id &&
      invitation.status === 'pending',
  )

  const handledInvitations = data.invitations
    .filter(
      invitation =>
        invitation.toUserId === data.user.id &&
        invitation.status !== 'pending',
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    )

  const getSender = (userId: string) =>
    data.accounts.find(account => account.id === userId)

  const getGroup = (groupId: string) =>
    data.groups.find(group => group.id === groupId)

  return (
    <Shell title="Notificaciones">
      <main className="page notifications-page-modern">

        {/* CABECERA */}
        <section className="notifications-modern-hero">
          <div className="notifications-modern-icon">
            <Bell size={24} />
          </div>

          <div>
            <span className="notifications-modern-kicker">
              NOTIFICACIONES
            </span>

            <h1>Tus novedades</h1>

            <p>
              Invitaciones y novedades importantes de MitiMiti.
            </p>
          </div>
        </section>

        {/* INVITACIONES */}
        <section className="notifications-modern-section">

          <div className="notifications-modern-heading">
            <div>
              <span>PENDIENTES</span>
              <h2>Invitaciones a grupos</h2>
            </div>

            <span className="notifications-modern-count">
              {pendingInvitations.length}
            </span>
          </div>

          {pendingInvitations.length === 0 ? (
            <div className="notifications-modern-empty">
              <div className="notifications-modern-empty-icon">
                <CheckCircle2 size={24} />
              </div>

              <strong>No tenés invitaciones pendientes</strong>

              <p>
                Cuando alguien te invite a un grupo,
                vas a verlo acá.
              </p>
            </div>
          ) : (
            <div className="notifications-modern-list">

              {pendingInvitations.map(invitation => {
                const sender = getSender(
                  invitation.fromUserId,
                )

                const group = getGroup(
                  invitation.groupId,
                )

                if (!group) return null

                return (
                  <article
                    key={invitation.id}
                    className="notification-modern-card"
                  >

                    <div className="notification-modern-avatar">
                      {sender?.name
                        ?.charAt(0)
                        .toUpperCase() ?? '?'}
                    </div>

                    <div className="notification-modern-content">

                      <div className="notification-modern-title">
                        <strong>
                          {sender?.name ?? 'Alguien'}
                        </strong>

                        <span>te invitó a un grupo</span>
                      </div>

                      <div className="notification-modern-group">
                        <span className="notification-modern-group-emoji">
                          {group.emoji}
                        </span>

                        <div>
                          <strong>{group.name}</strong>

                          <small>
                            {group.members.length}{' '}
                            {group.members.length === 1
                              ? 'integrante'
                              : 'integrantes'}
                          </small>
                        </div>
                      </div>

                      <div className="notification-modern-date">
                        <Clock3 size={16} />
                        <span>
                          {formatDate(invitation.createdAt)}
                        </span>
                      </div>

                      <div className="notification-modern-actions">

                        <button
                          type="button"
                          className="notification-accept"
                          onClick={() =>
                            acceptInvitation(invitation.id)
                          }
                        >
                          <Check size={16} />
                          Aceptar
                        </button>

                        <button
                          type="button"
                          className="notification-reject"
                          onClick={() =>
                            rejectInvitation(invitation.id)
                          }
                        >
                          <X size={16} />
                          Rechazar
                        </button>

                      </div>

                    </div>

                  </article>
                )
              })}

            </div>
          )}

        </section>

        {/* ESTADO */}
        <section className="notifications-modern-info">

          <div className="notifications-modern-info-icon">
            <Users size={20} />
          </div>

          <div>
            <strong>¿Cómo funcionan las invitaciones?</strong>

            <p>
              Cuando alguien te invita a un grupo,
              primero tenés que aceptarlo. Recién después
              vas a poder ver sus gastos y movimientos.
            </p>
          </div>

        </section>

        {/* HISTORIAL */}
        {handledInvitations.length > 0 && (
          <section className="notifications-modern-section">

            <div className="notifications-modern-heading">
              <div>
                <span>HISTORIAL</span>
                <h2>Invitaciones anteriores</h2>
              </div>

              <span className="notifications-modern-count">
                {handledInvitations.length}
              </span>
            </div>

            <div className="notifications-modern-history">

              {handledInvitations.map(invitation => {
                const sender = getSender(
                  invitation.fromUserId,
                )

                const group = getGroup(
                  invitation.groupId,
                )

                const accepted =
                  invitation.status === 'accepted'

                return (
                  <article
                    key={invitation.id}
                    className="notification-history-card"
                  >

                    <div
                      className={`notification-history-icon ${
                        accepted
                          ? 'accepted'
                          : 'rejected'
                      }`}
                    >
                      {accepted ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        <X size={18} />
                      )}
                    </div>

                    <div className="notification-history-content">

                      <strong>
                        {accepted
                          ? 'Aceptaste una invitación'
                          : 'Rechazaste una invitación'}
                      </strong>

                      <span>
                        {sender?.name ?? 'Usuario'} ·{' '}
                        {group?.emoji} {group?.name ?? 'Grupo'}
                      </span>

                      <small>
                        {formatDate(invitation.createdAt)}
                      </small>

                    </div>

                    {accepted && group && (
                      <Link
                        to={`/groups/${group.id}`}
                        className="notification-history-link"
                      >
                        Ver grupo
                      </Link>
                    )}

                  </article>
                )
              })}

            </div>

          </section>
        )}

      </main>
    </Shell>
  )
}