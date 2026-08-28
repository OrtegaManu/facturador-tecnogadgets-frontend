import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SEO_PAGES, SITE_URL_BASE } from '../src/seoPages.js'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, '..')
const outputDirectory = path.join(projectDirectory, 'dist')
const indexPath = path.join(outputDirectory, 'index.html')

const escapeHtml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

function pageUrl(page) {
  return `${SITE_URL_BASE}${page.path}`
}

function jsonLd(page) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'FacturasOnlineUY',
    url: pageUrl(page),
    description: page.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'UYU'
    }
  })
}

function staticMarkup(page) {
  const internalLinks = Object.values(SEO_PAGES)
    .map((linkedPage) => `<a href="${linkedPage.path}">${escapeHtml(linkedPage.h1)}</a>`)
    .join('')
  const steps = page.howItWorks.map((step) => `<li>${escapeHtml(step)}</li>`).join('')
  const faq = page.faq
    .map(([question, answer]) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`)
    .join('')

  return `<header><nav aria-label="Navegación principal">${internalLinks}</nav></header><main><section id="generador" aria-labelledby="generator-heading"><h1 id="generator-heading">${escapeHtml(page.h1)}</h1><p>${escapeHtml(page.intro)}</p><a href="#generador">Crear ${escapeHtml(page.documentLabel)} en PDF</a></section><section aria-labelledby="how-heading"><h2 id="how-heading">Cómo funciona</h2><ol>${steps}</ol></section><section aria-labelledby="faq-heading"><h2 id="faq-heading">Preguntas frecuentes</h2>${faq}</section></main><footer><nav aria-label="Enlaces del sitio">${internalLinks}</nav></footer>`
}

function renderPage(template, page) {
  const canonical = pageUrl(page)
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">${jsonLd(page)}</script>`)
    .replace('<div id="root"></div>', `<div id="root">${staticMarkup(page)}</div>`)
}

const template = await readFile(indexPath, 'utf8')

for (const page of Object.values(SEO_PAGES)) {
  const destination = page.path === '/'
    ? indexPath
    : path.join(outputDirectory, page.path.slice(1), 'index.html')

  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, renderPage(template, page), 'utf8')
}

const sitemapUrls = Object.values(SEO_PAGES)
  .map((page) => `  <url><loc>${pageUrl(page)}</loc></url>`)
  .join('\n')
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`
await writeFile(path.join(outputDirectory, 'sitemap.xml'), sitemap, 'utf8')
