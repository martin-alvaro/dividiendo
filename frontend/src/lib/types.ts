export type Member = {
  id: string
  name: string
  email: string
  color: string
}

export type Group = {
  id: string
  name: string
  emoji: string
  ownerId: string
  members: Member[]
  createdAt: string
}

export type Payer = {
  memberId: string
  amount: number
}

export type Split = {
  memberId: string
  amount: number
}

export type Expense = {
  id: string
  groupId: string
  description: string
  amount: number
  date: string
  payers: Payer[]
  splits: Split[]
  uploadedById?: string
  receiptName?: string
  receiptData?: string
  createdAt: string
}

export type Payment = {
  id: string

  /*
   * El pago pertenece a un gasto concreto.
   */
  expenseId: string

  groupId: string

  /*
   * Persona que paga.
   */
  fromId: string

  /*
   * Persona que recibe.
   */
  toId: string

  amount: number
  date: string
  note?: string
}

export type User = {
  id: string
  name: string
  email: string
}

export type Account = User & {
  password: string
}

export type GroupInvitation = {
  id: string
  groupId: string
  fromUserId: string
  toUserId: string
  status:
    | 'pending'
    | 'accepted'
    | 'rejected'
  createdAt: string
}

export type AppData = {
  user: User
  accounts: Account[]
  groups: Group[]
  expenses: Expense[]
  payments: Payment[]
  invitations: GroupInvitation[]
}