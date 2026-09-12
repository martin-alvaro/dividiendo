import type {
  Expense,
  Group,
  Member,
  Payment,
} from './types'

export type Settlement = {
  from: Member
  to: Member
  amount: number
}

export type ExpenseDebt = {
  expense: Expense
  from: Member
  to: Member
  amount: number
}

const cents = (
  value: number,
) =>
  Math.round(value * 100)

const fromCents = (
  value: number,
) =>
  value / 100

/*
 * ==========================================
 * BALANCE GENERAL
 * ==========================================
 *
 * Esta función se mantiene porque Home,
 * Profile y otras partes de la aplicación
 * todavía la utilizan.
 *
 * Positivo = dinero a favor.
 * Negativo = dinero pendiente.
 *
 * IMPORTANTE:
 * Esta función NO se usa para mostrar
 * "Para saldar" ni las deudas directas.
 */
export function balances(
  members: Group['members'],
  expenses: Expense[],
  payments: Payment[],
): Record<string, number> {
  const result: Record<
    string,
    number
  > = {}

  for (const member of members) {
    result[member.id] = 0
  }

  /*
   * Gastos:
   *
   * Lo que una persona pagó suma.
   * Lo que le correspondía pagar resta.
   */
  for (const expense of expenses) {
    for (const payer of expense.payers) {
      if (
        payer.memberId in result
      ) {
        result[payer.memberId] +=
          payer.amount
      }
    }

    for (const split of expense.splits) {
      if (
        split.memberId in result
      ) {
        result[split.memberId] -=
          split.amount
      }
    }
  }

  /*
   * Pagos:
   *
   * Quien paga una deuda recupera
   * esa cantidad a su favor.
   *
   * Quien recibe deja de tener
   * esa cantidad pendiente.
   */
  for (const payment of payments) {
    if (
      payment.fromId in result
    ) {
      result[payment.fromId] +=
        payment.amount
    }

    if (
      payment.toId in result
    ) {
      result[payment.toId] -=
        payment.amount
    }
  }

  for (const member of members) {
    result[member.id] =
      fromCents(
        cents(
          result[member.id],
        ),
      )
  }

  return result
}

/*
 * ==========================================
 * DEUDAS DE UN GASTO
 * ==========================================
 */
export function expenseDebts(
  expense: Expense,
  members: Group['members'],
): ExpenseDebt[] {
  const result: ExpenseDebt[] = []

  const payers =
    expense.payers.filter(
      (payer) =>
        members.some(
          (member) =>
            member.id ===
            payer.memberId,
        ) &&
        payer.amount > 0,
    )

  const splits =
    expense.splits.filter(
      (split) =>
        members.some(
          (member) =>
            member.id ===
            split.memberId,
        ) &&
        split.amount > 0,
    )

  if (!payers.length) {
    return result
  }

  /*
   * ----------------------------------------
   * UN SOLO PAGADOR
   * ----------------------------------------
   */
  if (payers.length === 1) {
    const payer =
      members.find(
        (member) =>
          member.id ===
          payers[0].memberId,
      )

    if (!payer) {
      return result
    }

    for (const split of splits) {
      /*
       * El pagador no se debe
       * dinero a sí mismo.
       */
      if (
        split.memberId ===
        payer.id
      ) {
        continue
      }

      const from =
        members.find(
          (member) =>
            member.id ===
            split.memberId,
        )

      if (!from) {
        continue
      }

      result.push({
        expense,
        from,
        to: payer,
        amount:
          fromCents(
            cents(
              split.amount,
            ),
          ),
      })
    }

    return result
  }

  /*
   * ----------------------------------------
   * VARIOS PAGADORES
   * ----------------------------------------
   */
  const totalPaidCents =
    payers.reduce(
      (sum, payer) =>
        sum +
        cents(
          payer.amount,
        ),
      0,
    )

  if (totalPaidCents <= 0) {
    return result
  }

  for (const split of splits) {
    const from =
      members.find(
        (member) =>
          member.id ===
          split.memberId,
      )

    if (!from) {
      continue
    }

    const eligiblePayers =
      payers.filter(
        (payer) =>
          payer.memberId !==
          split.memberId,
      )

    if (
      eligiblePayers.length ===
      0
    ) {
      continue
    }

    let remaining =
      cents(
        split.amount,
      )

    for (
      let index = 0;
      index <
      eligiblePayers.length;
      index++
    ) {
      const payer =
        eligiblePayers[index]

      const to =
        members.find(
          (member) =>
            member.id ===
            payer.memberId,
        )

      if (!to) {
        continue
      }

      let share = 0

      if (
        index ===
        eligiblePayers.length - 1
      ) {
        /*
         * El último recibe todo
         * lo que haya quedado para
         * evitar errores de redondeo.
         */
        share = remaining
      } else {
        share = Math.floor(
          (
            cents(
              split.amount,
            ) *
            cents(
              payer.amount,
            )
          ) /
            totalPaidCents,
        )

        share = Math.min(
          share,
          remaining,
        )
      }

      remaining -= share

      if (share <= 0) {
        continue
      }

      result.push({
        expense,
        from,
        to,
        amount:
          fromCents(share),
      })
    }
  }

  return result
}

/*
 * ==========================================
 * DEUDAS PENDIENTES POR GASTO
 * ==========================================
 *
 * Un pago se descuenta únicamente
 * del gasto al que pertenece.
 */
export function outstandingExpenseDebts(
  members: Group['members'],
  expenses: Expense[],
  payments: Payment[],
): ExpenseDebt[] {
  const result: ExpenseDebt[] = []

  for (const expense of expenses) {
    const debts =
      expenseDebts(
        expense,
        members,
      )

    for (const debt of debts) {
      let remaining =
        cents(
          debt.amount,
        )

      /*
       * Buscamos solamente pagos:
       *
       * - del mismo gasto
       * - del mismo deudor
       * - al mismo acreedor
       */
      const relatedPayments =
        payments.filter(
          (payment) =>
            payment.expenseId ===
              expense.id &&
            payment.fromId ===
              debt.from.id &&
            payment.toId ===
              debt.to.id,
        )

      for (
        const payment of
          relatedPayments
      ) {
        remaining -=
          cents(
            payment.amount,
          )
      }

      remaining = Math.max(
        0,
        remaining,
      )

      if (remaining <= 0) {
        continue
      }

      result.push({
        expense:
          debt.expense,
        from: debt.from,
        to: debt.to,
        amount:
          fromCents(remaining),
      })
    }
  }

  return result
}

/*
 * ==========================================
 * DEUDAS DIRECTAS
 * ==========================================
 *
 * NO hacemos una compensación global.
 *
 * Sí compensamos dentro de la misma
 * pareja de personas.
 *
 * Ejemplo:
 *
 * Juan -> Martín 18.333
 * Martín -> Juan 7.407
 *
 * Resultado:
 *
 * Juan -> Martín 10.925
 *
 * Pero esto no modifica:
 *
 * Sofía -> Juan
 * Sofía -> Martín
 */
export function settlements(
  members: Group['members'],
  expenses: Expense[],
  payments: Payment[],
): Settlement[] {
  const pairNet: Record<
    string,
    Record<string, number>
  > = {}

  /*
   * Inicializamos las parejas.
   */
  for (const member of members) {
    pairNet[member.id] = {}

    for (const other of members) {
      pairNet[member.id][
        other.id
      ] = 0
    }
  }

  /*
   * Obtenemos las deudas
   * pendientes de cada gasto.
   */
  const outstanding =
    outstandingExpenseDebts(
      members,
      expenses,
      payments,
    )

  /*
   * Acumulamos por pareja.
   */
  for (const debt of outstanding) {
    const amount =
      cents(
        debt.amount,
      )

    pairNet[debt.from.id][
      debt.to.id
    ] += amount

    pairNet[debt.to.id][
      debt.from.id
    ] -= amount
  }

  const result: Settlement[] =
    []

  /*
   * Cada pareja se analiza
   * una sola vez.
   */
  for (
    let i = 0;
    i < members.length;
    i++
  ) {
    for (
      let j = i + 1;
      j < members.length;
      j++
    ) {
      const first =
        members[i]

      const second =
        members[j]

      const net =
        pairNet[first.id][
          second.id
        ]

      /*
       * first le debe a second.
       */
      if (net > 0) {
        result.push({
          from: first,
          to: second,
          amount:
            fromCents(net),
        })
      }

      /*
       * second le debe a first.
       */
      if (net < 0) {
        result.push({
          from: second,
          to: first,
          amount:
            fromCents(
              Math.abs(net),
            ),
        })
      }
    }
  }

  /*
   * Ordenamos por persona
   * que tiene que pagar.
   */
  result.sort((a, b) => {
    const byFrom =
      a.from.name.localeCompare(
        b.from.name,
        'es',
      )

    if (byFrom !== 0) {
      return byFrom
    }

    return a.to.name.localeCompare(
      b.to.name,
      'es',
    )
  })

  return result
}