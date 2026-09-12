import { createWorker } from 'tesseract.js'

export type ReceiptOcrResult = {
  merchant?: string
  amount?: number
  date?: string
  payerName?: string
  rawText: string
}

export async function readReceipt(
  file: File,
): Promise<ReceiptOcrResult> {
  const originalUrl = URL.createObjectURL(file)

  try {
    const images =
      await prepareImages(originalUrl)

    const worker =
      await createWorker('spa')

    try {
      const results: string[] = []

      for (const image of images) {
        const result =
          await worker.recognize(image)

        results.push(
          result.data.text,
        )
      }

      const rawText =
        results.join('\n')

      return parseReceiptText(
        rawText,
        results,
      )
    } finally {
      await worker.terminate()
    }
  } finally {
    URL.revokeObjectURL(originalUrl)
  }
}

/* =========================================================
   PREPARAR IMAGEN
========================================================= */

async function prepareImages(
  imageUrl: string,
): Promise<string[]> {
  const image =
    await loadImage(imageUrl)

  const height =
    image.naturalHeight

  const images: string[] = []

  /*
   * Lectura 1:
   * imagen completa ampliada.
   */

  images.push(
    processImage(
      image,
      2,
      0,
      height,
      false,
    ),
  )

  /*
   * Lectura 2:
   * parte superior del comprobante.
   */

  images.push(
    processImage(
      image,
      3,
      0,
      Math.floor(
        height * 0.65,
      ),
      true,
    ),
  )

  /*
   * Lectura 3:
   * parte superior todavía más ampliada.
   */

  images.push(
    processImage(
      image,
      4,
      0,
      Math.floor(
        height * 0.45,
      ),
      true,
    ),
  )

  return images
}

function loadImage(
  url: string,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image()

      image.onload = () =>
        resolve(image)

      image.onerror = reject

      image.src = url
    },
  )
}

function processImage(
  image: HTMLImageElement,
  scale: number,
  startY: number,
  endY: number,
  strongContrast: boolean,
) {
  const sourceWidth =
    image.naturalWidth

  const sourceHeight =
    endY - startY

  const canvas =
    document.createElement(
      'canvas',
    )

  canvas.width =
    sourceWidth * scale

  canvas.height =
    sourceHeight * scale

  const ctx =
    canvas.getContext('2d')!

  ctx.drawImage(
    image,
    0,
    startY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  const imageData =
    ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    )

  const data =
    imageData.data

  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    let gray =
      0.299 * r +
      0.587 * g +
      0.114 * b

    if (strongContrast) {
      if (gray > 180) {
        gray = 255
      } else if (gray < 110) {
        gray = 0
      }
    }

    data[i] = gray
    data[i + 1] = gray
    data[i + 2] = gray
  }

  ctx.putImageData(
    imageData,
    0,
    0,
  )

  return canvas.toDataURL(
    'image/png',
  )
}

/* =========================================================
   PARSEAR RESULTADOS
========================================================= */

function parseReceiptText(
  combinedText: string,
  results: string[],
): ReceiptOcrResult {
  const lines =
    combinedText
      .split(/\r?\n/)
      .map(
        (line) =>
          line.trim(),
      )
      .filter(Boolean)

  return {
    merchant:
      detectMerchant(lines),

    amount:
      detectAmount(
        lines,
        results,
      ),

    date:
      detectDate(
        combinedText,
      ),

    payerName:
      detectPayerName(lines),

    rawText:
      combinedText,
  }
}

/* =========================================================
   COMERCIO
========================================================= */

function detectMerchant(
  lines: string[],
) {
  const ignoredWords = [
    'ticket',
    'factura',
    'comprobante',
    'recibo',
    'fecha',
    'hora',
    'cuit',
    'iva',
    'total',
    'subtotal',
    'importe',
    'monto',
    'domicilio',
    'cliente',
    'operacion',
    'operación',
    'numero',
    'número',
    'nro',
    'tel',
    'telefono',
    'teléfono',
  ]

  for (
    const line of
    lines.slice(0, 10)
  ) {
    const lower =
      line.toLowerCase()

    if (
      line.length >= 3 &&
      line.length <= 60 &&
      !ignoredWords.some(
        (word) =>
          lower.includes(word),
      ) &&
      !/\d{4,}/.test(line)
    ) {
      return line
    }
  }

  return undefined
}

/* =========================================================
   PAGADOR
========================================================= */

function detectPayerName(
  lines: string[],
) {
  const payerLabels = [
    'de:',
    'de :',
    'pagó:',
    'pago:',
    'pagó',
    'pago',
    'pagador:',
    'pagador',
    'titular:',
    'titular',
    'enviado por:',
    'enviado por',
    'remitente:',
    'remitente',
    'realizado por:',
    'realizado por',
  ]

  /*
   * Intentamos detectar el nombre
   * en la misma línea.
   */

  for (
    const line of lines
  ) {
    const lower =
      line.toLowerCase()

    for (
      const label of
      payerLabels
    ) {
      const index =
        lower.indexOf(label)

      if (index === -1) {
        continue
      }

      let candidate =
        line.slice(
          index +
            label.length,
        ).trim()

      candidate =
        cleanPersonName(
          candidate,
        )

      if (
        isLikelyPersonName(
          candidate,
        )
      ) {
        return candidate
      }
    }
  }

  /*
   * Algunas veces el OCR separa:
   *
   * De:
   * Juan Pérez
   */

  for (
    let i = 0;
    i < lines.length - 1;
    i++
  ) {
    const lower =
      lines[i].toLowerCase()

    const isPayerLabel =
      payerLabels.some(
        (label) =>
          lower === label ||
          lower.startsWith(
            label,
          ),
      )

    if (!isPayerLabel) {
      continue
    }

    const candidate =
      cleanPersonName(
        lines[i + 1],
      )

    if (
      isLikelyPersonName(
        candidate,
      )
    ) {
      return candidate
    }
  }

  return undefined
}

function cleanPersonName(
  value: string,
) {
  return value
    .replace(
      /^[\s:;-]+/,
      '',
    )
    .replace(
      /[|•]+/g,
      ' ',
    )
    .replace(
      /\s+/g,
      ' ',
    )
    .trim()
}

function isLikelyPersonName(
  value: string,
) {
  if (!value) {
    return false
  }

  if (
    value.length < 3 ||
    value.length > 70
  ) {
    return false
  }

  /*
   * Evitamos números largos,
   * CUIT, CBU, teléfonos, etc.
   */

  if (/\d{3,}/.test(value)) {
    return false
  }

  const lower =
    value.toLowerCase()

  const forbiddenWords = [
    'cuit',
    'cbu',
    'alias',
    'mercado pago',
    'comprobante',
    'operacion',
    'operación',
    'total',
    'importe',
    'monto',
    'fecha',
    'hora',
    'domicilio',
    'cliente',
    'codigo',
    'código',
    'número',
    'numero',
  ]

  if (
    forbiddenWords.some(
      (word) =>
        lower.includes(word),
    )
  ) {
    return false
  }

  const letters =
    value.match(
      /[A-Za-zÁÉÍÓÚáéíóúÑñÜü]/g,
    )

  if (
    !letters ||
    letters.length < 3
  ) {
    return false
  }

  return true
}

/* =========================================================
   IMPORTE
========================================================= */

function detectAmount(
  lines: string[],
  results: string[],
): number | undefined {
  const priorityWords = [
    'total',
    'importe',
    'monto',
    'total a pagar',
    'importe total',
    'monto total',
    'valor total',
    'total pagado',
  ]

  /*
   * PRIORIDAD 1:
   * líneas que indiquen total/importe/monto.
   */

  for (
    const line of lines
  ) {
    const lower =
      line.toLowerCase()

    if (
      priorityWords.some(
        (word) =>
          lower.includes(word),
      )
    ) {
      const amounts =
        extractAmounts(line)

      const valid =
        amounts.filter(
          (amount) =>
            isValidAmount(
              amount,
            ) &&
            !looksLikeYear(
              amount,
            ),
        )

      if (valid.length > 0) {
        return Math.max(
          ...valid,
        )
      }
    }
  }

  /*
   * PRIORIDAD 2:
   * números acompañados de $.
   */

  for (
    const text of results
  ) {
    const dollarAmounts =
      extractDollarAmounts(
        text,
      )

    const valid =
      dollarAmounts.filter(
        (amount) =>
          isValidAmount(
            amount,
          ) &&
          !looksLikeYear(
            amount,
          ),
      )

    if (valid.length > 0) {
      return Math.max(
        ...valid,
      )
    }
  }

  /*
   * PRIORIDAD 3:
   * números monetarios sin $.
   */

  const candidates: number[] =
    []

  for (
    const line of lines
  ) {
    const lower =
      line.toLowerCase()

    if (
      lower.includes('cuit') ||
      lower.includes('cbu') ||
      lower.includes('alias') ||
      lower.includes('telefono') ||
      lower.includes('teléfono') ||
      lower.includes('operacion') ||
      lower.includes('operación') ||
      lower.includes('comprobante')
    ) {
      continue
    }

    if (
      /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/.test(
        line,
      )
    ) {
      continue
    }

    const amounts =
      extractAmounts(line)

    for (
      const amount of amounts
    ) {
      if (
        isValidAmount(
          amount,
        ) &&
        !looksLikeYear(
          amount,
        )
      ) {
        candidates.push(
          amount,
        )
      }
    }
  }

  if (
    candidates.length > 0
  ) {
    return Math.max(
      ...candidates,
    )
  }

  return undefined
}

/* =========================================================
   EXTRAER "$ 5.000"
========================================================= */

function extractDollarAmounts(
  text: string,
): number[] {
  const results: number[] =
    []

  const matches = [
    ...text.matchAll(
      /\$\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?)/g,
    ),
  ]

  for (
    const match of matches
  ) {
    const amount =
      parseMoney(match[1])

    if (
      Number.isFinite(
        amount,
      )
    ) {
      results.push(amount)
    }
  }

  return results
}

/* =========================================================
   EXTRAER NÚMEROS
========================================================= */

function extractAmounts(
  text: string,
): number[] {
  const results: number[] =
    []

  const matches = [
    ...text.matchAll(
      /\b([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{1,2})?|[0-9]{2,7}(?:[.,][0-9]{1,2})?)\b/g,
    ),
  ]

  for (
    const match of matches
  ) {
    const amount =
      parseMoney(match[1])

    if (
      Number.isFinite(
        amount,
      )
    ) {
      results.push(amount)
    }
  }

  return results
}

/* =========================================================
   PARSEAR DINERO
========================================================= */

function parseMoney(
  value: string,
): number {
  let clean =
    value
      .replace(/\s/g, '')
      .replace(/\$/g, '')

  /*
   * 5.000,50
   */

  if (
    clean.includes('.') &&
    clean.includes(',')
  ) {
    const lastDot =
      clean.lastIndexOf('.')

    const lastComma =
      clean.lastIndexOf(',')

    if (
      lastComma > lastDot
    ) {
      clean =
        clean.replace(
          /\./g,
          '',
        )

      clean =
        clean.replace(
          ',',
          '.',
        )
    } else {
      clean =
        clean.replace(
          /,/g,
          '',
        )
    }
  }

  /*
   * 5.000
   */

  else if (
    clean.includes('.')
  ) {
    const parts =
      clean.split('.')

    if (
      parts.length === 2 &&
      parts[1].length === 3
    ) {
      clean =
        parts.join('')
    }
  }

  /*
   * 5,000
   */

  else if (
    clean.includes(',')
  ) {
    const parts =
      clean.split(',')

    if (
      parts.length === 2 &&
      parts[1].length === 3
    ) {
      clean =
        parts.join('')
    } else {
      /*
       * 5000,50
       */

      clean =
        clean.replace(
          ',',
          '.',
        )
    }
  }

  return Number(clean)
}

/* =========================================================
   VALIDAR IMPORTE
========================================================= */

function isValidAmount(
  value: number,
) {
  return (
    Number.isFinite(value) &&
    value > 0 &&
    value < 100000000
  )
}

/* =========================================================
   AÑOS
========================================================= */

function looksLikeYear(
  value: number,
) {
  return (
    Number.isInteger(value) &&
    value >= 1900 &&
    value <= 2100
  )
}

/* =========================================================
   FECHA
========================================================= */

function detectDate(
  text: string,
) {
  const matches = [
    ...text.matchAll(
      /\b(0?[1-9]|[12][0-9]|3[01])[\/.-](0?[1-9]|1[0-2])[\/.-](20\d{2})\b/g,
    ),
  ]

  for (
    const match of matches
  ) {
    const day =
      Number(match[1])

    const month =
      Number(match[2])

    const year =
      Number(match[3])

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day,
        ),
      )

    if (
      date.getUTCFullYear() ===
        year &&
      date.getUTCMonth() ===
        month - 1 &&
      date.getUTCDate() ===
        day
    ) {
      return `${year}-${String(
        month,
      ).padStart(
        2,
        '0',
      )}-${String(day).padStart(
        2,
        '0',
      )}`
    }
  }

  return undefined
}