import { useState, useMemo, useEffect, useRef } from 'react'
import { getSeoPage } from './seoPages.js'

const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')
const COMMENTS_URL = API_URL ? `${API_URL}/api/comentarios` : null

const DEFAULT_EMISOR = {
  nombre: '',
  rut: '',
  direccion: '',
  telefono: '',
  email: ''
}

const DEFAULT_CLIENTE = {
  nombre: '',
  documento: '',
  direccion: '',
  email: ''
}

const INITIAL_ITEMS = [
  {
    id: '1',
    descripcion: '',
    cantidad: 1,
    precioUnitario: 0,
    descuentoPorcentaje: 0,
    aplicaIva: true
  }
]

const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100

function Opiniones() {
  const [comentarios, setComentarios] = useState([])
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    const cargarComentarios = async () => {
      if (!COMMENTS_URL) {
        setCargando(false)
        return
      }

      try {
        const response = await fetch(COMMENTS_URL)
        if (!response.ok) {
          throw new Error('No se pudieron cargar las opiniones.')
        }
        setComentarios(await response.json())
      } catch (error) {
        console.error('Error al cargar opiniones:', error)
        setMensaje('No se pudieron cargar las opiniones en este momento.')
      } finally {
        setCargando(false)
      }
    }

    cargarComentarios()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    const comentario = texto.trim()

    if (!comentario || comentario.length > 600 || !COMMENTS_URL) {
      return
    }

    setEnviando(true)
    setMensaje(null)

    try {
      const response = await fetch(COMMENTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ texto: comentario })
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(errorText || 'No se pudo enviar la opinión.')
      }

      const comentarioGuardado = await response.json()
      setComentarios((prev) => [comentarioGuardado, ...prev].slice(0, 5))
      setTexto('')
      setMensaje('¡Gracias por compartir tu opinión!')
    } catch (error) {
      console.error('Error al enviar opinión:', error)
      setMensaje(error.message || 'No se pudo enviar la opinión.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section id="opiniones" aria-labelledby="opiniones-title" className="opinions">
      <div className="opinions-heading">
        <h2 id="opiniones-title">Opiniones</h2>
        <p>Comparte tu experiencia de forma anónima y ayuda a mejorar FacturasOnlineUY.</p>
      </div>

      <form onSubmit={handleSubmit} className="opinion-form">
        <label htmlFor="opinion-texto" className="sr-only">Escribe tu opinión</label>
        <textarea
          id="opinion-texto"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          maxLength={600}
          rows="4"
          placeholder="¿Qué te pareció la herramienta?"
          className="control"
        />
        <div className="opinion-actions">
          <span className="character-count">{texto.length}/600 caracteres</span>
          <button
            type="submit"
            disabled={enviando || !texto.trim() || !COMMENTS_URL}
            className="secondary-button"
          >
            {enviando ? 'Enviando…' : 'Enviar opinión'}
          </button>
        </div>
        {mensaje && <p aria-live="polite" className="opinion-state">{mensaje}</p>}
      </form>

      {cargando ? (
        <p className="opinion-state">Cargando opiniones…</p>
      ) : comentarios.length > 0 ? (
        <div className="comments-list">
          {comentarios.map((comentario) => (
            <article key={comentario.id} className="comment">
              <p>{comentario.texto}</p>
              <time dateTime={comentario.fecha}>{new Date(comentario.fecha).toLocaleDateString('es-UY')}</time>
            </article>
          ))}
        </div>
      ) : (
        <p className="opinion-state">Todavía no hay opiniones.</p>
      )}
    </section>
  )
}

function SeoContent({ page }) {
  return (
    <div id="ayuda" className="seo-content">
      <p className="seo-description">{page.intro}</p>
      <section aria-labelledby="how-heading" className="seo-block">
        <h2 id="how-heading">Cómo funciona</h2>
        <ol className="steps">
          {page.howItWorks.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>

      <section aria-labelledby="faq-heading" className="seo-block">
        <h2 id="faq-heading">Preguntas frecuentes</h2>
        <div className="faq-list">
          {page.faq.map(([question, answer]) => (
            <details key={question} className="faq-item">
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}

function App() {
  const currentPage = getSeoPage(typeof window === 'undefined' ? '/' : window.location.pathname)
  // States
  const [emisor, setEmisor] = useState(DEFAULT_EMISOR)
  const [cliente, setCliente] = useState(DEFAULT_CLIENTE)
  const [configFactura, setConfigFactura] = useState({
    numero: currentPage.documentType === 'PROFORMA' ? 'P001' : 'F001',
    fecha: new Date().toISOString().split('T')[0],
    moneda: 'USD',
    tipoDocumento: currentPage.documentType
  })
  const [descuentoGlobal, setDescuentoGlobal] = useState(0)
  const [items, setItems] = useState(INITIAL_ITEMS)
  const [condicionesComerciales, setCondicionesComerciales] = useState('')
  const [datosTransferencia, setDatosTransferencia] = useState('')

  // Status states
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [termsOpen, setTermsOpen] = useState(false)
  const previousFocusRef = useRef(null)
  const closeTermsButtonRef = useRef(null)
  const documentLabel = configFactura.tipoDocumento === 'PROFORMA' ? 'proforma' : 'factura'

  useEffect(() => {
    if (!termsOpen) return undefined

    previousFocusRef.current = document.activeElement
    closeTermsButtonRef.current?.focus()

    const handleEscape = (event) => {
      if (event.key === 'Escape') setTermsOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      previousFocusRef.current?.focus?.()
      previousFocusRef.current = null
    }
  }, [termsOpen])

  // Emisor Handlers
  const handleEmisorChange = (e) => {
    const { name, value } = e.target
    setEmisor((prev) => ({ ...prev, [name]: value }))
  }

  // Cliente Handlers
  const handleClienteChange = (e) => {
    const { name, value } = e.target
    setCliente((prev) => ({ ...prev, [name]: value }))
  }

  // Config Handlers
  const handleConfigChange = (e) => {
    const { name, value } = e.target
    setConfigFactura((prev) => ({ ...prev, [name]: value }))
  }

  const handleDocumentTypeChange = (event) => {
    setConfigFactura((prev) => ({ ...prev, tipoDocumento: event.target.value }))
  }

  // Items Handlers
  const handleAddItem = () => {
    const newItem = {
      id: Date.now().toString(),
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuentoPorcentaje: 0,
      aplicaIva: true
    }
    setItems((prev) => [...prev, newItem])
  }

  const handleRemoveItem = (id) => {
    if (items.length <= 1) {
      alert('La factura debe tener al menos una línea de producto.')
      return
    }
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const handleItemChange = (id, field, value) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: value }
        }
        return it
      })
    )
  }

  // Real-time Calculations
  const totals = useMemo(() => {
    let rawSubtotal = 0
    let totalDescuentoLineas = 0

    const processedItems = items.map((item) => {
      const cant = Math.max(0, Number(item.cantidad) || 0)
      const precio = Math.max(0, Number(item.precioUnitario) || 0)
      const descPct = Math.min(100, Math.max(0, Number(item.descuentoPorcentaje) || 0))

      const basePrice = roundMoney(cant * precio)
      const descMonto = roundMoney(basePrice * (descPct / 100))
      const subtotalLinea = roundMoney(basePrice - descMonto)
      const ivaLinea = item.aplicaIva ? roundMoney(subtotalLinea * 0.22) : 0
      const totalLinea = roundMoney(subtotalLinea + ivaLinea)

      rawSubtotal += basePrice
      totalDescuentoLineas += descMonto
      return {
        ...item,
        subtotalLinea,
        descMonto,
        ivaLinea,
        totalLinea
      }
    })

    const subtotalPostDescuentoLineas = roundMoney(rawSubtotal - totalDescuentoLineas)
    const descGlobalPct = Math.min(100, Math.max(0, Number(descuentoGlobal) || 0))
    const montoDescuentoGlobal = roundMoney(subtotalPostDescuentoLineas * (descGlobalPct / 100))
    const subtotalFinal = roundMoney(subtotalPostDescuentoLineas - montoDescuentoGlobal)

    const taxableSubtotal = processedItems
      .filter((item) => item.aplicaIva)
      .reduce((sum, item) => sum + item.subtotalLinea, 0)
    const ivaBaseAfterGlobal = subtotalPostDescuentoLineas > 0
      ? roundMoney(taxableSubtotal - roundMoney(montoDescuentoGlobal * (taxableSubtotal / subtotalPostDescuentoLineas)))
      : 0
    const ivaFinal = roundMoney(ivaBaseAfterGlobal * 0.22)
    const totalFinal = roundMoney(subtotalFinal + ivaFinal)

    return {
      rawSubtotal,
      totalDescuentoLineas,
      subtotalPostDescuentoLineas,
      montoDescuentoGlobal,
      subtotalFinal,
      totalIva: ivaFinal,
      totalFinal,
      processedItems
    }
  }, [items, descuentoGlobal])

  // Currency symbol helper
  const symbol = configFactura.moneda === 'USD' ? 'US$' : '$U'

  // Submit Handler
  const handleGeneratePdf = async (e) => {
    if (e) e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const payload = {
      emisor: {
        ...emisor,
        nombreComercial: emisor.nombre
      },
      cliente: {
        ...cliente,
        documentoIdentidad: cliente.documento
      },
      factura: {
        // Los nombres deben coincidir con DetallesFactura.java.
        numeroFactura: configFactura.numero,
        fechaEmision: configFactura.fecha,
        moneda: configFactura.moneda,
        tipoDocumento: configFactura.tipoDocumento,
        descuentoGlobalPorcentaje: Number(descuentoGlobal) || 0,
        subtotal: totals.subtotalFinal,
        descuentoTotal: totals.totalDescuentoLineas + totals.montoDescuentoGlobal,
        ivaTotal: totals.totalIva,
        total: totals.totalFinal
      },
      items: totals.processedItems.map((it) => ({
        descripcion: it.descripcion,
        cantidad: Number(it.cantidad),
        precioUnitario: Number(it.precioUnitario),
        descuentoPorcentaje: Number(it.descuentoPorcentaje),
        aplicaIva: Boolean(it.aplicaIva),
        subtotal: it.subtotalLinea,
        iva: it.ivaLinea,
        total: it.totalLinea
      })),
      condicionesComerciales,
      datosTransferencia
    }

    try {
      if (!API_URL) {
        throw new Error('Falta configurar la variable de entorno VITE_API_URL.')
      }

      const response = await fetch(`${API_URL}/api/generar-factura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        throw new Error(`Error ${response.status}: ${errorText || 'No se pudo generar el archivo PDF en el servidor.'}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const fileLabel = configFactura.tipoDocumento === 'PROFORMA' ? 'Proforma' : 'Factura'
      link.setAttribute('download', `${fileLabel}_${configFactura.numero || 'F001'}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setSuccessMsg(`¡${fileLabel} descargada con éxito!`)
    } catch (err) {
      console.error('Error al generar factura:', err)
      setErrorMsg(err.message || 'Error al conectar con el backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <a href="/" className="brand">FacturasOnlineUY</a>
          <span className="header-note">Gratis · sin registro · PDF al instante</span>
        </div>
      </header>

      <main id="inicio" className="main-shell">
        <section aria-labelledby="generator-heading" className="intro">
          <h1 id="generator-heading">{currentPage.h1}</h1>
          <p>{currentPage.heroIntro}</p>
        </section>

        {errorMsg && (
          <div role="alert" className="status-message error">
            <div>
              <strong>Error al generar el PDF.</strong>
              <div>{errorMsg}</div>
            </div>
            <button type="button" aria-label="Cerrar mensaje de error" onClick={() => setErrorMsg(null)}>×</button>
          </div>
        )}

        {successMsg && (
          <div role="status" className="status-message success">
            <span>{successMsg}</span>
            <button type="button" aria-label="Cerrar mensaje de éxito" onClick={() => setSuccessMsg(null)}>×</button>
          </div>
        )}

        <form id="generador" onSubmit={handleGeneratePdf} className="invoice-form">
          <fieldset className="document-type-fieldset">
            <legend>Tipo de documento</legend>
            <div className="document-type-control">
              <label className="document-type-option">
                <input
                  type="radio"
                  name="tipo-documento"
                  value="FACTURA"
                  checked={configFactura.tipoDocumento === 'FACTURA'}
                  onChange={handleDocumentTypeChange}
                />
                <span>Factura</span>
              </label>
              <label className="document-type-option">
                <input
                  type="radio"
                  name="tipo-documento"
                  value="PROFORMA"
                  checked={configFactura.tipoDocumento === 'PROFORMA'}
                  onChange={handleDocumentTypeChange}
                />
                <span>Proforma</span>
              </label>
            </div>
          </fieldset>

          <section className="form-section" aria-labelledby="emisor-heading">
            <div className="section-header">
              <h2 id="emisor-heading">Datos del emisor</h2>
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="emisor-nombre">Nombre / razón social</label>
                <input id="emisor-nombre" className="control" type="text" name="nombre" value={emisor.nombre} onChange={handleEmisorChange} required autoComplete="organization" />
              </div>
              <div className="field">
                <label htmlFor="emisor-rut">RUT</label>
                <input id="emisor-rut" className="control" type="text" name="rut" value={emisor.rut} onChange={handleEmisorChange} required inputMode="numeric" />
              </div>
              <div className="field full">
                <label htmlFor="emisor-direccion">Dirección</label>
                <input id="emisor-direccion" className="control" type="text" name="direccion" value={emisor.direccion} onChange={handleEmisorChange} autoComplete="street-address" />
              </div>
              <div className="field">
                <label htmlFor="emisor-telefono">Teléfono</label>
                <input id="emisor-telefono" className="control" type="tel" name="telefono" value={emisor.telefono} onChange={handleEmisorChange} autoComplete="tel" />
              </div>
              <div className="field">
                <label htmlFor="emisor-email">Email</label>
                <input id="emisor-email" className="control" type="email" name="email" value={emisor.email} onChange={handleEmisorChange} autoComplete="email" />
              </div>
            </div>
          </section>

          <section className="form-section" aria-labelledby="cliente-heading">
            <div className="section-header">
              <h2 id="cliente-heading">Datos del cliente</h2>
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="cliente-nombre">Nombre / razón social</label>
                <input id="cliente-nombre" className="control" type="text" name="nombre" value={cliente.nombre} onChange={handleClienteChange} required placeholder="Empresa o persona" autoComplete="off" />
              </div>
              <div className="field">
                <label htmlFor="cliente-documento">Documento (RUT / CI)</label>
                <input id="cliente-documento" className="control" type="text" name="documento" value={cliente.documento} onChange={handleClienteChange} required placeholder="123456780019" inputMode="numeric" autoComplete="off" />
              </div>
              <div className="field full">
                <label htmlFor="cliente-direccion">Dirección</label>
                <input id="cliente-direccion" className="control" type="text" name="direccion" value={cliente.direccion} onChange={handleClienteChange} placeholder="Calle, número, ciudad" autoComplete="off" />
              </div>
            </div>
          </section>

          <section className="form-section" aria-labelledby="config-heading">
            <div className="section-header">
              <h2 id="config-heading">Configuración de {documentLabel}</h2>
            </div>
            <div className="field-grid four-columns">
              <div className="field">
                <label htmlFor="documento-numero">Número</label>
                <input id="documento-numero" className="control" type="text" name="numero" value={configFactura.numero} onChange={handleConfigChange} required />
              </div>
              <div className="field">
                <label htmlFor="documento-fecha">Fecha</label>
                <input id="documento-fecha" className="control" type="date" name="fecha" value={configFactura.fecha} onChange={handleConfigChange} required />
              </div>
              <div className="field">
                <label htmlFor="documento-moneda">Moneda</label>
                <select id="documento-moneda" className="control" name="moneda" value={configFactura.moneda} onChange={handleConfigChange}>
                  <option value="USD">USD</option>
                  <option value="UYU">UYU</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="descuento-global">Descuento global</label>
                <input id="descuento-global" className="control" type="number" min="0" max="100" step="0.1" value={descuentoGlobal} onChange={(event) => setDescuentoGlobal(event.target.value)} inputMode="decimal" />
              </div>
            </div>
          </section>

          <section className="form-section" aria-labelledby="items-heading">
            <div className="section-header">
              <h2 id="items-heading">Productos o servicios</h2>
              <button type="button" onClick={handleAddItem} className="secondary-button">Agregar línea</button>
            </div>

            <div className="items-list">
              {items.map((item, idx) => {
                const processed = totals.processedItems[idx] || {}
                return (
                  <div key={item.id} className="item-row">
                    <div className="item-row-top">
                      <span className="item-number">{String(idx + 1).padStart(2, '0')}</span>
                      <div className="item-field">
                        <label htmlFor={'item-' + item.id + '-descripcion'}>Descripción</label>
                        <input
                          id={'item-' + item.id + '-descripcion'}
                          className="control"
                          type="text"
                          placeholder="Producto o servicio"
                          value={item.descripcion}
                          onChange={(event) => handleItemChange(item.id, 'descripcion', event.target.value)}
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        title="Eliminar línea"
                        aria-label={'Eliminar línea ' + (idx + 1)}
                        className="remove-item"
                      >
                        ×
                      </button>
                    </div>

                    <div className="item-meta-grid">
                      <div className="item-field">
                        <label htmlFor={'item-' + item.id + '-cantidad'}>Cantidad</label>
                        <input id={'item-' + item.id + '-cantidad'} className="control" type="number" min="1" value={item.cantidad} onChange={(event) => handleItemChange(item.id, 'cantidad', event.target.value)} inputMode="numeric" />
                      </div>
                      <div className="item-field">
                        <label htmlFor={'item-' + item.id + '-precio'}>Precio ({symbol})</label>
                        <input id={'item-' + item.id + '-precio'} className="control" type="number" min="0" step="0.01" value={item.precioUnitario} onChange={(event) => handleItemChange(item.id, 'precioUnitario', event.target.value)} inputMode="decimal" />
                      </div>
                      <div className="item-field">
                        <label htmlFor={'item-' + item.id + '-descuento'}>Descuento %</label>
                        <input id={'item-' + item.id + '-descuento'} className="control" type="number" min="0" max="100" step="0.5" value={item.descuentoPorcentaje} onChange={(event) => handleItemChange(item.id, 'descuentoPorcentaje', event.target.value)} inputMode="decimal" />
                      </div>
                      <div className="checkbox-field">
                        <label>
                          <input type="checkbox" checked={item.aplicaIva} onChange={(event) => handleItemChange(item.id, 'aplicaIva', event.target.checked)} />
                          <span>IVA 22%</span>
                        </label>
                      </div>
                    </div>

                    <div className="item-total" aria-live="polite">
                      <span>Subtotal {symbol} {(processed.subtotalLinea || 0).toFixed(2)}</span>
                      {item.aplicaIva && <span>IVA {symbol} {(processed.ivaLinea || 0).toFixed(2)}</span>}
                      <strong>Total {symbol} {(processed.totalLinea || 0).toFixed(2)}</strong>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="form-section" aria-labelledby="payment-heading">
            <div className="section-header">
              <h2 id="payment-heading">Condiciones y pago</h2>
              <span className="section-kicker">Opcional</span>
            </div>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="condiciones-comerciales">Condiciones comerciales</label>
                <textarea id="condiciones-comerciales" className="control" rows="3" value={condicionesComerciales} onChange={(event) => setCondicionesComerciales(event.target.value)} placeholder="Forma de pago, validez…" />
              </div>
              <div className="field">
                <label htmlFor="datos-transferencia">Datos de transferencia</label>
                <textarea id="datos-transferencia" className="control" rows="3" value={datosTransferencia} onChange={(event) => setDatosTransferencia(event.target.value)} placeholder="Banco, cuenta, titular…" />
              </div>
            </div>
          </section>

          <section className="form-section" aria-labelledby="summary-heading">
            <div className="section-header">
              <h2 id="summary-heading">Resumen</h2>
              <span className="section-kicker">{configFactura.moneda}</span>
            </div>
            <div className="totals">
              <div className="total-row"><span>Subtotal</span><span>{symbol} {totals.rawSubtotal.toFixed(2)}</span></div>
              {totals.totalDescuentoLineas > 0 && (
                <div className="total-row discount"><span>Descuentos en líneas</span><span>−{symbol} {totals.totalDescuentoLineas.toFixed(2)}</span></div>
              )}
              {totals.montoDescuentoGlobal > 0 && (
                <div className="total-row discount"><span>Descuento global ({descuentoGlobal}%)</span><span>−{symbol} {totals.montoDescuentoGlobal.toFixed(2)}</span></div>
              )}
              <div className="total-row"><span>IVA</span><span>{symbol} {totals.totalIva.toFixed(2)}</span></div>
              <div className="total-row grand-total"><span>Total</span><span>{symbol} {totals.totalFinal.toFixed(2)}</span></div>
            </div>
            <button type="submit" disabled={loading} className="primary-button">
              {loading ? 'Generando PDF…' : 'Generar PDF'}
            </button>
          </section>
        </form>

        <section aria-labelledby="beneficios-title" className="benefits">
          <h2 id="beneficios-title">Una herramienta directa</h2>
          <div className="benefits-grid">
            <article>
              <h3>Sin registro</h3>
              <p>Completa los datos y genera el documento sin crear una cuenta.</p>
            </article>
            <article>
              <h3>PDF listo para compartir</h3>
              <p>Descarga un archivo ordenado para enviarlo a tu cliente.</p>
            </article>
            <article>
              <h3>Hecho para Uruguay</h3>
              <p>Incluye moneda local, RUT, IVA y datos comerciales habituales.</p>
            </article>
          </div>
        </section>

        <SeoContent page={currentPage} />
        <Opiniones />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <span>© 2026 FacturasOnlineUY</span>
          <nav aria-label="Enlaces del sitio" className="footer-nav">
            <a href="/">Inicio</a>
            <a href="/generador-de-facturas">Facturas</a>
            <a href="/generador-de-proformas">Proformas</a>
            <a href="#ayuda">Ayuda</a>
            <button type="button" onClick={() => setTermsOpen(true)} className="footer-link-button">Términos</button>
          </nav>
        </div>
      </footer>

      {termsOpen && (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setTermsOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-title"
            aria-describedby="terms-description"
            className="terms-dialog"
          >
            <div className="modal-header">
              <h2 id="terms-title">Términos y condiciones</h2>
              <button
                type="button"
                ref={closeTermsButtonRef}
                onClick={() => setTermsOpen(false)}
                aria-label="Cerrar términos y condiciones"
                className="modal-close"
              >
                ×
              </button>
            </div>
            <div id="terms-description" className="modal-copy">
              <p>FacturasOnlineUY es un generador de diseño en PDF. No emite comprobantes fiscales oficiales avalados por la DGI.</p>
              <p>El usuario asume la responsabilidad total sobre el uso legal y ético de los documentos generados.</p>
              <p>La administración se reserva el derecho de eliminar opiniones anónimas que contengan spam o falten al respeto.</p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
