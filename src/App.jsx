import { useState, useMemo } from 'react'

const API_URL = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '')

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

function App() {
  // States
  const [emisor, setEmisor] = useState(DEFAULT_EMISOR)
  const [cliente, setCliente] = useState(DEFAULT_CLIENTE)
  const [configFactura, setConfigFactura] = useState({
    numero: 'F001',
    fecha: new Date().toISOString().split('T')[0],
    moneda: 'USD'
  })
  const [descuentoGlobal, setDescuentoGlobal] = useState(0)
  const [items, setItems] = useState(INITIAL_ITEMS)
  const [condicionesComerciales, setCondicionesComerciales] = useState('')
  const [datosTransferencia, setDatosTransferencia] = useState('')

  // Status states
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

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
      link.setAttribute('download', `Factura_${configFactura.numero || 'F001'}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setSuccessMsg('¡Factura descargada con éxito!')
    } catch (err) {
      console.error('Error al generar factura:', err)
      setErrorMsg(err.message || 'Error al conectar con el backend.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                FacturaExpress
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                PRO
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-400 hidden md:flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Backend Status: Online</span>
            </span>
            <button
              onClick={handleGeneratePdf}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-md shadow-indigo-600/30 transition duration-150 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>Descargar PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - 2 Columns (65% / 35%) */}
      <main id="inicio" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <span className="font-semibold block">Error al procesar factura</span>
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <form id="generador" onSubmit={handleGeneratePdf} className="flex flex-col lg:flex-row gap-8">

          {/* LEFT COLUMN (65%) */}
          <div className="w-full lg:w-[65%] space-y-8">

            {/* Header Banner info */}
            <div className="bg-gradient-to-r from-indigo-900/30 via-purple-900/20 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 relative overflow-hidden">
              <div className="relative z-10 space-y-1">
                <h1 className="text-xl font-bold text-white">Generador de Facturas Online para Uruguay</h1>
                <p className="text-xs text-slate-300 max-w-xl">
                  Completa los datos de emisor, cliente e ítems para crear facturas en PDF y generar un comprobante profesional al instante.
                </p>
              </div>
            </div>

            {/* SECCIÓN 1: Datos del Emisor */}
            <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-200">Datos del Emisor</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nombre / Razón Social</label>
                  <input
                    type="text"
                    name="nombre"
                    value={emisor.nombre}
                    onChange={handleEmisorChange}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">RUT</label>
                  <input
                    type="text"
                    name="rut"
                    value={emisor.rut}
                    onChange={handleEmisorChange}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-1 font-medium">Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={emisor.direccion}
                    onChange={handleEmisorChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    value={emisor.telefono}
                    onChange={handleEmisorChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={emisor.email}
                    onChange={handleEmisorChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: Datos del Cliente */}
            <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-200">Datos del Cliente</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nombre / Razón Social</label>
                  <input
                    type="text"
                    name="nombre"
                    value={cliente.nombre}
                    onChange={handleClienteChange}
                    required
                    placeholder="Empresa o Persona física"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Documento (RUT / CI)</label>
                  <input
                    type="text"
                    name="documento"
                    value={cliente.documento}
                    onChange={handleClienteChange}
                    required
                    placeholder="123456780019"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-400 mb-1 font-medium">Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={cliente.direccion}
                    onChange={handleClienteChange}
                    placeholder="Calle, Número, Ciudad"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: Configuración de Factura */}
            <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-200">Configuración de Comprobante</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Número Factura</label>
                  <input
                    type="text"
                    name="numero"
                    value={configFactura.numero}
                    onChange={handleConfigChange}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Fecha Emisión</label>
                  <input
                    type="date"
                    name="fecha"
                    value={configFactura.fecha}
                    onChange={handleConfigChange}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Moneda</label>
                  <select
                    name="moneda"
                    value={configFactura.moneda}
                    onChange={handleConfigChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 font-medium focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    <option value="USD">USD (Dólares)</option>
                    <option value="UYU">UYU (Pesos Uruguayos)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Desc. Global (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={descuentoGlobal}
                    onChange={(e) => setDescuentoGlobal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </section>

            {/* SECCIÓN 4: Líneas de Producto */}
            <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                    </svg>
                  </div>
                  <h2 className="text-base font-semibold text-slate-200">Líneas de Producto / Servicio</h2>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition flex items-center space-x-1 cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Agregar Ítem</span>
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const processed = totals.processedItems[idx] || {}
                  return (
                    <div
                      key={item.id}
                      className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-4 space-y-3 transition hover:border-slate-700"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          #{idx + 1}
                        </span>
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Descripción del producto o servicio"
                            value={item.descripcion}
                            onChange={(e) => handleItemChange(item.id, 'descripcion', e.target.value)}
                            required
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          title="Eliminar fila"
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                        <div>
                          <label className="block text-slate-400 mb-1">Cantidad</label>
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => handleItemChange(item.id, 'cantidad', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">Precio Unit. ({symbol})</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precioUnitario}
                            onChange={(e) => handleItemChange(item.id, 'precioUnitario', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-400 mb-1">Desc. (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={item.descuentoPorcentaje}
                            onChange={(e) => handleItemChange(item.id, 'descuentoPorcentaje', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                          />
                        </div>

                        <div className="flex flex-col justify-end">
                          <label className="inline-flex items-center space-x-2 cursor-pointer pb-2">
                            <input
                              type="checkbox"
                              checked={item.aplicaIva}
                              onChange={(e) => handleItemChange(item.id, 'aplicaIva', e.target.checked)}
                              className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className="text-slate-300 font-medium text-[11px]">Aplica IVA 22%</span>
                          </label>
                        </div>
                      </div>

                      {/* Row Total calculation preview */}
                      <div className="flex items-center justify-end space-x-4 text-[11px] text-slate-400 border-t border-slate-800/60 pt-2 font-mono">
                        <span>Subtotal: {symbol} {(processed.subtotalLinea || 0).toFixed(2)}</span>
                        {item.aplicaIva && <span>IVA: {symbol} {(processed.ivaLinea || 0).toFixed(2)}</span>}
                        <span className="font-bold text-slate-200">Total: {symbol} {(processed.totalLinea || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* SECCIÓN 5: Textos Legales y Datos de Transferencia */}
            <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-slate-200">Condiciones Comerciales y Pago</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Condiciones Comerciales</label>
                  <textarea
                    rows="3"
                    value={condicionesComerciales}
                    onChange={(e) => setCondicionesComerciales(e.target.value)}
                    placeholder="Términos de pago, validez de la oferta..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-amber-500 transition resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Datos de Transferencia Bancaria</label>
                  <textarea
                    rows="3"
                    value={datosTransferencia}
                    onChange={(e) => setDatosTransferencia(e.target.value)}
                    placeholder="Banco, Nro. de cuenta, titular..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-amber-500 transition resize-none"
                  ></textarea>
                </div>
              </div>
            </section>

            {/* Main Form CTA Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/25 transition duration-200 transform active:scale-[0.99] disabled:opacity-50 flex items-center justify-center space-x-3 cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Procesando solicitud...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Generar y Descargar PDF</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN (35% Sticky Sidebar) */}
          <div className="w-full lg:w-[35%] space-y-6">
            <div className="sticky top-24 space-y-6">

              {/* Monetization Slot 1: Vertical AdSense Banner Placeholder */}
              <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-6 min-h-[300px] flex flex-col items-center justify-center text-center space-y-2">
                <div className="p-3 rounded-full bg-slate-800/60 text-slate-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <span className="text-xs font-mono font-medium text-slate-400">
                  [Espacio AdSense - Banner Vertical]
                </span>
                <span className="text-[10px] text-slate-600">300 x 600 Responsive Slot</span>
              </div>

              {/* Real-time Summary Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-slate-200 text-sm flex items-center space-x-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-6 4h6M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Resumen de Factura</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    {configFactura.moneda}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal Líneas:</span>
                    <span className="font-mono">{symbol} {totals.rawSubtotal.toFixed(2)}</span>
                  </div>

                  {totals.totalDescuentoLineas > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Descuentos en Ítems:</span>
                      <span className="font-mono">-{symbol} {totals.totalDescuentoLineas.toFixed(2)}</span>
                    </div>
                  )}

                  {totals.montoDescuentoGlobal > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Descuento Global ({descuentoGlobal}%):</span>
                      <span className="font-mono">-{symbol} {totals.montoDescuentoGlobal.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400">
                    <span>Base Imponible Subtotal:</span>
                    <span className="font-mono">{symbol} {totals.subtotalFinal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>IVA (22%):</span>
                    <span className="font-mono">{symbol} {totals.totalIva.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-slate-800 pt-3 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-white">TOTAL A PAGAR:</span>
                    <span className="text-xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent font-mono">
                      {symbol} {totals.totalFinal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Sidebar CTA */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition duration-150 disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? (
                    <span>Procesando...</span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Descargar Comprobante PDF</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>

        </form>

        {/* Monetization Slot 2: Horizontal AdSense Banner Placeholder at Bottom */}
        <section className="mt-12 bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-2">
          <div className="p-3 rounded-full bg-slate-800/60 text-slate-500">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-xs font-mono font-medium text-slate-400">
            [Espacio AdSense - Banner Horizontal]
          </span>
          <span className="text-[10px] text-slate-600">728 x 90 Leaderboard / Responsive Slot</span>
        </section>

        <section id="ayuda" className="mt-12 max-w-3xl mx-auto text-center space-y-3">
          <h2 className="text-lg font-bold text-slate-200">Facturación online simple para emprendedores de Uruguay</h2>
          <p className="text-sm leading-6 text-slate-400">
            FacturasOnlineUY te permite crear facturas en PDF, organizar los datos de tus clientes y descargar tus comprobantes de forma rápida y profesional.
            Completa el formulario con la información de tu negocio y genera un documento listo para compartir con tus clientes.
          </p>
          <p className="text-sm leading-6 text-slate-400">
            Nuestra herramienta está pensada para emprendedores de Uruguay, profesionales independientes y pequeñas empresas que necesitan gestionar su facturación online sin complicaciones.
          </p>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <nav aria-label="Navegación interna" className="mb-3 flex justify-center gap-4">
          <a href="#inicio" className="hover:text-indigo-400 transition">Inicio</a>
          <a href="#generador" className="hover:text-indigo-400 transition">Generador</a>
          <a href="#ayuda" className="hover:text-indigo-400 transition">Ayuda</a>
        </nav>
        <p>© 2026 FacturasOnlineUY. Generador de facturas online para Uruguay.</p>
      </footer>
    </div>
  )
}

export default App
