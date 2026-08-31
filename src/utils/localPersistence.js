export const DOCUMENT_TYPES = ['FACTURA', 'PROFORMA', 'PRESUPUESTO']

const ISSUER_STORAGE_KEY = 'facturasonlineuy:issuer:v1'
const COUNTERS_STORAGE_KEY = 'facturasonlineuy:document-counters:v1'
const STORAGE_VERSION = 1
const ISSUER_FIELDS = ['nombre', 'rut', 'direccion', 'telefono', 'email']

function storage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function readJson(key) {
  try {
    const value = storage()?.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function writeJson(key, value) {
  try {
    const target = storage()
    if (!target) return false
    target.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function loadIssuerData() {
  const stored = readJson(ISSUER_STORAGE_KEY)
  if (stored?.version !== STORAGE_VERSION || !stored.data || typeof stored.data !== 'object') {
    return null
  }

  const issuer = {}
  for (const field of ISSUER_FIELDS) {
    if (typeof stored.data[field] !== 'string') return null
    issuer[field] = stored.data[field]
  }
  return issuer
}

export function saveIssuerData(issuer) {
  if (!issuer || typeof issuer !== 'object') return false
  const data = {}
  for (const field of ISSUER_FIELDS) {
    if (typeof issuer[field] !== 'string') return false
    data[field] = issuer[field]
  }
  return writeJson(ISSUER_STORAGE_KEY, { version: STORAGE_VERSION, data })
}

export function clearIssuerData() {
  try {
    const target = storage()
    if (!target) return false
    target.removeItem(ISSUER_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function formatDocumentNumber(value) {
  const number = Number.parseInt(value, 10)
  return String(Number.isSafeInteger(number) && number > 0 ? number : 1).padStart(5, '0')
}

function readCounters() {
  const stored = readJson(COUNTERS_STORAGE_KEY)
  const counters = Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, 1]))
  if (stored?.version !== STORAGE_VERSION || !stored.next || typeof stored.next !== 'object') {
    return counters
  }

  for (const type of DOCUMENT_TYPES) {
    const value = stored.next[type]
    if (Number.isSafeInteger(value) && value > 0) counters[type] = value
  }
  return counters
}

export function getDocumentNumbers() {
  const counters = readCounters()
  return Object.fromEntries(DOCUMENT_TYPES.map((type) => [type, formatDocumentNumber(counters[type])]))
}

export function getNextDocumentNumber(type) {
  const safeType = DOCUMENT_TYPES.includes(type) ? type : 'FACTURA'
  return formatDocumentNumber(readCounters()[safeType])
}

export function commitDocumentNumber(type, generatedNumber) {
  if (!DOCUMENT_TYPES.includes(type)) return getNextDocumentNumber('FACTURA')

  const counters = readCounters()
  const trailingDigits = String(generatedNumber ?? '').trim().match(/(\d+)$/)
  const generatedValue = trailingDigits ? Number.parseInt(trailingDigits[1], 10) : 0
  if (Number.isSafeInteger(generatedValue) && generatedValue > 0) {
    counters[type] = Math.max(counters[type], generatedValue + 1)
    writeJson(COUNTERS_STORAGE_KEY, { version: STORAGE_VERSION, next: counters })
  }
  return formatDocumentNumber(counters[type])
}
