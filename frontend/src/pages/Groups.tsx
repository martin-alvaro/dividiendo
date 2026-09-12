import {
  ArrowRight,
  Plus,
  Users,
  X,
} from 'lucide-react'
import {
  useState,
  type FormEvent,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import { Shell } from '../components/Shell'
import { useStore } from '../lib/store'
import type { Member } from '../lib/types'

export default function Groups() {
  const {
    data,
    addGroup,
  } = useStore()

  const nav = useNavigate()

  const [open, setOpen] = useState(false)

  /*
   * Mostrar solamente los grupos
   * de los que el usuario forma parte.
   */
  const visibleGroups =
    data.groups.filter(
      (group) =>
        group.members.some(
          (member) =>
            member.id === data.user.id,
        ),
    )

  const submit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const form =
      new FormData(
        event.currentTarget,
      )

    const name = String(
      form.get('name') ?? '',
    ).trim()

    if (!name) {
      return
    }

    const member: Member = {
      id: data.user.id,
      name: data.user.name,
      email: data.user.email,
      color: '#15803d',
    }

    const group = addGroup(
      name,
      String(
        form.get('emoji') ||
          '👥',
      ),
      [member],
    )

    setOpen(false)

    nav(
      `/groups/${group.id}`,
    )
  }

  return (
    <Shell
      title="Mis grupos"
      action={
        <button
          type="button"
          className="icon-button"
          onClick={() =>
            setOpen(true)
          }
          aria-label="Crear grupo"
        >
          <Plus size={21} />
        </button>
      }
    >
      <main className="page groups-page-modern">

        {/* CABECERA */}
        <section className="groups-modern-header">

          <div className="groups-modern-header-icon">
            <Users size={23} />
          </div>

          <div>
            <span>
              MIS GRUPOS
            </span>

            <h1>
              Tus grupos
            </h1>

            <p>
              Organizá gastos y compartí
              cuentas con los demás.
            </p>
          </div>

        </section>

        {/* RESUMEN */}
        <section className="groups-modern-summary">

          <div>
            <strong>
              {visibleGroups.length}
            </strong>

            <span>
              {visibleGroups.length === 1
                ? 'grupo'
                : 'grupos'}
            </span>
          </div>

          <div>
            <strong>
              {
                visibleGroups.reduce(
                  (total, group) =>
                    total +
                    group.members.length,
                  0,
                )
              }
            </strong>

            <span>
              integrantes
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setOpen(true)
            }
          >
            <Plus size={17} />
            Crear grupo
          </button>

        </section>

        {/* LISTA */}
        <section className="groups-modern-section">

          <div className="groups-modern-section-title">
            <div>
              <span>
                TUS ESPACIOS
              </span>

              <h2>
                Mis grupos
              </h2>
            </div>

            <span className="groups-modern-count">
              {visibleGroups.length}
            </span>
          </div>

          {visibleGroups.length > 0 ? (
            <div className="groups-modern-grid">

              {visibleGroups.map(
                (group, index) => (
                  <Link
                    to={`/groups/${group.id}`}
                    className="modern-group-card"
                    key={group.id}
                    style={{
                      animationDelay:
                        `${index * 0.06}s`,
                    }}
                  >

                    <div className="modern-group-top">

                      <div className="group-emoji">
                        {group.emoji}
                      </div>

                      <div className="group-arrow">
                        <ArrowRight
                          size={17}
                        />
                      </div>

                    </div>

                    <h3 className="modern-group-name">
                      {group.name}
                    </h3>

                    <p className="modern-group-caption">
                      {group.members.length}{' '}
                      {group.members.length === 1
                        ? 'integrante'
                        : 'integrantes'}
                    </p>

                    <div className="modern-group-progress">
                      <span />
                    </div>

                    <div className="modern-group-bottom">

                      <div className="avatar-stack">
                        {group.members
                          .slice(0, 4)
                          .map(
                            (member) => (
                              <span
                                key={member.id}
                                className="stack-avatar"
                                style={{
                                  background:
                                    member.color,
                                }}
                                title={
                                  member.name
                                }
                              >
                                {member.name
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>
                            ),
                          )}

                        {group.members.length >
                          4 && (
                          <span className="stack-more">
                            +
                            {group.members.length -
                              4}
                          </span>
                        )}
                      </div>

                      <small className="group-members-label">
                        Ver grupo
                      </small>

                    </div>

                  </Link>
                ),
              )}

            </div>
          ) : (
            <div className="groups-modern-empty">

              <div className="groups-modern-empty-icon">
                <Users size={25} />
              </div>

              <strong>
                Todavía no tenés grupos
              </strong>

              <p>
                Creá uno para empezar a
                compartir gastos y organizar
                cuentas.
              </p>

              <button
                type="button"
                onClick={() =>
                  setOpen(true)
                }
              >
                <Plus size={17} />
                Crear mi primer grupo
              </button>

            </div>
          )}

        </section>

        {/* MODAL */}
        {open && (
          <div
            className="groups-modern-modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setOpen(false)
              }
            }}
          >
            <form
              className="groups-modern-modal"
              onSubmit={submit}
            >

              <div className="groups-modern-modal-top">

                <div>
                  <span>
                    NUEVO GRUPO
                  </span>

                  <h2>
                    Crear grupo
                  </h2>
                </div>

                <button
                  type="button"
                  className="groups-modern-close"
                  onClick={() =>
                    setOpen(false)
                  }
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>

              </div>

              <p className="groups-modern-modal-description">
                Vas a ser el primer integrante.
                Después podés invitar a otras
                personas desde el grupo.
              </p>

              <label className="groups-modern-field">
                <span>
                  Nombre del grupo
                </span>

                <input
                  autoFocus
                  name="name"
                  required
                  placeholder="Ej. Viaje a Brasil"
                />
              </label>

              <label className="groups-modern-field">
                <span>
                  Ícono
                </span>

                <input
                  name="emoji"
                  defaultValue="👥"
                  maxLength={2}
                  placeholder="👥"
                />
              </label>

              <div className="groups-modern-modal-preview">

                <div className="group-emoji">
                  👥
                </div>

                <div>
                  <strong>
                    Así se verá tu grupo
                  </strong>

                  <small>
                    Podés cambiar el nombre
                    y el ícono.
                  </small>
                </div>

              </div>

              <button
                className="primary-button groups-modern-submit"
                type="submit"
              >
                <Plus size={18} />
                Crear grupo
              </button>

            </form>
          </div>
        )}

      </main>
    </Shell>
  )
}