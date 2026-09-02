# Flujo de skills de UI para FacturasOnlineUY

Estas skills separan la dirección, implementación y validación de la interfaz. Sirven para cambios visuales de la SPA sin ampliar el alcance técnico.

## Reglas globales

El producto es una herramienta: el formulario, los importes y la acción de generar/descargar deben mantener prioridad. No se modifican backend, API, PDF, SEO, prerender, rutas, configuración de despliegue ni dependencias por cambios de UI, salvo autorización explícita. Cada fase preserva marca, usabilidad móvil, accesibilidad y rendimiento.

## Flujo recomendado

1. `ui-art-director` analiza la interfaz y entrega una dirección implementable.
2. Producto o usuario aprueba esa dirección o devuelve ajustes.
3. `frontend-implementer` implementa únicamente lo aprobado y valida lint, pruebas disponibles, build y diff.
4. `ux-accessibility-reviewer` audita el flujo, teclado, semántica y móvil; devuelve hallazgos priorizados.
5. `visual-qa` toma capturas reales en 1440, 1280, 1024, 430, 390, 375 y 360 px y reporta defectos visuales.
6. `anti-vibecode-reviewer` revisa de forma adversarial los patrones genéricos y la coherencia con el dominio.
7. `frontend-implementer` aplica solo los fixes aceptados.
8. `visual-qa` recaptura, compara y emite su resultado final.
9. `anti-vibecode-reviewer` realiza la revisión final y emite su resultado final.

No se omiten las revisiones ni el recapture después de correcciones visuales. El implementador no se autoaprueba.

## Handoffs mínimos

| Fase | Entrega necesaria para la siguiente |
| --- | --- |
| Dirección | Objetivo, composición, reglas responsive, preservaciones y criterios de aceptación. |
| Implementación | Archivos cambiados, validaciones, diff revisado y riesgos. |
| UX/a11y | Hallazgos con severidad, evidencia, impacto y corrección mínima. |
| Visual QA | Capturas por breakpoint, comparación y defectos verificables. |
| Anti-vibecode | Fortalezas, patrones detectados y cambios mínimos. |

## Invocación sugerida

Usa una skill por fase y pasa el artefacto de la fase anterior. Ejemplo de prompt maestro:

```text
Objetivo: [cambio visual concreto].
Alcance: [rutas/componentes].
Restricciones: no cambiar backend, API, PDF, SEO, prerender, rutas ni dependencias.
Marca/activos: [referencias].

1. Usa $ui-art-director y entrega una dirección visual; espera aprobación.
2. Tras mi aprobación, usa $frontend-implementer. Ejecuta lint, pruebas disponibles, build y diff check.
3. Usa $ux-accessibility-reviewer, luego $visual-qa con capturas reales en todos los breakpoints obligatorios.
4. Usa $anti-vibecode-reviewer. Aplica solo fixes aceptados con $frontend-implementer.
5. Repite $visual-qa y $anti-vibecode-reviewer hasta que ambos entreguen PASS.
```

Para una revisión sin implementar cambios, invoca únicamente el revisor correspondiente y solicita un informe con su estado final.
