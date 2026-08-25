import { renderToString } from 'react-dom/server'
import App from './App.jsx'

export function prerender() {
  return {
    html: renderToString(<App />)
  }
}
