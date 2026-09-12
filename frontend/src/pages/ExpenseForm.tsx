import {
  CalendarDays,
  CheckCircle2,
  FileText,
  ImagePlus,
  LoaderCircle,
  Paperclip,
  Receipt,
  Save,
  Users,
  WalletCards,
} from 'lucide-react'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import { Shell } from '../components/Shell'
import { useStore } from '../lib/store'
import { readReceipt } from '../lib/ocr'

export default function ExpenseForm() {
  const {
    data,
    addExpense,
  } = useStore()

  const nav = useNavigate()

  const [searchParams] =
    useSearchParams()

  const groupFromUrl =
    searchParams.get('group')

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
    [
      data.groups,
      data.user.id,
    ],
  )

  /*
   * =====================================================
   * GRUPO INICIAL
   * =====================================================
   */

  const initialGroupId =
    useMemo(() => {
      const requestedGroup =
        myGroups.find(
          (group) =>
            group.id ===
            groupFromUrl,
        )

      return (
        requestedGroup?.id ??
        myGroups[0]?.id ??
        ''
      )
    }, [
      myGroups,
      groupFromUrl,
    ])

  const [
    groupId,
    setGroupId,
  ] = useState(
    initialGroupId,
  )

  useEffect(() => {
    setGroupId(
      initialGroupId,
    )
  }, [initialGroupId])

  const group =
    useMemo(
      () =>
        myGroups.find(
          (currentGroup) =>
            currentGroup.id ===
            groupId,
        ),
      [
        myGroups,
        groupId,
      ],
    )

  /*
   * =====================================================
   * GRUPO BLOQUEADO
   * =====================================================
   *
   * Cuando venimos desde:
   *
   * /expenses/new?group=...
   *
   * no permitimos cambiar de grupo.
   */

  const groupLocked =
    Boolean(groupFromUrl) &&
    Boolean(
      myGroups.some(
        (currentGroup) =>
          currentGroup.id ===
          groupFromUrl,
      ),
    )

  /*
   * =====================================================
   * DATOS DEL FORMULARIO
   * =====================================================
   */

  const [
    description,
    setDescription,
  ] = useState('')

  const [
    amountInput,
    setAmountInput,
  ] = useState('')

  const [date, setDate] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 10),
    )

  const [
    payers,
    setPayers,
  ] = useState<
    Record<string, number>
  >({})

  const [
    participants,
    setParticipants,
  ] = useState<string[]>(
    [],
  )

  const [
    error,
    setError,
  ] = useState('')

  /*
   * =====================================================
   * COMPROBANTE
   * =====================================================
   */

  const [
    receiptData,
    setReceiptData,
  ] = useState<
    string | undefined
  >()

  const [
    receiptName,
    setReceiptName,
  ] = useState<
    string | undefined
  >()

  /*
   * =====================================================
   * OCR
   * =====================================================
   */

  const [
    ocrLoading,
    setOcrLoading,
  ] = useState(false)

  const [
    ocrMessage,
    setOcrMessage,
  ] = useState('')

  const [
    ocrDetected,
    setOcrDetected,
  ] = useState(false)

  /*
   * =====================================================
   * CUANDO CAMBIA EL GRUPO
   * =====================================================
   */

  useEffect(() => {
    if (!group) {
      setPayers({})
      setParticipants([])
      return
    }

    const currentUserIsMember =
      group.members.some(
        (member) =>
          member.id ===
          data.user.id,
      )

    /*
     * El usuario actual queda
     * seleccionado inicialmente
     * como pagador.
     */

    setPayers(
      currentUserIsMember
        ? {
            [data.user.id]:
              0,
          }
        : {},
    )

    /*
     * Todos los integrantes
     * participan inicialmente.
     */

    setParticipants(
      group.members.map(
        (member) =>
          member.id,
      ),
    )

    setError('')
  }, [
    groupId,
    group,
    data.user.id,
  ])

  /*
   * =====================================================
   * CAMBIAR GRUPO
   * =====================================================
   */

  const changeGroup = (
    id: string,
  ) => {
    if (groupLocked) {
      return
    }

    setGroupId(id)
    setError('')
  }

  /*
   * =====================================================
   * PAGADORES
   * =====================================================
   */

  const togglePayer = (
    id: string,
  ) => {
    setPayers(
      (current) => {
        const next = {
          ...current,
        }

        if (id in next) {
          delete next[id]
        } else {
          next[id] = 0
        }

        return next
      },
    )
  }

  const changePayerAmount = (
    id: string,
    value: string,
  ) => {
    const amount =
      value === ''
        ? 0
        : Number(value)

    setPayers(
      (current) => ({
        ...current,

        [id]: Number.isFinite(
          amount,
        )
          ? amount
          : 0,
      }),
    )
  }

  /*
   * =====================================================
   * PARTICIPANTES
   * =====================================================
   */

  const toggleParticipant = (
    id: string,
  ) => {
    setParticipants(
      (current) =>
        current.includes(id)
          ? current.filter(
              (memberId) =>
                memberId !==
                id,
            )
          : [
              ...current,
              id,
            ],
    )
  }

  /*
   * =====================================================
   * DIVISIÓN EQUITATIVA
   * =====================================================
   */

  const calculateSplits = (
    amount: number,
  ) => {
    if (!participants.length) {
      return []
    }

    const totalCents =
      Math.round(
        amount * 100,
      )

    const baseCents =
      Math.floor(
        totalCents /
          participants.length,
      )

    const remainder =
      totalCents %
      participants.length

    return participants.map(
      (
        memberId,
        index,
      ) => ({
        memberId,
        amount:
          (
            baseCents +
            (
              index <
              remainder
                ? 1
                : 0
            )
          ) / 100,
      }),
    )
  }

  /*
   * =====================================================
   * COMPROBANTE + OCR
   * =====================================================
   */

  const handleReceipt =
    async (
      file:
        | File
        | undefined,
    ) => {
      if (!file) {
        setReceiptData(
          undefined,
        )

        setReceiptName(
          undefined,
        )

        setOcrMessage('')
        setOcrDetected(false)

        return
      }

      setReceiptName(
        file.name,
      )

      setOcrMessage('')
      setOcrDetected(false)
      setError('')

      /*
       * Guardamos la imagen como
       * Data URL para la demo.
       */

      if (
        file.type.startsWith(
          'image/',
        )
      ) {
        const reader =
          new FileReader()

        reader.onload = () => {
          setReceiptData(
            String(
              reader.result,
            ),
          )
        }

        reader.readAsDataURL(
          file,
        )
      } else {
        setReceiptData(
          undefined,
        )
      }

      /*
       * OCR actualmente solamente
       * funciona con imágenes.
       */

      if (
        !file.type.startsWith(
          'image/',
        )
      ) {
        setOcrMessage(
          'Por ahora el reconocimiento automático funciona con imágenes.',
        )

        return
      }

      setOcrLoading(true)

      setOcrMessage(
        'Leyendo comprobante...',
      )

      try {
        const result =
          await readReceipt(
            file,
          )

        /*
         * COMERCIO
         */

        if (result.merchant) {
          setDescription(
            result.merchant,
          )
        }

        /*
         * TOTAL
         */

        if (
          result.amount !==
          undefined
        ) {
          setAmountInput(
            String(
              result.amount,
            ),
          )
        }

        /*
         * FECHA
         */

        if (result.date) {
          setDate(
            result.date,
          )
        }

        setOcrDetected(
          true,
        )

        setOcrMessage(
          'Datos detectados. Revisalos antes de guardar.',
        )
      } catch {
        setOcrMessage(
          'No pudimos leer automáticamente el comprobante. Podés completar los datos manualmente.',
        )
      } finally {
        setOcrLoading(
          false,
        )
      }
    }

  /*
   * =====================================================
   * GUARDAR GASTO
   * =====================================================
   */

  const submit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')

    const amount =
      Number(amountInput)

    const payerEntries =
      Object.entries(
        payers,
      )

    const totalPaid =
      payerEntries.reduce(
        (
          total,
          [, value],
        ) =>
          total + value,
        0,
      )

    /*
     * GRUPO
     */

    if (!group) {
      setError(
        'Elegí un grupo válido.',
      )

      return
    }

    /*
     * CONCEPTO
     */

    if (
      !description.trim()
    ) {
      setError(
        'Ingresá un concepto para el gasto.',
      )

      return
    }

    /*
     * IMPORTE
     */

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0
    ) {
      setError(
        'El importe debe ser mayor a $0.',
      )

      return
    }

    /*
     * FECHA
     */

    if (!date) {
      setError(
        'Elegí una fecha.',
      )

      return
    }

    /*
     * PAGADORES
     */

    if (
      !payerEntries.length
    ) {
      setError(
        'Seleccioná al menos un pagador.',
      )

      return
    }

    const hasInvalidPayer =
      payerEntries.some(
        ([, value]) =>
          value <= 0,
      )

    if (hasInvalidPayer) {
      setError(
        'Cada persona seleccionada como pagador debe tener un importe mayor a $0.',
      )

      return
    }

    /*
     * PARTICIPANTES
     */

    if (
      !participants.length
    ) {
      setError(
        'Seleccioná al menos un participante.',
      )

      return
    }

    /*
     * COMPARAR TOTAL PAGADO
     * CONTRA TOTAL DEL GASTO
     */

    const difference =
      Math.round(
        (totalPaid -
          amount) *
          100,
      ) / 100

    if (
      difference !== 0
    ) {
      setError(
        `Los pagos suman ${formatMoney(
          totalPaid,
        )} y el gasto es de ${formatMoney(
          amount,
        )}. Los importes tienen que coincidir.`,
      )

      return
    }

    /*
     * DIVISIÓN
     */

    const splits =
      calculateSplits(
        amount,
      )

    /*
     * GUARDAR
     *
     * uploadedById:
     * quién subió el comprobante.
     *
     * payers:
     * quién realmente pagó.
     */

    addExpense({
      groupId,

      description:
        description.trim(),

      amount,

      date,

      uploadedById:
        receiptData
          ? data.user.id
          : undefined,

      payers:
        payerEntries.map(
          ([
            memberId,
            payerAmount,
          ]) => ({
            memberId,
            amount:
              payerAmount,
          }),
        ),

      splits,

      receiptName,

      receiptData,
    })

    nav(
      `/groups/${groupId}`,
    )
  }

  /*
   * =====================================================
   * TOTALES VISUALES
   * =====================================================
   */

  const totalPaid =
    Object.values(
      payers,
    ).reduce(
      (
        total,
        amount,
      ) =>
        total + amount,
      0,
    )

  const amountValue =
    Number(
      amountInput,
    ) || 0

  const remaining =
    Math.round(
      (amountValue -
        totalPaid) *
        100,
    ) / 100

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <Shell title="Nuevo gasto">
      <section className="page">

        <form
          className="entry-form expense-form-modern"
          onSubmit={submit}
        >

          {/* =================================================
              ERROR
          ================================================== */}

          {error && (
            <div
              className="form-error expense-alert"
              role="alert"
            >
              <span>
                ⚠️
              </span>

              <span>
                {error}
              </span>
            </div>
          )}

          {/* =================================================
              CABECERA
          ================================================== */}

          <div className="expense-form-header">
            <div className="expense-form-header-icon">
              <Receipt
                size={25}
                strokeWidth={2}
              />
            </div>

            <div>
              <h2>
                Registrar gasto
              </h2>

              <p>
                Cargá los datos y MitiMiti
                se ocupa de dividir la cuenta.
              </p>
            </div>
          </div>

          {/* =================================================
              GRUPO
          ================================================== */}

          <section className="expense-section">

            <div className="expense-section-heading">
              <div className="expense-section-icon">
                <Users
                  size={18}
                  strokeWidth={2}
                />
              </div>

              <div>
                <h3>
                  Grupo
                </h3>

                <p>
                  ¿En qué grupo corresponde
                  este gasto?
                </p>
              </div>
            </div>

            {groupLocked &&
            group ? (
              <div className="locked-group-card">
                <span className="locked-group-emoji">
                  {group.emoji}
                </span>

                <div>
                  <strong>
                    {group.name}
                  </strong>

                  <small>
                    Este gasto se registrará
                    en este grupo.
                  </small>
                </div>

                <span className="locked-group-badge">
                  Fijo
                </span>
              </div>
            ) : (
              <label className="modern-field">
                <span>
                  Elegí un grupo
                </span>

                <div className="modern-input-wrap">
                  <Users
                    size={17}
                    strokeWidth={2}
                  />

                  <select
                    value={groupId}
                    onChange={(
                      event,
                    ) =>
                      changeGroup(
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    {myGroups.map(
                      (
                        currentGroup,
                      ) => (
                        <option
                          key={
                            currentGroup.id
                          }
                          value={
                            currentGroup.id
                          }
                        >
                          {
                            currentGroup.emoji
                          }{' '}
                          {
                            currentGroup.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </label>
            )}
          </section>

          {/* =================================================
              CONCEPTO / IMPORTE / FECHA
          ================================================== */}

          <section className="expense-section">

            <div className="expense-section-heading">
              <div className="expense-section-icon">
                <FileText
                  size={18}
                  strokeWidth={2}
                />
              </div>

              <div>
                <h3>
                  Datos del gasto
                </h3>

                <p>
                  Podés modificarlos si el OCR
                  los detectó automáticamente.
                </p>
              </div>
            </div>

            <label className="modern-field">
              <span>
                Concepto
              </span>

              <div className="modern-input-wrap">
                <FileText
                  size={17}
                  strokeWidth={2}
                />

                <input
                  name="description"
                  required
                  value={
                    description
                  }
                  onChange={(
                    event,
                  ) =>
                    setDescription(
                      event
                        .target
                        .value,
                    )
                  }
                  placeholder="Ej. Cena del viernes"
                />
              </div>
            </label>

            <div className="expense-two-columns">

              <label className="modern-field">
                <span>
                  Importe
                </span>

                <div className="modern-input-wrap amount-input-wrap">
                  <span className="currency-prefix">
                    $
                  </span>

                  <input
                    name="amount"
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0"
                    value={
                      amountInput
                    }
                    onChange={(
                      event,
                    ) =>
                      setAmountInput(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>
              </label>

              <label className="modern-field">
                <span>
                  Fecha
                </span>

                <div className="modern-input-wrap">
                  <CalendarDays
                    size={17}
                    strokeWidth={2}
                  />

                  <input
                    name="date"
                    required
                    type="date"
                    value={date}
                    onChange={(
                      event,
                    ) =>
                      setDate(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>
              </label>

            </div>
          </section>

          {/* =================================================
              PAGADORES
          ================================================== */}

          <fieldset className="expense-section expense-fieldset">

            <legend>
              <span className="expense-section-icon">
                <WalletCards
                  size={18}
                  strokeWidth={2}
                />
              </span>

              <span>
                <b>
                  ¿Quién pagó?
                </b>

                <small>
                  Seleccioná una o varias personas
                  e indicá cuánto pagó cada una.
                </small>
              </span>
            </legend>

            <div className="payer-list">

              {group?.members.map(
                (member) => {
                  const selected =
                    member.id in
                    payers

                  return (
                    <div
                      className={`payer-card ${
                        selected
                          ? 'selected'
                          : ''
                      }`}
                      key={
                        member.id
                      }
                    >

                      <label className="modern-check-card">
                        <input
                          type="checkbox"
                          checked={
                            selected
                          }
                          onChange={() =>
                            togglePayer(
                              member.id,
                            )
                          }
                        />

                        <span className="check-custom">
                          {selected && (
                            <CheckCircle2
                              size={17}
                              strokeWidth={2.4}
                            />
                          )}
                        </span>

                        <span className="member-color-dot">
                          {member.name[0]}
                        </span>

                        <span className="member-name">
                          {member.name}
                        </span>
                      </label>

                      {selected && (
                        <div className="payer-amount-wrap">
                          <span>
                            $
                          </span>

                          <input
                            className="payer-amount"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0,00"
                            value={
                              payers[
                                member.id
                              ] || ''
                            }
                            onChange={(
                              event,
                            ) =>
                              changePayerAmount(
                                member.id,
                                event
                                  .target
                                  .value,
                              )
                            }
                          />
                        </div>
                      )}

                    </div>
                  )
                },
              )}

            </div>

            <div className="payment-total-card">

              <div>
                <span>
                  Total pagado
                </span>

                <strong>
                  {formatMoney(
                    totalPaid,
                  )}
                </strong>
              </div>

              {amountValue >
                0 &&
                remaining !==
                  0 && (
                  <div
                    className={
                      remaining >
                      0
                        ? 'payment-remaining'
                        : 'payment-over'
                    }
                  >
                    <span>
                      {remaining >
                      0
                        ? 'Falta pagar'
                        : 'Exceso'}
                    </span>

                    <strong>
                      {formatMoney(
                        Math.abs(
                          remaining,
                        ),
                      )}
                    </strong>
                  </div>
                )}

              {amountValue >
                0 &&
                remaining ===
                  0 &&
                totalPaid >
                  0 && (
                  <div className="payment-ok">
                    <CheckCircle2
                      size={17}
                      strokeWidth={2.3}
                    />

                    Todo pagado
                  </div>
                )}

            </div>

          </fieldset>

          {/* =================================================
              PARTICIPANTES
          ================================================== */}

          <fieldset className="expense-section expense-fieldset">

            <legend>
              <span className="expense-section-icon">
                <Users
                  size={18}
                  strokeWidth={2}
                />
              </span>

              <span>
                <b>
                  ¿Entre quiénes se divide?
                </b>

                <small>
                  El importe se divide
                  equitativamente.
                </small>
              </span>
            </legend>

            <div className="participants-grid">

              {group?.members.map(
                (member) => {
                  const selected =
                    participants.includes(
                      member.id,
                    )

                  return (
                    <label
                      className={`participant-card ${
                        selected
                          ? 'selected'
                          : ''
                      }`}
                      key={
                        member.id
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          selected
                        }
                        onChange={() =>
                          toggleParticipant(
                            member.id,
                          )
                        }
                      />

                      <span className="check-custom">
                        {selected && (
                          <CheckCircle2
                            size={17}
                            strokeWidth={2.4}
                          />
                        )}
                      </span>

                      <span
                        className="participant-avatar"
                        style={{
                          background:
                            member.color,
                        }}
                      >
                        {
                          member.name[0]
                        }
                      </span>

                      <span>
                        {
                          member.name
                        }
                      </span>
                    </label>
                  )
                },
              )}

            </div>

          </fieldset>

          {/* =================================================
              COMPROBANTE
          ================================================== */}

          <section className="expense-section">

            <div className="expense-section-heading">
              <div className="expense-section-icon">
                <ImagePlus
                  size={18}
                  strokeWidth={2}
                />
              </div>

              <div>
                <h3>
                  Comprobante
                </h3>

                <p>
                  Subí una imagen y MitiMiti
                  intentará leerla automáticamente.
                </p>
              </div>
            </div>

            <label className="receipt-upload">

              <input
                name="receipt"
                type="file"
                accept="image/*,.pdf"
                onChange={(event) =>
                  handleReceipt(
                    event
                      .target
                      .files?.[0],
                  )
                }
              />

              <span className="receipt-upload-icon">
                <ImagePlus
                  size={25}
                  strokeWidth={1.9}
                />
              </span>

              <span className="receipt-upload-text">
                <strong>
                  Seleccionar comprobante
                </strong>

                <small>
                  PNG, JPG, WEBP o PDF
                </small>
              </span>
            </label>

            {ocrLoading && (
              <div className="ocr-status loading">
                <LoaderCircle
                  size={18}
                  strokeWidth={2.2}
                  className="spin-icon"
                />

                <span>
                  Leyendo comprobante...
                </span>
              </div>
            )}

            {ocrMessage &&
              !ocrLoading && (
                <div
                  className={`ocr-status ${
                    ocrDetected
                      ? 'success-status'
                      : 'neutral-status'
                  }`}
                >
                  {ocrDetected ? (
                    <CheckCircle2
                      size={18}
                      strokeWidth={2.2}
                    />
                  ) : (
                    <Receipt
                      size={18}
                      strokeWidth={2.2}
                    />
                  )}

                  <span>
                    {ocrMessage}
                  </span>
                </div>
              )}

            {receiptName && (
              <div className="receipt-file-card">

                <span className="receipt-file-icon">
                  <Paperclip
                    size={18}
                    strokeWidth={2}
                  />
                </span>

                <span>
                  {receiptName}
                </span>

              </div>
            )}

            {receiptData && (
              <div className="receipt-preview-modern">

                <div className="receipt-preview-header">
                  <span>
                    Vista previa
                  </span>

                  <ImagePlus
                    size={17}
                    strokeWidth={2}
                  />
                </div>

                <img
                  src={receiptData}
                  alt="Vista previa del comprobante"
                />

              </div>
            )}

          </section>

          {/* =================================================
              GUARDAR
          ================================================== */}

          <button
            type="submit"
            className="primary-button save-expense-button"
            disabled={
              ocrLoading
            }
          >
            {ocrLoading ? (
              <>
                <LoaderCircle
                  size={18}
                  className="spin-icon"
                />

                Procesando...
              </>
            ) : (
              <>
                <Save
                  size={18}
                  strokeWidth={2.2}
                />

                Guardar gasto
              </>
            )}
          </button>

        </form>

      </section>
    </Shell>
  )
}

/* =========================================================
   FORMATEAR DINERO
========================================================= */

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