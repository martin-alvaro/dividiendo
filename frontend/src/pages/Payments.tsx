import {
  CheckCircle2,
  CreditCard,
  FileText,
  HandCoins,
  ReceiptText,
  WalletCards,
  X,
} from 'lucide-react'

import {
  useMemo,
  useState,
} from 'react'

import {
  useSearchParams,
} from 'react-router-dom'

import { Shell } from '../components/Shell'

import {
  outstandingExpenseDebts,
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

const formatDate = (
  value: string,
) =>
  new Date(
    value + 'T12:00:00',
  ).toLocaleDateString(
    'es-AR',
  )

export default function Payments() {
  const {
    data,
    addPayment,
  } = useStore()

  const [
    searchParams,
  ] = useSearchParams()

  const selectedGroupId =
    searchParams.get(
      'group',
    )

  const currentUserId =
    data.user.id

  /*
   * =====================================
   * GRUPOS DEL USUARIO
   * =====================================
   */
  const myGroups =
    data.groups.filter(
      (group) =>
        group.members.some(
          (member) =>
            member.id ===
            currentUserId,
        ),
    )

  const visibleGroups =
    selectedGroupId
      ? myGroups.filter(
          (group) =>
            group.id ===
            selectedGroupId,
        )
      : myGroups

  /*
   * =====================================
   * DEUDAS POR GASTO
   * =====================================
   */
  const allOutstanding =
    useMemo(() => {
      return visibleGroups.flatMap(
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

          const debts =
            outstandingExpenseDebts(
              group.members,
              expenses,
              payments,
            )

          return debts.map(
            (debt) => ({
              ...debt,
              group,
            }),
          )
        },
      )
    }, [
      visibleGroups,
      data.expenses,
      data.payments,
    ])

  /*
   * =====================================
   * DEUDAS AGRUPADAS POR PERSONA
   * =====================================
   */
  const allSettlements =
    useMemo(() => {
      return visibleGroups.flatMap(
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

          return settlements(
            group.members,
            expenses,
            payments,
          ).map(
            (settlement) => ({
              ...settlement,
              group,
            }),
          )
        },
      )
    }, [
      visibleGroups,
      data.expenses,
      data.payments,
    ])

  /*
   * Lo que yo debo.
   */
  const myDebts =
    allSettlements.filter(
      (item) =>
        item.from.id ===
        currentUserId,
    )

  /*
   * Lo que me deben.
   */
  const owedToMe =
    allSettlements.filter(
      (item) =>
        item.to.id ===
        currentUserId,
    )

  const totalIOwe =
    myDebts.reduce(
      (sum, item) =>
        sum + item.amount,
      0,
    )

  const totalOwedToMe =
    owedToMe.reduce(
      (sum, item) =>
        sum + item.amount,
      0,
    )

  /*
   * =====================================
   * HISTORIAL DE PAGOS
   * =====================================
   */
  const registeredPayments =
    data.payments
      .filter(
        (payment) =>
          visibleGroups.some(
            (group) =>
              group.id ===
              payment.groupId,
          ),
      )
      .sort(
        (a, b) =>
          new Date(
            b.date,
          ).getTime() -
          new Date(
            a.date,
          ).getTime(),
      )

  /*
   * =====================================
   * MODAL DE PAGO
   * =====================================
   */
  const [
    selectedDebt,
    setSelectedDebt,
  ] =
    useState<
      (typeof myDebts)[number] | null
    >(null)

  const [
    selectedExpenseId,
    setSelectedExpenseId,
  ] = useState('')

  const [
    paymentAmount,
    setPaymentAmount,
  ] = useState('')

  const [
    paymentError,
    setPaymentError,
  ] = useState('')

  /*
   * =====================================
   * GASTOS DISPONIBLES
   * =====================================
   */
  const selectedExpenseDebts =
    useMemo(() => {
      if (!selectedDebt) {
        return []
      }

      return allOutstanding.filter(
        (item) =>
          item.group.id ===
            selectedDebt.group.id &&
          item.from.id ===
            selectedDebt.from.id &&
          item.to.id ===
            selectedDebt.to.id,
      )
    }, [
      selectedDebt,
      allOutstanding,
    ])

  /*
   * =====================================
   * ABRIR MODAL
   * =====================================
   */
  const openPaymentModal = (
    debt: (typeof myDebts)[number],
  ) => {
    setSelectedDebt(debt)
    setPaymentError('')

    const first =
      allOutstanding.find(
        (item) =>
          item.group.id ===
            debt.group.id &&
          item.from.id ===
            debt.from.id &&
          item.to.id ===
            debt.to.id,
      )

    if (first) {
      setSelectedExpenseId(
        first.expense.id,
      )

      setPaymentAmount(
        first.amount.toFixed(
          2,
        ),
      )
    } else {
      setSelectedExpenseId('')
      setPaymentAmount('')
    }
  }

  /*
   * =====================================
   * CERRAR MODAL
   * =====================================
   */
  const closePaymentModal =
    () => {
      setSelectedDebt(null)
      setSelectedExpenseId('')
      setPaymentAmount('')
      setPaymentError('')
    }

  /*
   * =====================================
   * CAMBIAR GASTO
   * =====================================
   */
  const handleExpenseChange =
    (
      expenseId: string,
    ) => {
      setSelectedExpenseId(
        expenseId,
      )

      const debt =
        selectedExpenseDebts.find(
          (item) =>
            item.expense.id ===
            expenseId,
        )

      setPaymentAmount(
        debt
          ? debt.amount.toFixed(
              2,
            )
          : '',
      )

      setPaymentError('')
    }

  /*
   * =====================================
   * REGISTRAR PAGO
   * =====================================
   */
  const handleRegisterPayment =
    () => {
      if (!selectedDebt) {
        return
      }

      if (!selectedExpenseId) {
        setPaymentError(
          'Elegí qué gasto estás pagando.',
        )
        return
      }

      const amount =
        Number(
          paymentAmount.replace(
            ',',
            '.',
          ),
        )

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        setPaymentError(
          'Ingresá un importe válido.',
        )
        return
      }

      const expenseDebt =
        selectedExpenseDebts.find(
          (item) =>
            item.expense.id ===
            selectedExpenseId,
        )

      if (!expenseDebt) {
        setPaymentError(
          'No encontramos esa deuda.',
        )
        return
      }

      if (
        amount >
        expenseDebt.amount +
          0.009
      ) {
        setPaymentError(
          `No podés pagar más de ${money(
            expenseDebt.amount,
          )} para ese gasto.`,
        )
        return
      }

      addPayment({
        expenseId:
          expenseDebt.expense.id,

        groupId:
          selectedDebt.group.id,

        fromId:
          selectedDebt.from.id,

        toId:
          selectedDebt.to.id,

        amount,

        date:
          new Date()
            .toISOString()
            .slice(0, 10),

        note:
          `Pago de ${expenseDebt.expense.description}`,
      })

      closePaymentModal()
    }

  const balance =
    totalOwedToMe -
    totalIOwe

  return (
    <Shell title="Pagos">
      <main className="page payments-page">
        <section className="payments-heading">
          <div>
            <span className="payments-eyebrow">
              TUS PAGOS
            </span>

            <h2>
              Tu situación general
            </h2>
          </div>

          <WalletCards
            size={21}
          />
        </section>

        <section className="payments-main-card">
          <div>
            <span>
              {balance > 0.009
                ? 'Te deben'
                : balance <
                    -0.009
                  ? 'Debés'
                  : 'Todo está equilibrado'}
            </span>

            <strong>
              {money(
                Math.abs(
                  balance,
                ),
              )}
            </strong>

            <small>
              {balance > 0.009
                ? 'dinero pendiente de cobrar'
                : balance <
                    -0.009
                  ? 'dinero pendiente de pagar'
                  : 'no tenés pagos pendientes'}
            </small>
          </div>

          <div className="payments-main-orb">
            <CreditCard
              size={25}
            />
          </div>
        </section>

        <section className="payments-summary-grid">
          <article className="payments-summary-card positive">
            <div className="payments-summary-icon">
              <HandCoins
                size={18}
              />
            </div>

            <div>
              <small>
                Te deben
              </small>

              <strong>
                {money(
                  totalOwedToMe,
                )}
              </strong>

              <span>
                {owedToMe.length ===
                0
                  ? 'Nadie te debe'
                  : owedToMe.length ===
                      1
                    ? '1 deuda a tu favor'
                    : `${owedToMe.length} deudas a tu favor`}
              </span>
            </div>
          </article>

          <article className="payments-summary-card negative">
            <div className="payments-summary-icon">
              <ReceiptText
                size={18}
              />
            </div>

            <div>
              <small>
                Debés
              </small>

              <strong>
                {money(totalIOwe)}
              </strong>

              <span>
                {myDebts.length ===
                0
                  ? 'No debés dinero'
                  : myDebts.length ===
                      1
                    ? '1 pago pendiente'
                    : `${myDebts.length} pagos pendientes`}
              </span>
            </div>
          </article>
        </section>

        {/* ===========================
            LO QUE DEBO
        ============================ */}
        <section className="payments-section">
          <div className="payments-section-heading">
            <div>
              <span className="payments-eyebrow">
                PENDIENTES
              </span>

              <h3>
                Lo que debés
              </h3>
            </div>

            <CreditCard
              size={19}
            />
          </div>

          {myDebts.length ? (
            <div className="payment-cards">
              {myDebts.map(
                (debt, index) => (
                  <article
                    className="debt-card owe"
                    key={`${debt.group.id}-${debt.to.id}-${index}`}
                  >
                    <div className="debt-card-top">
                      <div className="debt-group">
                        <span className="debt-group-emoji">
                          {debt.group.emoji}
                        </span>

                        <span>
                          {debt.group.name}
                        </span>
                      </div>

                      <strong>
                        {money(
                          debt.amount,
                        )}
                      </strong>
                    </div>

                    <div className="debt-card-body">
                      <strong>
                        Le debés a{' '}
                        {debt.to.name}
                      </strong>

                      <span>
                        Podés registrar el
                        pago y elegir qué
                        gasto estás
                        saldando.
                      </span>
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      onClick={() =>
                        openPaymentModal(
                          debt,
                        )
                      }
                    >
                      <CheckCircle2
                        size={18}
                      />

                      Marcar como pagado
                    </button>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="payments-empty-card">
              <CheckCircle2
                size={23}
              />

              <strong>
                Nada pendiente
              </strong>

              <span>
                No debés dinero a
                nadie.
              </span>
            </div>
          )}
        </section>

        {/* ===========================
            LO QUE ME DEBEN
        ============================ */}
        <section className="payments-section">
          <div className="payments-section-heading">
            <div>
              <span className="payments-eyebrow">
                A TU FAVOR
              </span>

              <h3>
                Lo que te deben
              </h3>
            </div>

            <HandCoins
              size={19}
            />
          </div>

          {owedToMe.length ? (
            <div className="payment-cards">
              {owedToMe.map(
                (debt, index) => (
                  <article
                    className="debt-card receive"
                    key={`${debt.group.id}-${debt.from.id}-${index}`}
                  >
                    <div className="debt-card-top">
                      <div className="debt-group">
                        <span className="debt-group-emoji">
                          {debt.group.emoji}
                        </span>

                        <span>
                          {debt.group.name}
                        </span>
                      </div>

                      <strong>
                        {money(
                          debt.amount,
                        )}
                      </strong>
                    </div>

                    <div className="debt-card-body">
                      <strong>
                        {debt.from.name}{' '}
                        te debe
                      </strong>

                      <span>
                        Todavía está
                        pendiente de
                        pago.
                      </span>
                    </div>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div className="payments-empty-card">
              <HandCoins
                size={23}
              />

              <strong>
                Nadie te debe
              </strong>

              <span>
                Todo está al día.
              </span>
            </div>
          )}
        </section>

        {/* ===========================
            PAGOS REGISTRADOS
        ============================ */}
        <section className="payments-section">
          <div className="payments-section-heading">
            <div>
              <span className="payments-eyebrow">
                HISTORIAL
              </span>

              <h3>
                Pagos registrados
              </h3>
            </div>

            <FileText
              size={19}
            />
          </div>

          {registeredPayments.length ? (
            <div className="registered-payments">
              {registeredPayments.map(
                (payment) => {
                  const group =
                    data.groups.find(
                      (item) =>
                        item.id ===
                        payment.groupId,
                    )

                  const expense =
                    data.expenses.find(
                      (item) =>
                        item.id ===
                        payment.expenseId,
                    )

                  const from =
                    group?.members.find(
                      (member) =>
                        member.id ===
                        payment.fromId,
                    )

                  const to =
                    group?.members.find(
                      (member) =>
                        member.id ===
                        payment.toId,
                    )

                  const isReceived =
                    payment.toId ===
                    currentUserId

                  return (
                    <article
                      className="registered-payment-card"
                      key={
                        payment.id
                      }
                    >
                      <div className="registered-payment-icon">
                        {isReceived ? (
                          <HandCoins
                            size={18}
                          />
                        ) : (
                          <CreditCard
                            size={18}
                          />
                        )}
                      </div>

                      <div className="registered-payment-main">
                        <strong>
                          {isReceived
                            ? `${from?.name ?? 'Alguien'} te pagó`
                            : `Pagaste a ${
                                to?.name ??
                                'alguien'
                              }`}
                        </strong>

                        <span>
                          {expense?.description ??
                            'Gasto'}

                          {' · '}

                          {group?.emoji}{' '}
                          {group?.name}

                          {' · '}

                          {formatDate(
                            payment.date,
                          )}
                        </span>
                      </div>

                      <strong className="registered-payment-amount">
                        {money(
                          payment.amount,
                        )}
                      </strong>
                    </article>
                  )
                },
              )}
            </div>
          ) : (
            <div className="payments-empty-card">
              <FileText
                size={23}
              />

              <strong>
                No hay pagos registrados
              </strong>

              <span>
                Cuando se registre un
                pago, aparecerá acá.
              </span>
            </div>
          )}
        </section>

        <section className="payments-info">
          <strong>
            ¿Cómo funcionan los
            pagos?
          </strong>

          <p>
            Cada pago queda asociado
            al gasto que estás
            saldando. Así MitiMiti
            sabe exactamente qué
            parte de una deuda ya
            fue pagada.
          </p>
        </section>
      </main>

      {/* ============================
          MODAL
      ============================= */}
      {selectedDebt && (
        <div
          className="modal-backdrop"
          onClick={
            closePaymentModal
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
                  REGISTRAR PAGO
                </span>

                <h2>
                  Pagar a{' '}
                  {
                    selectedDebt
                      .to.name
                  }
                </h2>
              </div>

              <button
                type="button"
                className="icon-button"
                onClick={
                  closePaymentModal
                }
              >
                <X size={18} />
              </button>
            </div>

            <p className="modal-description">
              Elegí qué gasto estás
              pagando y cuánto
              querés registrar.
            </p>

            <div className="form-field">
              <label>
                ¿Qué gasto estás
                pagando?
              </label>

              <select
                value={
                  selectedExpenseId
                }
                onChange={(event) =>
                  handleExpenseChange(
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Seleccioná un gasto
                </option>

                {selectedExpenseDebts.map(
                  (debt) => (
                    <option
                      key={
                        debt.expense.id
                      }
                      value={
                        debt.expense.id
                      }
                    >
                      {
                        debt.expense
                          .description
                      }{' '}
                      —{' '}
                      {money(
                        debt.amount,
                      )}
                    </option>
                  ),
                )}
              </select>
            </div>

            {selectedExpenseId && (
              <div className="payment-selected-expense">
                <div>
                  <span>
                    Gasto
                  </span>

                  <strong>
                    {
                      selectedExpenseDebts.find(
                        (item) =>
                          item.expense
                            .id ===
                          selectedExpenseId,
                      )?.expense
                        .description
                    }
                  </strong>
                </div>

                <div>
                  <span>
                    Pendiente
                  </span>

                  <strong>
                    {money(
                      selectedExpenseDebts.find(
                        (item) =>
                          item.expense
                            .id ===
                          selectedExpenseId,
                      )?.amount ?? 0,
                    )}
                  </strong>
                </div>
              </div>
            )}

            <div className="form-field">
              <label>
                Importe
              </label>

              <input
                type="number"
                min="0.01"
                step="0.01"
                value={
                  paymentAmount
                }
                onChange={(event) =>
                  setPaymentAmount(
                    event.target.value,
                  )
                }
                placeholder="0,00"
              />
            </div>

            {paymentError && (
              <p className="form-error">
                {paymentError}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={
                  closePaymentModal
                }
              >
                Cancelar
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={
                  handleRegisterPayment
                }
              >
                <CheckCircle2
                  size={18}
                />

                Registrar pago
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}