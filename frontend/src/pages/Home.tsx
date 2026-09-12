import { Link } from 'react-router-dom'
import { useMemo } from 'react'

import { Shell } from '../components/Shell'
import { balances } from '../lib/balances'
import { useStore } from '../lib/store'

const money = (value: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 2,
  }).format(value)

function AnimatedNumber({
  value,
  prefix = '',
}: {
  value: number
  prefix?: string
}) {
  return (
    <span
      key={`${prefix}-${value}`}
      className="animated-money"
    >
      {prefix}
      {money(value)}
    </span>
  )
}

export default function Home() {
  const { data } = useStore()

  /*
   * =====================================================
   * MIS GRUPOS
   * =====================================================
   */

  const myGroups = useMemo(
    () =>
      data.groups.filter(
        (group) =>
          group.members.some(
            (member) =>
              member.id ===
              data.user.id,
          ),
      ),
    [data.groups, data.user.id],
  )

  /*
   * =====================================================
   * SALDO GLOBAL
   * =====================================================
   */

  let totalBalance = 0
  let totalOwed = 0
  let totalReceivable = 0
  let totalSpent = 0

  const groupStats = myGroups.map(
    (group) => {
      const expenses =
        data.expenses.filter(
          (expense) =>
            expense.groupId ===
            group.id,
        )

      const payments =
        data.payments.filter(
          (payment) =>
            payment.groupId ===
            group.id,
        )

      const groupBalances =
        balances(
          group.members,
          expenses,
          payments,
        )

      const myBalance =
        groupBalances[
          data.user.id
        ] ?? 0

      const groupTotal =
        expenses.reduce(
          (
            sum,
            expense,
          ) =>
            sum +
            expense.amount,
          0,
        )

      totalSpent +=
        groupTotal

      totalBalance +=
        myBalance

      if (myBalance < 0) {
        totalOwed +=
          Math.abs(
            myBalance,
          )
      } else {
        totalReceivable +=
          myBalance
      }

      return {
        group,
        expenses,
        payments,
        total:
          groupTotal,
        balance:
          myBalance,
      }
    },
  )

  totalBalance =
    Math.round(
      totalBalance * 100,
    ) / 100

  totalOwed =
    Math.round(
      totalOwed * 100,
    ) / 100

  totalReceivable =
    Math.round(
      totalReceivable * 100,
    ) / 100

  totalSpent =
    Math.round(
      totalSpent * 100,
    ) / 100

  /*
   * =====================================================
   * ACTIVIDAD RECIENTE
   * =====================================================
   */

  const myGroupIds =
    new Set(
      myGroups.map(
        (group) =>
          group.id,
      ),
    )

  const recentExpenses =
    data.expenses
      .filter((expense) =>
        myGroupIds.has(
          expense.groupId,
        ),
      )
      .sort(
        (a, b) =>
          new Date(
            b.createdAt,
          ).getTime() -
          new Date(
            a.createdAt,
          ).getTime(),
      )
      .slice(0, 6)

  /*
   * =====================================================
   * GRUPO CON MÁS GASTOS
   * =====================================================
   */

  const maxGroupTotal =
    Math.max(
      ...groupStats.map(
        (item) =>
          item.total,
      ),
      1,
    )

  /*
   * =====================================================
   * SALUDO
   * =====================================================
   */

  const firstName =
    data.user.name
      .trim()
      .split(' ')[0] ||
    data.user.name

  const positive =
    totalBalance >= 0

  return (
    <Shell>
      <section className="page home">

        {/* =================================================
            HEADER DE HOME
        ================================================== */}

        <section className="home-welcome">

          <div>
            <span className="home-kicker">
              MitiMiti
            </span>

            <h2>
              Hola, {firstName} 👋
            </h2>

            <p>
              {myGroups.length ===
              0
                ? 'Empezá creando tu primer grupo.'
                : 'Mirá cómo vienen tus cuentas.'}
            </p>
          </div>

          <div className="home-floating-icon">
            💚
          </div>

        </section>

        {/* =================================================
            SALDO PRINCIPAL
        ================================================== */}

        <section
          className={`home-main-balance ${
            positive
              ? 'balance-positive'
              : 'balance-negative'
          }`}
        >
          <div className="balance-glow" />

          <div className="home-main-balance-content">

            <span>
              Tu saldo neto
            </span>

            <strong>
              <AnimatedNumber
                value={
                  totalBalance
                }
                prefix={
                  positive
                    ? '+'
                    : ''
                }
              />
            </strong>

            <p>
              {positive
                ? 'Todo está equilibrado'
                : 'Tenés pagos pendientes'}
            </p>

          </div>

          <div className="home-balance-orb">
            {positive
              ? '↑'
              : '↓'}
          </div>
        </section>

        {/* =================================================
            DOS TARJETAS
        ================================================== */}

        <section className="home-summary-grid">

          <article className="home-summary-card receivable">
            <div className="summary-icon">
              ↗
            </div>

            <div>
              <small>
                Te deben
              </small>

              <strong>
                {money(
                  totalReceivable,
                )}
              </strong>

              <span>
                A tu favor
              </span>
            </div>
          </article>

          <article className="home-summary-card owed">
            <div className="summary-icon">
              ↘
            </div>

            <div>
              <small>
                Debés
              </small>

              <strong>
                {money(
                  totalOwed,
                )}
              </strong>

              <span>
                Pendiente
              </span>
            </div>
          </article>

        </section>

        {/* =================================================
            ACCIONES RÁPIDAS
        ================================================== */}

        <section className="quick-actions">

          <Link
            to="/expenses/new"
            className="quick-action main"
          >
            <span className="quick-action-icon">
              🧾
            </span>

            <span>
              <strong>
                Nuevo gasto
              </strong>

              <small>
                Registrá un gasto
              </small>
            </span>

            <b>
              →
            </b>
          </Link>

          <Link
            to="/groups"
            className="quick-action"
          >
            <span className="quick-action-icon">
              👥
            </span>

            <span>
              <strong>
                Mis grupos
              </strong>

              <small>
                Ver todos
              </small>
            </span>

            <b>
              →
            </b>
          </Link>

        </section>

        {/* =================================================
            MIS GRUPOS
        ================================================== */}

        <div className="home-section-heading">
          <div>
            <span>
              Tus espacios
            </span>

            <h2>
              Mis grupos
            </h2>
          </div>

          <Link to="/groups">
            Ver todos
          </Link>
        </div>

        {groupStats.length >
        0 ? (
          <div className="home-group-grid">

            {groupStats
              .slice(0, 4)
              .map(
                ({
                  group,
                  total,
                  balance,
                }) => (
                  <Link
                    to={`/groups/${group.id}`}
                    key={
                      group.id
                    }
                    className="modern-group-card"
                  >

                    <div className="modern-group-top">

                      <div className="group-emoji">
                        {group.emoji}
                      </div>

                      <span className="group-arrow">
                        ↗
                      </span>

                    </div>

                    <div className="modern-group-name">
                      {group.name}
                    </div>

                    <div className="modern-group-total">
                      {money(total)}
                    </div>

                    <span className="modern-group-caption">
                      gastados
                    </span>

                    <div className="modern-group-progress">
                      <span
                        style={{
                          width: `${Math.max(
                            8,
                            Math.min(
                              100,
                              (total /
                                maxGroupTotal) *
                                100,
                            ),
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="modern-group-bottom">

                      <div className="avatar-stack">
                        {group.members
                          .slice(0, 4)
                          .map(
                            (
                              member,
                              index,
                            ) => (
                              <span
                                key={
                                  member.id
                                }
                                className="stack-avatar"
                                style={{
                                  background:
                                    member.color,
                                  zIndex:
                                    10 -
                                    index,
                                }}
                                title={
                                  member.name
                                }
                              >
                                {
                                  member
                                    .name[0]
                                }
                              </span>
                            ),
                          )}

                        {group.members
                          .length >
                          4 && (
                          <span className="stack-more">
                            +
                            {group.members
                              .length -
                              4}
                          </span>
                        )}
                      </div>

                      <span
                        className={
                          balance >=
                          0
                            ? 'group-positive'
                            : 'group-negative'
                        }
                      >
                        {balance >=
                        0
                          ? '+'
                          : ''}
                        {money(
                          balance,
                        )}
                      </span>

                    </div>

                  </Link>
                ),
              )}

          </div>
        ) : (
          <Link
            to="/groups"
            className="empty-home-card"
          >
            <div>
              👥
            </div>

            <strong>
              Creá tu primer grupo
            </strong>

            <span>
              Viajes, amigos, casa,
              lo que quieras.
            </span>

            <b>
              →
            </b>
          </Link>
        )}

        {/* =================================================
            MINI ESTADÍSTICAS
        ================================================== */}

        {myGroups.length >
          0 && (
          <section className="home-stats-row">

            <div>
              <span>
                Grupos
              </span>

              <strong>
                {myGroups.length}
              </strong>
            </div>

            <div>
              <span>
                Gastos
              </span>

              <strong>
                {
                  data.expenses.filter(
                    (expense) =>
                      myGroupIds.has(
                        expense.groupId,
                      ),
                  ).length
                }
              </strong>
            </div>

            <div>
              <span>
                Gastado
              </span>

              <strong>
                {money(
                  totalSpent,
                )}
              </strong>
            </div>

          </section>
        )}

        {/* =================================================
            ACTIVIDAD
        ================================================== */}

        <div className="home-section-heading">
          <div>
            <span>
              Lo último
            </span>

            <h2>
              Actividad reciente
            </h2>
          </div>

          <Link to="/groups">
            Ver grupos
          </Link>
        </div>

        {recentExpenses.length >
        0 ? (
          <section className="modern-activity">

            {recentExpenses.map(
              (expense) => {
                const group =
                  data.groups.find(
                    (item) =>
                      item.id ===
                      expense.groupId,
                  )

                const firstPayer =
                  expense.payers[0]

                const payer =
                  group?.members.find(
                    (member) =>
                      member.id ===
                      firstPayer?.memberId,
                  )

                const mySplit =
                  expense.splits.find(
                    (split) =>
                      split.memberId ===
                      data.user.id,
                  )

                return (
                  <Link
                    to={`/groups/${expense.groupId}`}
                    className="modern-activity-item"
                    key={
                      expense.id
                    }
                  >

                    <div
                      className="activity-person"
                      style={{
                        background:
                          payer?.color ??
                          '#dff4e9',
                      }}
                    >
                      {payer?.name?.[0] ??
                        '$'}
                    </div>

                    <div className="activity-main">

                      <strong>
                        {payer
                          ? `${payer.name} pagó`
                          : 'Nuevo gasto'}
                      </strong>

                      <span>
                        {
                          expense.description
                        }
                      </span>

                      <small>
                        {group?.emoji}{' '}
                        {group?.name}
                        {' · '}
                        {new Date(
                          expense.date +
                            'T12:00:00',
                        ).toLocaleDateString(
                          'es-AR',
                        )}
                      </small>

                    </div>

                    <div className="activity-money">

                      <strong>
                        {money(
                          expense.amount,
                        )}
                      </strong>

                      {mySplit && (
                        <span>
                          Tu parte{' '}
                          {money(
                            mySplit.amount,
                          )}
                        </span>
                      )}

                    </div>

                    <div className="activity-chevron">
                      ›
                    </div>

                  </Link>
                )
              },
            )}

          </section>
        ) : (
          <div className="empty-home-card">
            <div>
              ✨
            </div>

            <strong>
              Todavía no hay actividad
            </strong>

            <span>
              Cuando registres un gasto,
              aparecerá acá.
            </span>
          </div>
        )}

        {/* =================================================
            FOOTER
        ================================================== */}

        <div className="home-footer-message">
          <span>
            Compartí experiencias,
            no cuentas.
          </span>

          <b>
            💚
          </b>
        </div>

      </section>
    </Shell>
  )
}