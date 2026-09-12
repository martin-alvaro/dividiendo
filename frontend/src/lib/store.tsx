/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type {
  Account,
  AppData,
  Expense,
  Group,
  GroupInvitation,
  Member,
  Payment,
  User,
} from './types'

const KEY = 'mitimiti-data-v3'

const MEMBER_COLORS = [
  '#15803d',
  '#0f766e',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#2563eb',
  '#ca8a04',
  '#0891b2',
]

const starterAccounts: Account[] = [
  {
    id: 'martin',
    name: 'Martín',
    email: 'martin@mitimiti.local',
    password: '123456',
  },
  {
    id: 'juan',
    name: 'Juan',
    email: 'juan@example.com',
    password: '123456',
  },
  {
    id: 'sofi',
    name: 'Sofía',
    email: 'sofia@example.com',
    password: '123456',
  },
]

const starterMembers: Member[] = [
  {
    id: 'martin',
    name: 'Martín',
    email: 'martin@mitimiti.local',
    color: '#15803d',
  },
  {
    id: 'juan',
    name: 'Juan',
    email: 'juan@example.com',
    color: '#0f766e',
  },
  {
    id: 'sofi',
    name: 'Sofía',
    email: 'sofia@example.com',
    color: '#7c3aed',
  },
]

const starter: AppData = {
  user: {
    id: 'martin',
    name: 'Martín',
    email: 'martin@mitimiti.local',
  },

  accounts: starterAccounts,

  groups: [
    {
      id: 'casa',
      name: 'Departamento',
      emoji: '🏠',
      ownerId: 'martin',
      members: starterMembers,
      createdAt: '2026-09-01',
    },
  ],

  expenses: [
    {
      id: 'luz',
      groupId: 'casa',
      description: 'Factura de luz',
      amount: 25000,
      date: '2026-09-08',

      payers: [
        {
          memberId: 'martin',
          amount: 25000,
        },
      ],

      splits: [
        {
          memberId: 'martin',
          amount: 8333.34,
        },
        {
          memberId: 'juan',
          amount: 8333.33,
        },
        {
          memberId: 'sofi',
          amount: 8333.33,
        },
      ],

      createdAt:
        '2026-09-08T12:00:00.000Z',
    },
  ],

  /*
   * El starter empieza sin pagos.
   */
  payments: [],

  invitations: [],
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)

    if (!raw) {
      return starter
    }

    const parsed = JSON.parse(raw) as AppData

    if (
      !parsed.accounts ||
      !parsed.invitations
    ) {
      return starter
    }

    /*
     * Migración de grupos viejos.
     */
    const migratedGroups =
      parsed.groups.map((group) => {
        const ownerId =
          group.ownerId ??
          group.members[0]?.id ??
          parsed.user.id

        const members =
          normalizeMemberColors(
            group.members,
          )

        return {
          ...group,
          ownerId,
          members,
        }
      })

    /*
     * IMPORTANTE:
     *
     * Los pagos anteriores que no tengan
     * expenseId ya no son válidos porque
     * no sabemos a qué gasto pertenecen.
     *
     * Esto elimina también el viejo pago
     * de $9.259,32 que tenías guardado.
     */
    const normalizedPayments =
      parsed.payments.filter(
        (payment) =>
          typeof payment.expenseId ===
            'string' &&
          payment.expenseId.length > 0,
      )

    const normalizedData: AppData = {
      ...parsed,
      groups: migratedGroups,
      payments: normalizedPayments,
    }

    localStorage.setItem(
      KEY,
      JSON.stringify(
        normalizedData,
      ),
    )

    return normalizedData
  } catch {
    return starter
  }
}

type Store = {
  data: AppData
  authenticated: boolean

  login: (
    email: string,
    password: string,
  ) => string | null

  register: (
    name: string,
    email: string,
    password: string,
  ) => string | null

  logout: () => void

  addGroup: (
    name: string,
    emoji: string,
    nextMembers: Member[],
  ) => Group

  inviteToGroup: (
    groupId: string,
    email: string,
  ) => string | null

  acceptInvitation: (
    invitationId: string,
  ) => string | null

  rejectInvitation: (
    invitationId: string,
  ) => string | null

  addExpense: (
    expense: Omit<
      Expense,
      'id' | 'createdAt'
    >,
  ) => void

  addPayment: (
    payment: Omit<Payment, 'id'>,
  ) => void

  deleteExpense: (
    id: string,
  ) => void

  deletePayment: (
    id: string,
  ) => void

  deleteGroup: (
    id: string,
  ) => string | null

  leaveGroup: (
    groupId: string,
  ) => string | null
}

const Ctx =
  createContext<Store | null>(null)

export function StoreProvider({
  children,
}: {
  children: ReactNode
}) {
  const [data, setData] =
    useState<AppData>(load)

  const [authenticated, setAuthenticated] =
    useState(
      () =>
        sessionStorage.getItem(
          'mitimiti-auth',
        ) === 'true',
    )

  const update = (next: AppData) => {
    setData(next)

    localStorage.setItem(
      KEY,
      JSON.stringify(next),
    )
  }

  const value = useMemo<Store>(
    () => ({
      data,
      authenticated,

      login: (email, password) => {
        const normalizedEmail =
          email.trim().toLowerCase()

        if (
          !normalizedEmail.includes('@') ||
          password.length < 6
        ) {
          return 'Ingresá un email válido y una contraseña de al menos 6 caracteres.'
        }

        const account =
          data.accounts.find(
            (item) =>
              item.email.toLowerCase() ===
              normalizedEmail,
          )

        if (!account) {
          return 'No existe una cuenta con ese email.'
        }

        if (
          account.password !==
          password
        ) {
          return 'La contraseña es incorrecta.'
        }

        const user: User = {
          id: account.id,
          name: account.name,
          email: account.email,
        }

        update({
          ...data,
          user,
        })

        sessionStorage.setItem(
          'mitimiti-auth',
          'true',
        )

        setAuthenticated(true)

        return null
      },

      register: (
        name,
        email,
        password,
      ) => {
        const normalizedEmail =
          email.trim().toLowerCase()

        if (
          name.trim().length < 2 ||
          !normalizedEmail.includes('@') ||
          password.length < 6
        ) {
          return 'Completá nombre, email válido y una contraseña de al menos 6 caracteres.'
        }

        const alreadyExists =
          data.accounts.some(
            (account) =>
              account.email.toLowerCase() ===
              normalizedEmail,
          )

        if (alreadyExists) {
          return 'Ya existe una cuenta con ese email.'
        }

        const user: User = {
          id: crypto.randomUUID(),
          name: name.trim(),
          email: normalizedEmail,
        }

        const account: Account = {
          ...user,
          password,
        }

        update({
          ...data,
          user,
          accounts: [
            ...data.accounts,
            account,
          ],
        })

        sessionStorage.setItem(
          'mitimiti-auth',
          'true',
        )

        setAuthenticated(true)

        return null
      },

      logout: () => {
        sessionStorage.removeItem(
          'mitimiti-auth',
        )

        setAuthenticated(false)
      },

      addGroup: (
        name,
        emoji,
        nextMembers,
      ) => {
        const group: Group = {
          id: crypto.randomUUID(),
          name: name.trim(),
          emoji,
          ownerId: data.user.id,
          members:
            normalizeMemberColors(
              nextMembers,
            ),
          createdAt:
            new Date().toISOString(),
        }

        update({
          ...data,
          groups: [
            ...data.groups,
            group,
          ],
        })

        return group
      },

      inviteToGroup: (
        groupId,
        email,
      ) => {
        const normalizedEmail =
          email.trim().toLowerCase()

        const group =
          data.groups.find(
            (item) =>
              item.id === groupId,
          )

        if (!group) {
          return 'No encontramos ese grupo.'
        }

        if (
          group.ownerId !==
          data.user.id
        ) {
          return 'Solo el creador del grupo puede enviar invitaciones.'
        }

        const account =
          data.accounts.find(
            (item) =>
              item.email.toLowerCase() ===
              normalizedEmail,
          )

        if (!account) {
          return 'No existe una cuenta con ese email.'
        }

        const alreadyMember =
          group.members.some(
            (member) =>
              member.id ===
              account.id,
          )

        if (alreadyMember) {
          return 'Esta persona ya forma parte del grupo.'
        }

        const existingInvitation =
          data.invitations.find(
            (invitation) =>
              invitation.groupId ===
                groupId &&
              invitation.toUserId ===
                account.id &&
              invitation.status ===
                'pending',
          )

        if (existingInvitation) {
          return 'Ya existe una invitación pendiente para esta persona.'
        }

        const invitation: GroupInvitation =
          {
            id: crypto.randomUUID(),
            groupId,
            fromUserId: data.user.id,
            toUserId: account.id,
            status: 'pending',
            createdAt:
              new Date().toISOString(),
          }

        update({
          ...data,
          invitations: [
            ...data.invitations,
            invitation,
          ],
        })

        return null
      },

      acceptInvitation: (
        invitationId,
      ) => {
        const invitation =
          data.invitations.find(
            (item) =>
              item.id ===
              invitationId,
          )

        if (!invitation) {
          return 'No encontramos esa invitación.'
        }

        if (
          invitation.toUserId !==
          data.user.id
        ) {
          return 'Esta invitación no pertenece a tu cuenta.'
        }

        if (
          invitation.status !==
          'pending'
        ) {
          return 'Esta invitación ya fue respondida.'
        }

        const group =
          data.groups.find(
            (item) =>
              item.id ===
              invitation.groupId,
          )

        if (!group) {
          return 'El grupo ya no existe.'
        }

        const account =
          data.accounts.find(
            (item) =>
              item.id ===
              data.user.id,
          )

        if (!account) {
          return 'No encontramos tu cuenta.'
        }

        const newMember: Member = {
          id: account.id,
          name: account.name,
          email: account.email,
          color:
            getAvailableMemberColor(
              group.members,
            ),
        }

        const updatedGroups =
          data.groups.map(
            (currentGroup) => {
              if (
                currentGroup.id !==
                group.id
              ) {
                return currentGroup
              }

              const alreadyMember =
                currentGroup.members.some(
                  (member) =>
                    member.id ===
                    account.id,
                )

              if (alreadyMember) {
                return currentGroup
              }

              return {
                ...currentGroup,
                members:
                  normalizeMemberColors(
                    [
                      ...currentGroup.members,
                      newMember,
                    ],
                  ),
              }
            },
          )

        const updatedInvitations =
          data.invitations.map(
            (currentInvitation) =>
              currentInvitation.id ===
              invitationId
                ? {
                    ...currentInvitation,
                    status:
                      'accepted' as const,
                  }
                : currentInvitation,
          )

        update({
          ...data,
          groups: updatedGroups,
          invitations:
            updatedInvitations,
        })

        return null
      },

      rejectInvitation: (
        invitationId,
      ) => {
        const invitation =
          data.invitations.find(
            (item) =>
              item.id ===
              invitationId,
          )

        if (!invitation) {
          return 'No encontramos esa invitación.'
        }

        if (
          invitation.toUserId !==
          data.user.id
        ) {
          return 'Esta invitación no pertenece a tu cuenta.'
        }

        if (
          invitation.status !==
          'pending'
        ) {
          return 'Esta invitación ya fue respondida.'
        }

        update({
          ...data,
          invitations:
            data.invitations.map(
              (currentInvitation) =>
                currentInvitation.id ===
                invitationId
                  ? {
                      ...currentInvitation,
                      status:
                        'rejected' as const,
                    }
                  : currentInvitation,
            ),
        })

        return null
      },

      addExpense: (expense) => {
        const newExpense: Expense = {
          ...expense,
          id: crypto.randomUUID(),
          createdAt:
            new Date().toISOString(),
        }

        update({
          ...data,
          expenses: [
            newExpense,
            ...data.expenses,
          ],
        })
      },

      /*
       * Los pagos nuevos SIEMPRE llegan
       * con expenseId.
       */
      addPayment: (payment) => {
        const newPayment: Payment = {
          ...payment,
          id: crypto.randomUUID(),
        }

        update({
          ...data,
          payments: [
            newPayment,
            ...data.payments,
          ],
        })
      },

      /*
       * Al borrar un gasto,
       * borramos también los pagos
       * asociados a ese gasto.
       */
      deleteExpense: (id) => {
        update({
          ...data,

          expenses:
            data.expenses.filter(
              (expense) =>
                expense.id !== id,
            ),

          payments:
            data.payments.filter(
              (payment) =>
                payment.expenseId !==
                id,
            ),
        })
      },

      deletePayment: (id) => {
        update({
          ...data,
          payments:
            data.payments.filter(
              (payment) =>
                payment.id !== id,
            ),
        })
      },

      deleteGroup: (id) => {
        const group =
          data.groups.find(
            (item) =>
              item.id === id,
          )

        if (!group) {
          return 'No encontramos ese grupo.'
        }

        if (
          group.ownerId !==
          data.user.id
        ) {
          return 'Solo el creador del grupo puede eliminarlo.'
        }

        update({
          ...data,

          groups:
            data.groups.filter(
              (item) =>
                item.id !== id,
            ),

          expenses:
            data.expenses.filter(
              (expense) =>
                expense.groupId !== id,
            ),

          payments:
            data.payments.filter(
              (payment) =>
                payment.groupId !== id,
            ),

          invitations:
            data.invitations.filter(
              (invitation) =>
                invitation.groupId !==
                id,
            ),
        })

        return null
      },

      leaveGroup: (groupId) => {
        const group =
          data.groups.find(
            (item) =>
              item.id === groupId,
          )

        if (!group) {
          return 'No encontramos ese grupo.'
        }

        const isMember =
          group.members.some(
            (member) =>
              member.id ===
              data.user.id,
          )

        if (!isMember) {
          return 'No formás parte de este grupo.'
        }

        if (
          group.members.length === 1
        ) {
          return 'Sos el único integrante. Para salir tendrías que eliminar el grupo.'
        }

        /*
         * Para salir usamos el saldo individual
         * de gastos y pagos.
         */
        const groupExpenses =
          data.expenses.filter(
            (expense) =>
              expense.groupId ===
              groupId,
          )

        const groupPayments =
          data.payments.filter(
            (payment) =>
              payment.groupId ===
              groupId,
          )

        const myBalance =
          getBalanceForMember(
            groupExpenses,
            groupPayments,
            data.user.id,
          )

        if (
          Math.abs(myBalance) >
          0.009
        ) {
          return `No podés salir todavía porque tu balance es ${formatMoney(
            myBalance,
          )}. Primero tenés que saldar tus cuentas.`
        }

        const remainingMembers =
          group.members.filter(
            (member) =>
              member.id !==
              data.user.id,
          )

        const newOwnerId =
          group.ownerId ===
          data.user.id
            ? remainingMembers[0].id
            : group.ownerId

        const updatedGroups =
          data.groups.map(
            (currentGroup) =>
              currentGroup.id ===
              groupId
                ? {
                    ...currentGroup,
                    ownerId:
                      newOwnerId,
                    members:
                      remainingMembers,
                  }
                : currentGroup,
          )

        update({
          ...data,
          groups:
            updatedGroups,
        })

        return null
      },
    }),

    [data, authenticated],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  )
}

function getAvailableMemberColor(
  members: Member[],
) {
  const usedColors = new Set(
    members.map(
      (member) =>
        member.color,
    ),
  )

  const availableColor =
    MEMBER_COLORS.find(
      (color) =>
        !usedColors.has(color),
    )

  return (
    availableColor ??
    MEMBER_COLORS[
      members.length %
        MEMBER_COLORS.length
    ]
  )
}

function normalizeMemberColors(
  members: Member[],
) {
  const usedColors =
    new Set<string>()

  return members.map(
    (member) => {
      if (
        member.color &&
        !usedColors.has(
          member.color,
        )
      ) {
        usedColors.add(
          member.color,
        )

        return member
      }

      const newColor =
        MEMBER_COLORS.find(
          (color) =>
            !usedColors.has(
              color,
            ),
        ) ??
        MEMBER_COLORS[
          usedColors.size %
            MEMBER_COLORS.length
        ]

      usedColors.add(newColor)

      return {
        ...member,
        color: newColor,
      }
    },
  )
}

function getBalanceForMember(
  expenses: Expense[],
  payments: Payment[],
  memberId: string,
) {
  let balance = 0

  for (const expense of expenses) {
    for (const payer of expense.payers) {
      if (
        payer.memberId ===
        memberId
      ) {
        balance +=
          payer.amount
      }
    }

    for (const split of expense.splits) {
      if (
        split.memberId ===
        memberId
      ) {
        balance -=
          split.amount
      }
    }
  }

  for (const payment of payments) {
    if (
      payment.fromId ===
      memberId
    ) {
      balance +=
        payment.amount
    }

    if (
      payment.toId ===
      memberId
    ) {
      balance -=
        payment.amount
    }
  }

  return (
    Math.round(
      balance * 100,
    ) / 100
  )
}

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    'es-AR',
    {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    },
  ).format(value)
}

export function useStore() {
  const store = useContext(Ctx)

  if (!store) {
    throw new Error(
      'StoreProvider missing',
    )
  }

  return store
}