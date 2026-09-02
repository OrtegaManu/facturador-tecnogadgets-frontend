import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

class MemoryStorage {
  constructor() {
    this.values = new Map()
  }

  getItem(key) {
    return this.values.get(key) ?? null
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }

  removeItem(key) {
    this.values.delete(key)
  }

  clear() {
    this.values.clear()
  }
}

globalThis.window = { localStorage: new MemoryStorage() }

const persistence = await import('./localPersistence.js')

beforeEach(() => window.localStorage.clear())

test('guarda, recupera y elimina solo los datos válidos del emisor', () => {
  const issuer = {
    nombre: 'Estudio Sur',
    tipoIdentificacion: 'RUT',
    numeroIdentificacion: '123456780019',
    direccion: 'Montevideo',
    telefono: '099000000',
    email: 'hola@example.com'
  }

  assert.equal(persistence.loadIssuerData(), null)
  assert.equal(persistence.saveIssuerData(issuer), true)
  assert.deepEqual(persistence.loadIssuerData(), issuer)
  assert.equal(persistence.clearIssuerData(), true)
  assert.equal(persistence.loadIssuerData(), null)
})

test('guarda emisores con CI u otra identificación', () => {
  for (const [tipoIdentificacion, numeroIdentificacion] of [
    ['CI', '4.123.456-7'],
    ['OTRO', 'EXT-ABC-123']
  ]) {
    const issuer = {
      nombre: 'Profesional independiente',
      tipoIdentificacion,
      numeroIdentificacion,
      direccion: 'Montevideo',
      telefono: '',
      email: ''
    }

    assert.equal(persistence.saveIssuerData(issuer), true)
    assert.deepEqual(persistence.loadIssuerData(), issuer)
    persistence.clearIssuerData()
  }
})

test('migra la persistencia v1 interpretando el RUT anterior', () => {
  window.localStorage.setItem('facturasonlineuy:issuer:v1', JSON.stringify({
    version: 1,
    data: {
      nombre: 'Comercio legado',
      rut: '219999990011',
      direccion: 'Canelones',
      telefono: '099111222',
      email: 'legado@example.com'
    }
  }))

  assert.deepEqual(persistence.loadIssuerData(), {
    nombre: 'Comercio legado',
    tipoIdentificacion: 'RUT',
    numeroIdentificacion: '219999990011',
    direccion: 'Canelones',
    telefono: '099111222',
    email: 'legado@example.com'
  })
})

test('ignora datos locales corruptos o con esquema desconocido', () => {
  window.localStorage.setItem('facturasonlineuy:issuer:v2', '{invalido')
  assert.equal(persistence.loadIssuerData(), null)
})

test('mantiene contadores independientes para los tres tipos', () => {
  assert.deepEqual(persistence.getDocumentNumbers(), {
    FACTURA: '00001',
    PROFORMA: '00001',
    PRESUPUESTO: '00001'
  })

  assert.equal(persistence.commitDocumentNumber('FACTURA', '00001'), '00002')
  assert.equal(persistence.commitDocumentNumber('PROFORMA', '00007'), '00008')
  assert.deepEqual(persistence.getDocumentNumbers(), {
    FACTURA: '00002',
    PROFORMA: '00008',
    PRESUPUESTO: '00001'
  })
})

test('un número manual alto adelanta el contador y uno bajo no lo retrocede', () => {
  assert.equal(persistence.commitDocumentNumber('PRESUPUESTO', '00120'), '00121')
  assert.equal(persistence.commitDocumentNumber('PRESUPUESTO', '00003'), '00121')
})

test('consultar o cambiar de tipo no incrementa ningún contador', () => {
  persistence.getNextDocumentNumber('FACTURA')
  persistence.getNextDocumentNumber('PROFORMA')
  persistence.getNextDocumentNumber('PRESUPUESTO')
  assert.deepEqual(persistence.getDocumentNumbers(), {
    FACTURA: '00001',
    PROFORMA: '00001',
    PRESUPUESTO: '00001'
  })
})
