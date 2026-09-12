import {
  CalendarDays,
  Eye,
  Receipt,
  Users,
  WalletCards,
  X,
} from 'lucide-react'

import { useState } from 'react'

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { Shell } from '../components/Shell'

import {
  settlements,
} from '../lib/balances'

import { useStore } from '../lib/store'

const money = (
  value: number,
) =>
  new Intl.NumberFormat(
    'es-AR',
    {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    },
  ).format(value)

export default function GroupDetail() {
  const {
    groupId,
  } = useParams()

  const {
    data,
    deleteExpense,
    deleteGroup,
    leaveGroup,
    inviteToGroup,
  } = useStore()

  const navigate = useNavigate()

  /*
   * ======================================
   * ESTADOS
   * ======================================
   */

  const [
    inviteOpen,
    setInviteOpen,
  ] = useState(false)

  const [
    inviteEmail,
    setInviteEmail,
  ] = useState('')

  const [
    inviteMessage,
    setInviteMessage,
  ] = useState('')

  const [
    receiptOpen,
    setReceiptOpen,
  ] = useState(false)

  const [
    selectedReceipt,
    setSelectedReceipt,
  ] = useState<
    string | undefined
  >()

  const [
    selectedReceiptName,
    setSelectedReceiptName,
  ] = useState<
    string | undefined
  >()

  const [
    selectedExpenseId,
    setSelectedExpenseId,
  ] = useState<
    string | null
  >(null)

  /*
   * ======================================
   * BUSCAR GRUPO
   * ======================================
   */

  const group =
    data.groups.find(
      (item) =>
        item.id === groupId,
    )

  const isMember =
    group?.members.some(
      (member) =>
        member.id ===
        data.user.id,
    ) ?? false

  if (!group || !isMember) {
    return (
      <Shell title="Grupo">
        <section className="page">
          <p className="empty">
            No tenés acceso a
            este grupo.
          </p>

          <Link
            className="primary-button"
            to="/groups"
          >
            Volver a mis grupos
          </Link>
        </section>
      </Shell>
    )
  }

  /*
   * ======================================
   * GASTOS Y PAGOS DEL GRUPO
   * ======================================
   */

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

  /*
   * ======================================
   * DEUDAS DIRECTAS
   * ======================================
   */

  const due =
    settlements(
      group.members,
      expenses,
      payments,
    )

  /*
   * ======================================
   * TOTAL DEL GRUPO
   * ======================================
   */

  const total =
    expenses.reduce(
      (sum, expense) =>
        sum + expense.amount,
      0,
    )

  const isOwner =
    group.ownerId ===
    data.user.id

  /*
   * ======================================
   * CUÁNTO PAGÓ CADA PERSONA
   * ======================================
   */

  const paidByMember =
    group.members.map(
      (member) => {
        const paid =
          expenses.reduce(
            (sum, expense) => {
              const payer =
                expense.payers.find(
                  (item) =>
                    item.memberId ===
                    member.id,
                )

              return (
                sum +
                (payer?.amount ??
                  0)
              )
            },
            0,
          )

        /*
         * Deudas que salen
         * de esta persona.
         */
        const debtsFromMember =
          due.filter(
            (settlement) =>
              settlement.from.id ===
              member.id,
          )

        /*
         * Deudas que vienen
         * hacia esta persona.
         */
        const debtsToMember =
          due.filter(
            (settlement) =>
              settlement.to.id ===
              member.id,
          )

        return {
          member,
          paid,
          debtsFromMember,
          debtsToMember,
        }
      },
    )

  /*
   * ======================================
   * DATOS DEL DONUT
   * ======================================
   *
   * Para el dibujo usamos solamente
   * quienes realmente pagaron > 0.
   */
  const chartData =
    paidByMember.filter(
      (item) =>
        item.paid > 0.009,
    )

  const chartTotal =
    chartData.reduce(
      (sum, item) =>
        sum + item.paid,
      0,
    )

  /*
   * ======================================
   * LEYENDA DEL DONUT
   * ======================================
   *
   * Acá usamos TODOS los integrantes,
   * incluso quienes pagaron $0.
   */
  const chartLegend =
    group.members.map(
      (member) => {
        const item =
          paidByMember.find(
            (entry) =>
              entry.member.id ===
              member.id,
          )

        const paid =
          item?.paid ?? 0

        const percentage =
          chartTotal > 0
            ? (
                (paid /
                  chartTotal) *
                100
              ).toFixed(0)
            : '0'

        return {
          member,
          paid,
          percentage,
        }
      },
    )

  /*
   * ======================================
   * SEGMENTOS DEL DONUT
   * ======================================
   */

  let accumulated = 0

  const chartSegments =
    chartData.map(
      (item) => {
        const start =
          chartTotal > 0
            ? (accumulated /
                chartTotal) *
              360
            : 0

        accumulated +=
          item.paid

        const end =
          chartTotal > 0
            ? (accumulated /
                chartTotal) *
              360
            : 0

        return {
          ...item,
          start,
          end,
        }
      },
    )

  /*
   * ======================================
   * INVITAR
   * ======================================
   */

  const handleInvite = () => {
    setInviteMessage('')

    const email =
      inviteEmail.trim()

    if (!email) {
      setInviteMessage(
        'Ingresá un email.',
      )
      return
    }

    if (!email.includes('@')) {
      setInviteMessage(
        'Ingresá un email válido.',
      )
      return
    }

    const result =
      inviteToGroup(
        group.id,
        email,
      )

    if (result) {
      setInviteMessage(result)
      return
    }

    setInviteMessage(
      `Invitación enviada a ${email}.`,
    )

    setInviteEmail('')
  }

  const closeInvite = () => {
    setInviteOpen(false)
    setInviteEmail('')
    setInviteMessage('')
  }

  /*
   * ======================================
   * COMPROBANTE
   * ======================================
   */

  const openReceipt = (
    dataUrl: string,
    name?: string,
  ) => {
    setSelectedReceipt(
      dataUrl,
    )

    setSelectedReceiptName(
      name,
    )

    setReceiptOpen(true)
  }

  const closeReceipt = () => {
    setReceiptOpen(false)

    setSelectedReceipt(
      undefined,
    )

    setSelectedReceiptName(
      undefined,
    )
  }

  /*
   * ======================================
   * DETALLE DEL GASTO
   * ======================================
   */

  const openExpenseDetail = (
    expenseId: string,
  ) => {
    setSelectedExpenseId(
      expenseId,
    )
  }

  const closeExpenseDetail =
    () => {
      setSelectedExpenseId(
        null,
      )
    }

  const selectedExpense =
    selectedExpenseId
      ? expenses.find(
          (expense) =>
            expense.id ===
            selectedExpenseId,
        ) ?? null
      : null

  /*
   * ======================================
   * ELIMINAR GRUPO
   * ======================================
   */

  const handleDeleteGroup =
    () => {
      if (!isOwner) {
        return
      }

      const confirmed =
        window.confirm(
          `¿Eliminar “${group.name}”? Esta acción eliminará el grupo, sus gastos, pagos e historial para todos los integrantes. No se puede deshacer.`,
        )

      if (!confirmed) {
        return
      }

      const result =
        deleteGroup(group.id)

      if (result) {
        window.alert(result)
        return
      }

      navigate('/groups')
    }

  /*
   * ======================================
   * SALIR DEL GRUPO
   * ======================================
   */

  const handleLeaveGroup =
    () => {
      const confirmed =
        window.confirm(
          `¿Querés salir de “${group.name}”?`,
        )

      if (!confirmed) {
        return
      }

      const result =
        leaveGroup(group.id)

      if (result) {
        window.alert(result)
        return
      }

      navigate('/groups')
    }

  return (
    <Shell
      title={group.name}
      action={
        <Link
          className="icon-button"
          to={`/expenses/new?group=${group.id}`}
          title="Nuevo gasto"
        >
          +
        </Link>
      }
    >
      <main className="page">

        {/* =====================================================
            CABECERA DEL GRUPO
        ====================================================== */}

        <section className="group-detail-hero">
          <div className="group-detail-hero-main">

            <div className="group-detail-emoji">
              {group.emoji}
            </div>

            <div>
              <span>
                GRUPO
              </span>

              <h1>
                {group.name}
              </h1>

              <p>
                {group.members.length}{' '}
                integrantes ·{' '}
                {expenses.length}{' '}
                gastos ·{' '}
                {money(total)}
              </p>
            </div>
          </div>

          {isOwner && (
            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setInviteOpen(true)
              }
            >
              <Users
                size={18}
              />

              Invitar
            </button>
          )}
        </section>

        {/* =====================================================
            INTEGRANTES
        ====================================================== */}

        <section className="group-detail-members">
          {group.members.map(
            (member) => (
              <div
                className="group-member-chip"
                key={
                  member.id
                }
              >
                <span
                  className="mini-avatar"
                  style={{
                    background:
                      member.color,
                  }}
                >
                  {member.name[0]}
                </span>

                <span>
                  {member.name}
                </span>
              </div>
            ),
          )}
        </section>

        {/* =====================================================
            RESUMEN
        ====================================================== */}

        <section className="group-summary-grid">

          <div className="group-summary-card">
            <WalletCards
              size={18}
            />

            <div>
              <small>
                Total gastado
              </small>

              <strong>
                {money(total)}
              </strong>
            </div>
          </div>

          <div className="group-summary-card">
            <Users
              size={18}
            />

            <div>
              <small>
                Integrantes
              </small>

              <strong>
                {group.members.length}
              </strong>
            </div>
          </div>

          <div className="group-summary-card">
            <Receipt
              size={18}
            />

            <div>
              <small>
                Gastos
              </small>

              <strong>
                {expenses.length}
              </strong>
            </div>
          </div>

        </section>

        {/* =====================================================
            GRÁFICO
        ====================================================== */}

        <section className="group-chart-card">

          <div className="section-title">
            <div>
              <span className="payments-eyebrow">
                DISTRIBUCIÓN
              </span>

              <h2>
                Quién puso la plata
              </h2>
            </div>
          </div>

          <div className="group-chart-layout">

            {/* DONUT */}

            <div
              className="donut"
              style={{
                background:
                  chartTotal > 0
                    ? `conic-gradient(${chartSegments
                        .map(
                          (
                            item,
                          ) =>
                            `${item.member.color} ${item.start}deg ${item.end}deg`,
                        )
                        .join(', ')})`
                    : '#e5e7eb',
              }}
            >
              <div className="donut-hole">

                <small>
                  Total
                </small>

                <strong>
                  {money(
                    chartTotal,
                  )}
                </strong>

              </div>
            </div>

            {/* LEYENDA */}

            <div className="chart-legend">

              {chartLegend.map(
                (item) => (
                  <div
                    className="chart-legend-row"
                    key={
                      item.member.id
                    }
                  >

                    <span
                      className="chart-dot"
                      style={{
                        background:
                          item.member
                            .color,
                      }}
                    />

                    <span>
                      {
                        item.member
                          .name
                      }
                    </span>

                    <small>
                      {
                        item.percentage
                      }
                      %
                    </small>

                    <strong>
                      {money(
                        item.paid,
                      )}
                    </strong>

                  </div>
                ),
              )}

            </div>
          </div>
        </section>

        {/* =====================================================
            BALANCES
        ====================================================== */}

        <div className="section-title">

          <div>
            <span className="payments-eyebrow">
              SITUACIÓN
            </span>

            <h2>
              Balances
            </h2>
          </div>

        </div>

        <div className="balance-list">

          {paidByMember.map(
            (item) => (
              <div
                key={
                  item.member.id
                }
              >

                <span
                  className="mini-avatar"
                  style={{
                    background:
                      item.member
                        .color,
                  }}
                >
                  {
                    item.member
                      .name[0]
                  }
                </span>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >

                  <b>
                    {
                      item.member
                        .name
                    }
                  </b>

                  <small
                    style={{
                      display:
                        'block',
                      color:
                        '#6B7280',
                      marginTop:
                        '2px',
                    }}
                  >
                    Pagó{' '}
                    {money(
                      item.paid,
                    )}
                  </small>

                  {/* DEUDAS DE ESTA PERSONA */}

                  {item.debtsFromMember.map(
                    (
                      settlement,
                    ) => (
                      <small
                        key={`from-${settlement.to.id}`}
                        style={{
                          display:
                            'block',
                          color:
                            '#c44d47',
                          marginTop:
                            '3px',
                          fontWeight:
                            700,
                        }}
                      >
                        Debe a{' '}
                        {
                          settlement
                            .to
                            .name
                        }{' '}
                        {money(
                          settlement.amount,
                        )}
                      </small>
                    ),
                  )}

                  {/* DEUDAS HACIA ESTA PERSONA */}

                  {item.debtsToMember.map(
                    (
                      settlement,
                    ) => (
                      <small
                        key={`to-${settlement.from.id}`}
                        style={{
                          display:
                            'block',
                          color:
                            '#15803d',
                          marginTop:
                            '3px',
                          fontWeight:
                            700,
                        }}
                      >
                        {
                          settlement
                            .from
                            .name
                        }{' '}
                        le debe{' '}
                        {money(
                          settlement.amount,
                        )}
                      </small>
                    ),
                  )}

                  {/* TODO SALDADO */}

                  {item
                    .debtsFromMember
                    .length ===
                    0 &&
                    item
                      .debtsToMember
                      .length ===
                      0 && (
                      <small
                        style={{
                          display:
                            'block',
                          color:
                            '#15803d',
                          marginTop:
                            '3px',
                          fontWeight:
                            700,
                        }}
                      >
                        Todo está
                        saldado
                      </small>
                    )}

                </div>

              </div>
            ),
          )}

        </div>

        {/* =====================================================
            PARA SALDAR
        ====================================================== */}

        <div className="section-title">

          <div>
            <span className="payments-eyebrow">
              DEUDAS
            </span>

            <h2>
              Para saldar
            </h2>
          </div>

          <Link
            to={`/payments?group=${group.id}`}
          >
            Registrar pago
          </Link>

        </div>

        {due.length ? (
          <div className="settlement-list">

            {due.map(
              (
                settlement,
                index,
              ) => (
                <p
                  key={`${settlement.from.id}-${settlement.to.id}-${index}`}
                >

                  <span>
                    <b>
                      {
                        settlement
                          .from
                          .name
                      }
                    </b>

                    {' le paga '}

                    <b>
                      {
                        settlement
                          .to
                          .name
                      }
                    </b>
                  </span>

                  <strong>
                    {money(
                      settlement.amount,
                    )}
                  </strong>

                </p>
              ),
            )}

          </div>
        ) : (
          <p className="empty">
            Todo está saldado 🎉
          </p>
        )}

        {/* =====================================================
            HISTORIAL
        ====================================================== */}

        <div className="section-title">

          <div>
            <span className="payments-eyebrow">
              ACTIVIDAD
            </span>

            <h2>
              Historial
            </h2>
          </div>

          <Link
            to={`/expenses/new?group=${group.id}`}
          >
            Nuevo gasto
          </Link>

        </div>

        <div className="group-expense-history">

          {expenses.map(
            (expense) => {
              const payerNames =
                expense.payers
                  .map(
                    (payer) =>
                      group.members.find(
                        (member) =>
                          member.id ===
                          payer.memberId,
                      )?.name,
                  )
                  .filter(
                    Boolean,
                  )

              return (
                <article
                  className="group-expense-history-card"
                  key={
                    expense.id
                  }
                >

                  <div className="group-expense-history-main">

                    <div className="activity-avatar">
                      {
                        expense
                          .description[0]
                      }
                    </div>

                    <div className="group-expense-history-info">

                      <strong>
                        {
                          expense
                            .description
                        }
                      </strong>

                      <span>
                        {payerNames.length
                          ? `Pagó ${payerNames.join(
                              ', ',
                            )}`
                          : 'Pago registrado'}

                        {' · '}

                        {new Date(
                          expense.date +
                            'T12:00:00',
                        ).toLocaleDateString(
                          'es-AR',
                        )}
                      </span>

                    </div>

                    <div className="group-expense-history-amount">

                      <strong>
                        {money(
                          expense.amount,
                        )}
                      </strong>

                    </div>

                  </div>

                  <div className="group-expense-history-actions">

                    <button
                      type="button"
                      className="expense-detail-button"
                      onClick={() =>
                        openExpenseDetail(
                          expense.id,
                        )
                      }
                    >
                      <Eye
                        size={18}
                      />

                      Ver detalle
                    </button>

                    <button
                      type="button"
                      className="danger-icon"
                      title="Eliminar gasto"
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Eliminar el gasto “${expense.description}”?`,
                          )
                        ) {
                          deleteExpense(
                            expense.id,
                          )
                        }
                      }}
                    >
                      ×
                    </button>

                  </div>

                </article>
              )
            },
          )}

        </div>

        {/* =====================================================
            ACCIONES
        ====================================================== */}

        <div
          style={{
            display:
              'flex',
            flexDirection:
              'column',
            gap: '10px',
            alignItems:
              'flex-start',
            marginTop:
              '24px',
          }}
        >

          <button
            type="button"
            className="secondary-button"
            onClick={
              handleLeaveGroup
            }
          >
            Salir del grupo
          </button>

          {isOwner && (
            <button
              type="button"
              className="danger-button"
              onClick={
                handleDeleteGroup
              }
            >
              Eliminar este grupo
            </button>
          )}

        </div>

      </main>

      {/* =====================================================
          MODAL DE INVITACIÓN
      ====================================================== */}

      {inviteOpen && (
        <div
          className="modal-backdrop"
          onClick={
            closeInvite
          }
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-head">

              <div>
                <span className="payments-eyebrow">
                  GRUPO
                </span>

                <h2>
                  Invitar persona
                </h2>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={
                  closeInvite
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="form-field">

              <label>
                Email
              </label>

              <input
                type="email"
                value={
                  inviteEmail
                }
                onChange={(event) =>
                  setInviteEmail(
                    event.target
                      .value,
                  )
                }
                placeholder="ejemplo@email.com"
              />

            </div>

            {inviteMessage && (
              <p className="form-error">
                {inviteMessage}
              </p>
            )}

            <div className="modal-actions">

              <button
                type="button"
                className="secondary-button"
                onClick={
                  closeInvite
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={
                  handleInvite
                }
              >
                Enviar invitación
              </button>

            </div>

          </div>
        </div>
      )}

      {/* =====================================================
          MODAL DETALLE DEL GASTO
      ====================================================== */}

      {selectedExpense && (
        <div
          className="modal-backdrop"
          onClick={
            closeExpenseDetail
          }
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-head">

              <div>
                <span className="payments-eyebrow">
                  DETALLE DEL GASTO
                </span>

                <h2>
                  {
                    selectedExpense
                      .description
                  }
                </h2>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={
                  closeExpenseDetail
                }
              >
                <X size={18} />
              </button>

            </div>

            <div className="expense-detail-amount">

              <small>
                Importe
              </small>

              <strong>
                {money(
                  selectedExpense.amount,
                )}
              </strong>

            </div>

            <div className="expense-detail-meta">

              <div>

                <CalendarDays
                  size={18}
                />

                <span>

                  <small>
                    Fecha
                  </small>

                  {new Date(
                    selectedExpense.date +
                      'T12:00:00',
                  ).toLocaleDateString(
                    'es-AR',
                  )}

                </span>

              </div>

            </div>

            <div className="expense-detail-section">

              <h3>
                Quién pagó
              </h3>

              {selectedExpense.payers.map(
                (payer) => {
                  const member =
                    group.members.find(
                      (item) =>
                        item.id ===
                        payer.memberId,
                    )

                  return (
                    <div
                      className="expense-detail-row"
                      key={
                        payer.memberId
                      }
                    >

                      <span>
                        {
                          member?.name ??
                          'Persona'
                        }
                      </span>

                      <strong>
                        {money(
                          payer.amount,
                        )}
                      </strong>

                    </div>
                  )
                },
              )}

            </div>

            <div className="expense-detail-section">

              <h3>
                Se divide entre
              </h3>

              {selectedExpense.splits.map(
                (split) => {
                  const member =
                    group.members.find(
                      (item) =>
                        item.id ===
                        split.memberId,
                    )

                  return (
                    <div
                      className="expense-detail-row"
                      key={
                        split.memberId
                      }
                    >

                      <span>
                        {
                          member?.name ??
                          'Persona'
                        }
                      </span>

                      <strong>
                        {money(
                          split.amount,
                        )}
                      </strong>

                    </div>
                  )
                },
              )}

            </div>

            {selectedExpense.receiptData && (
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  openReceipt(
                    selectedExpense.receiptData!,
                    selectedExpense.receiptName,
                  )
                }
              >
                <Receipt
                  size={18}
                />

                Ver comprobante
              </button>
            )}

          </div>
        </div>
      )}

      {/* =====================================================
          MODAL COMPROBANTE
      ====================================================== */}

      {receiptOpen &&
        selectedReceipt && (
          <div
            className="modal-backdrop"
            onClick={
              closeReceipt
            }
          >
            <div
              className="modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >

              <div className="modal-head">

                <div>
                  <span className="payments-eyebrow">
                    COMPROBANTE
                  </span>

                  <h2>
                    {
                      selectedReceiptName ??
                      'Comprobante'
                    }
                  </h2>
                </div>

                <button
                  type="button"
                  className="icon-button"
                  onClick={
                    closeReceipt
                  }
                >
                  <X size={18} />
                </button>

              </div>

              <img
                src={
                  selectedReceipt
                }
                alt={
                  selectedReceiptName ??
                  'Comprobante'
                }
                style={{
                  width: '100%',
                  maxHeight:
                    '70vh',
                  objectFit:
                    'contain',
                  borderRadius:
                    '14px',
                  background:
                    '#f4f7f5',
                }}
              />

            </div>
          </div>
        )}

    </Shell>
  )
}