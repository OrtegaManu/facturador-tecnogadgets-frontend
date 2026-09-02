import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  MAX_LOGO_FILE_BYTES,
  clearIssuerLogo,
  fitWithinBounds,
  loadIssuerLogo,
  normalizedLogoType,
  saveIssuerLogo,
  validateLogoFile
} from './issuerLogo.js'

function createFakeIndexedDb() {
  const records = new Map()
  const database = {
    objectStoreNames: { contains: () => true },
    close() {},
    transaction() {
      const transaction = {}
      const finish = (request, operation) => {
        queueMicrotask(() => {
          request.result = operation()
          request.onsuccess?.()
          queueMicrotask(() => transaction.oncomplete?.())
        })
        return request
      }
      const store = {
        get(key) {
          return finish({}, () => records.get(key))
        },
        put(value, key) {
          return finish({}, () => {
            records.set(key, value)
            return key
          })
        },
        delete(key) {
          return finish({}, () => records.delete(key))
        }
      }
      transaction.objectStore = () => store
      return transaction
    }
  }

  return {
    open() {
      const request = { result: database }
      queueMicrotask(() => request.onsuccess?.())
      return request
    }
  }
}

test('acepta PNG, JPEG y WebP dentro del límite', () => {
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) {
    assert.doesNotThrow(() => validateLogoFile({ type, size: 1024 }))
  }
})

test('rechaza formatos desconocidos, archivos vacíos y mayores a 5 MB', () => {
  assert.throws(() => validateLogoFile({ type: 'image/svg+xml', size: 1024 }), /PNG, JPG o WebP/)
  assert.throws(() => validateLogoFile({ type: 'image/png', size: 0 }), /vacío/)
  assert.throws(() => validateLogoFile({ type: 'image/png', size: MAX_LOGO_FILE_BYTES + 1 }), /5 MB/)
})

test('reduce logos horizontales, cuadrados y verticales sin deformarlos', () => {
  assert.deepEqual(fitWithinBounds(2400, 600), { width: 1200, height: 300 })
  assert.deepEqual(fitWithinBounds(1200, 1200), { width: 600, height: 600 })
  assert.deepEqual(fitWithinBounds(400, 1600), { width: 150, height: 600 })
  assert.deepEqual(fitWithinBounds(320, 120), { width: 320, height: 120 })
})

test('normaliza imágenes transparentes a PNG y opacas a JPEG', () => {
  assert.equal(normalizedLogoType(true), 'image/png')
  assert.equal(normalizedLogoType(false), 'image/jpeg')
})

test('guarda, cambia y elimina el logo procesado en IndexedDB', async () => {
  const previousIndexedDb = globalThis.indexedDB
  globalThis.indexedDB = createFakeIndexedDb()
  try {
    assert.equal(await saveIssuerLogo({
      blob: new Blob(['grande'], { type: 'image/png' }),
      contentType: 'image/png',
      width: 1201,
      height: 300
    }), false)

    const firstLogo = {
      blob: new Blob(['logo-png'], { type: 'image/png' }),
      contentType: 'image/png',
      width: 320,
      height: 120
    }
    assert.equal(await saveIssuerLogo(firstLogo), true)
    const firstStored = await loadIssuerLogo()
    assert.equal(firstStored.contentType, 'image/png')
    assert.equal(await firstStored.blob.text(), 'logo-png')

    const changedLogo = {
      blob: new Blob(['logo-jpeg'], { type: 'image/jpeg' }),
      contentType: 'image/jpeg',
      width: 600,
      height: 600
    }
    assert.equal(await saveIssuerLogo(changedLogo), true)
    const changedStored = await loadIssuerLogo()
    assert.equal(changedStored.contentType, 'image/jpeg')
    assert.equal(await changedStored.blob.text(), 'logo-jpeg')

    assert.equal(await clearIssuerLogo(), true)
    assert.equal(await loadIssuerLogo(), null)
  } finally {
    if (previousIndexedDb === undefined) delete globalThis.indexedDB
    else globalThis.indexedDB = previousIndexedDb
  }
})

test('un fallo o ausencia de IndexedDB no rompe el flujo', async () => {
  const previousIndexedDb = globalThis.indexedDB
  delete globalThis.indexedDB
  try {
    assert.equal(await loadIssuerLogo(), null)
    assert.equal(await saveIssuerLogo({
      blob: new Blob(['logo'], { type: 'image/png' }),
      contentType: 'image/png',
      width: 10,
      height: 10
    }), false)
    assert.equal(await clearIssuerLogo(), false)
  } finally {
    if (previousIndexedDb !== undefined) globalThis.indexedDB = previousIndexedDb
  }
})
