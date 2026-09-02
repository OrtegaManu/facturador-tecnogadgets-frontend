export const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const NORMALIZED_LOGO_TYPES = ['image/png', 'image/jpeg']
export const MAX_LOGO_FILE_BYTES = 5 * 1024 * 1024
export const MAX_PROCESSED_LOGO_BYTES = 2 * 1024 * 1024
export const MAX_LOGO_WIDTH = 1200
export const MAX_LOGO_HEIGHT = 600

const DATABASE_NAME = 'facturasonlineuy'
const DATABASE_VERSION = 1
const STORE_NAME = 'issuer-assets'
const LOGO_KEY = 'issuer-logo-v1'

export class IssuerLogoError extends Error {
  constructor(message) {
    super(message)
    this.name = 'IssuerLogoError'
  }
}

export function validateLogoFile(file) {
  if (!file || typeof file.type !== 'string' || typeof file.size !== 'number') {
    throw new IssuerLogoError('Seleccioná un archivo de imagen válido.')
  }
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    throw new IssuerLogoError('Usá un logo en formato PNG, JPG o WebP.')
  }
  if (file.size <= 0) {
    throw new IssuerLogoError('El archivo seleccionado está vacío.')
  }
  if (file.size > MAX_LOGO_FILE_BYTES) {
    throw new IssuerLogoError('El logo no puede superar los 5 MB.')
  }
}

export function fitWithinBounds(width, height, maxWidth = MAX_LOGO_WIDTH, maxHeight = MAX_LOGO_HEIGHT) {
  if (![width, height, maxWidth, maxHeight].every((value) => Number.isFinite(value) && value > 0)) {
    throw new IssuerLogoError('No se pudieron leer las dimensiones del logo.')
  }
  const scale = Math.min(1, maxWidth / width, maxHeight / height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  }
}

export function normalizedLogoType(hasTransparency) {
  return hasTransparency ? 'image/png' : 'image/jpeg'
}

function decodeWithImageElement(file) {
  return new Promise((resolve, reject) => {
    if (typeof Image === 'undefined' || typeof URL === 'undefined') {
      reject(new IssuerLogoError('Este navegador no puede procesar el logo seleccionado.'))
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => resolve({
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(objectUrl)
    })
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new IssuerLogoError('El archivo no contiene una imagen que pueda leerse.'))
    }
    image.src = objectUrl
  })
}

async function decodeImage(file) {
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await createImageBitmap(file)
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close()
      }
    }
    return await decodeWithImageElement(file)
  } catch (error) {
    if (error instanceof IssuerLogoError) throw error
    throw new IssuerLogoError('El archivo no contiene una imagen que pueda leerse.')
  }
}

function createCanvas(width, height) {
  if (typeof document === 'undefined') {
    throw new IssuerLogoError('Este navegador no puede procesar imágenes.')
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function hasTransparency(context, width, height) {
  const pixels = context.getImageData(0, 0, width, height).data
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] < 255) return true
  }
  return false
}

function canvasToBlob(canvas, contentType) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new IssuerLogoError('No se pudo preparar el logo para el PDF.'))
    }, contentType, contentType === 'image/jpeg' ? 0.9 : undefined)
  })
}

export async function processIssuerLogo(file) {
  validateLogoFile(file)
  const decoded = await decodeImage(file)

  try {
    let target = fitWithinBounds(decoded.width, decoded.height)
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = createCanvas(target.width, target.height)
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) throw new IssuerLogoError('Este navegador no puede procesar imágenes.')

      context.clearRect(0, 0, target.width, target.height)
      context.drawImage(decoded.source, 0, 0, target.width, target.height)
      const contentType = normalizedLogoType(file.type !== 'image/jpeg' && hasTransparency(context, target.width, target.height))
      const blob = await canvasToBlob(canvas, contentType)

      if (blob.size <= MAX_PROCESSED_LOGO_BYTES) {
        return { blob, contentType, width: target.width, height: target.height }
      }

      target = fitWithinBounds(target.width * 0.78, target.height * 0.78)
    }
  } finally {
    decoded.close?.()
  }

  throw new IssuerLogoError('El logo sigue siendo demasiado grande después de optimizarlo.')
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new IssuerLogoError('No se pudo preparar el logo para enviarlo.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const separatorIndex = result.indexOf(',')
      if (separatorIndex < 0) {
        reject(new IssuerLogoError('No se pudo preparar el logo para enviarlo.'))
        return
      }
      resolve(result.slice(separatorIndex + 1))
    }
    reader.onerror = () => reject(new IssuerLogoError('No se pudo preparar el logo para enviarlo.'))
    reader.readAsDataURL(blob)
  })
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const indexedDb = globalThis.indexedDB
    if (!indexedDb) {
      reject(new Error('IndexedDB no disponible'))
      return
    }

    const request = indexedDb.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB'))
  })
}

function runStoreRequest(mode, operation) {
  return openDatabase().then((database) => new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    let request
    let requestResult
    try {
      request = operation(store)
    } catch (error) {
      database.close()
      reject(error)
      return
    }
    request.onsuccess = () => {
      requestResult = request.result
    }
    request.onerror = () => {
      // La transacción centraliza el cierre y el rechazo para evitar carreras.
    }
    transaction.oncomplete = () => {
      database.close()
      resolve(requestResult)
    }
    transaction.onerror = () => {
      database.close()
      reject(transaction.error || request.error || new Error('No se pudo acceder al logo guardado'))
    }
    transaction.onabort = () => {
      database.close()
      reject(transaction.error || new Error('La operación de almacenamiento fue cancelada'))
    }
  }))
}

export async function loadIssuerLogo() {
  try {
    const record = await runStoreRequest('readonly', (store) => store.get(LOGO_KEY))
    if (!record || !(record.blob instanceof Blob)) return null
    if (!NORMALIZED_LOGO_TYPES.includes(record.contentType)) return null
    if (record.blob.size <= 0 || record.blob.size > MAX_PROCESSED_LOGO_BYTES) return null
    const dimensions = fitWithinBounds(record.width, record.height)
    if (dimensions.width !== record.width || dimensions.height !== record.height) return null
    return record
  } catch {
    return null
  }
}

export async function saveIssuerLogo(logo) {
  if (!logo || !(logo.blob instanceof Blob) || !NORMALIZED_LOGO_TYPES.includes(logo.contentType)) return false
  if (logo.blob.size <= 0 || logo.blob.size > MAX_PROCESSED_LOGO_BYTES) return false
  if (![logo.width, logo.height].every((value) => Number.isFinite(value) && value > 0)) return false
  const dimensions = fitWithinBounds(logo.width, logo.height)
  if (dimensions.width !== logo.width || dimensions.height !== logo.height) return false

  try {
    await runStoreRequest('readwrite', (store) => store.put({
      blob: logo.blob,
      contentType: logo.contentType,
      width: logo.width,
      height: logo.height,
      updatedAt: Date.now()
    }, LOGO_KEY))
    return true
  } catch {
    return false
  }
}

export async function clearIssuerLogo() {
  try {
    await runStoreRequest('readwrite', (store) => store.delete(LOGO_KEY))
    return true
  } catch {
    return false
  }
}
