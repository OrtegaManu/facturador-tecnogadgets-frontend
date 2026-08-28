const SITE_URL = 'https://facturasonlineuy.org'

export const SEO_PAGES = {
  '/': {
    path: '/',
    title: 'Generador de Facturas Online Uruguay | Gratis y sin registro',
    description: 'Creá facturas y proformas en PDF gratis, sin registro y en segundos. Una herramienta ágil para freelancers, técnicos y pequeños comercios de Uruguay.',
    h1: 'Generador de facturas online gratis',
    intro: 'Creá facturas y proformas en PDF de forma rápida, clara y sin registro. FacturasOnlineUY está pensado para quienes necesitan resolver un comprobante profesional desde Uruguay, incluso desde el celular.',
    documentType: 'FACTURA',
    documentLabel: 'factura',
    howItWorks: [
      'Completá los datos del emisor, cliente y los ítems.',
      'Revisá los importes, descuentos e IVA.',
      'Generá y descargá el PDF para compartirlo.'
    ],
    faq: [
      ['¿FacturasOnlineUY es gratis?', 'Sí. Podés crear y descargar el diseño de tu documento en PDF sin registro.'],
      ['¿Necesito registrarme?', 'No. El generador está disponible sin crear una cuenta.'],
      ['¿Puedo usarlo desde el celular?', 'Sí. La interfaz se adapta a pantallas móviles para completar el documento desde cualquier dispositivo.'],
      ['¿Puedo descargar el documento en PDF?', 'Sí. Al finalizar, el archivo se descarga en formato PDF listo para compartir.']
    ]
  },
  '/generador-de-facturas': {
    path: '/generador-de-facturas',
    title: 'Generador de Facturas Online | Crear factura PDF gratis',
    description: 'Creá una factura online y descargala en PDF gratis, sin registro. Completá emisor, cliente, productos, IVA y descuentos en pocos pasos.',
    h1: 'Generador de facturas online',
    intro: 'Usá este generador de facturas para preparar un documento en PDF con tus datos, los de tu cliente, productos, descuentos e IVA. Es una opción simple para crear una factura online sin perder tiempo.',
    documentType: 'FACTURA',
    documentLabel: 'factura',
    howItWorks: [
      'Ingresá los datos comerciales del emisor y del cliente.',
      'Agregá productos o servicios, cantidades y precios.',
      'Descargá la factura PDF cuando los totales estén listos.'
    ],
    faq: [
      ['¿Cómo hago una factura online?', 'Completá el formulario con los datos de las partes y los ítems; el sistema calcula los totales y genera el PDF.'],
      ['¿Puedo incluir IVA y descuentos?', 'Sí. Cada línea admite IVA y descuento, además de un descuento global.'],
      ['¿La factura se puede compartir?', 'Sí. El resultado se descarga como PDF para enviarlo por el medio que prefieras.'],
      ['¿Es un comprobante fiscal oficial?', 'No. Es un generador de diseño en PDF y no emite comprobantes fiscales oficiales avalados por la DGI.']
    ]
  },
  '/generador-de-proformas': {
    path: '/generador-de-proformas',
    title: 'Generador de Proformas Online Uruguay | Crear proforma PDF gratis',
    description: 'Creá una proforma o presupuesto online y descargalo en PDF gratis, sin registro. Presentá productos, servicios, precios e impuestos con claridad.',
    h1: 'Generador de proformas online',
    intro: 'Prepará una proforma PDF para presentar una cotización de productos o servicios antes de concretar una venta. El mismo formulario te permite ordenar precios, impuestos y condiciones comerciales en minutos.',
    documentType: 'PROFORMA',
    documentLabel: 'proforma',
    howItWorks: [
      'Ingresá los datos de tu negocio y de la persona o empresa destinataria.',
      'Detallá productos o servicios, precios, descuentos e impuestos.',
      'Descargá la proforma PDF para enviarla como presupuesto.'
    ],
    faq: [
      ['¿Qué es una proforma?', 'Es un documento de cotización que informa productos o servicios, precios y condiciones antes de la venta.'],
      ['¿Cuál es la diferencia entre factura y proforma?', 'La proforma sirve como presupuesto previo; la factura documenta la operación comercial según el uso que corresponda.'],
      ['¿Puedo crear una proforma desde el celular?', 'Sí. Podés completar y descargar la proforma desde una pantalla móvil.'],
      ['¿Se guardan mis datos?', 'El generador procesa los datos necesarios para crear el PDF. Revisá la política de privacidad definitiva antes de hacer afirmaciones adicionales sobre almacenamiento.']
    ]
  }
}

export const SITE_URL_BASE = SITE_URL

export function getSeoPage(pathname) {
  const normalizedPath = pathname === '/' ? '/' : pathname.replace(/\/$/, '')
  return SEO_PAGES[normalizedPath] || SEO_PAGES['/']
}
