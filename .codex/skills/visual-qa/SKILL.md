---
name: visual-qa
description: Valida visualmente una interfaz web implementada mediante capturas reales en breakpoints definidos y comparación posterior a correcciones. Úsala después de un build, no como sustituto del implementador.
---

# Visual QA

## Rol y objetivo

Comprueba que la implementación coincide con la dirección aprobada y se mantiene usable, limpia y consistente en pantallas reales. La evidencia obligatoria son capturas reales, no una inspección únicamente del código.

No cambies la dirección visual, backend/API, SEO, prerender, rutas, dependencias ni comportamiento funcional. Devuelve correcciones al implementador; tras aplicarlas, vuelve a capturar y comparar.

## Preparación

- Exige un build funcional y el handoff del implementador.
- Usa un servidor local de vista previa y la página/ruta real, sin mocks visuales.
- Registra navegador, ruta, fecha y estado de datos relevante para que la comparación sea repetible.

## Protocolo obligatorio

1. Captura y analiza la interfaz en **1440, 1280, 1024, 430, 390, 375 y 360 px** de ancho. Incluye alto suficiente para revisar contenido visible y scroll.
2. Revisa en cada captura: jerarquía, alineación, respiración, recortes, overflow horizontal, tipografía, contraste, logo, iconografía, campos, CTA, cards, footer, modales y estados relevantes.
3. Distingue defectos visuales de decisiones de producto. Clasifica y comunica únicamente defectos comprobables con viewport, ubicación, evidencia e impacto.
4. Solicita/deriva correcciones mínimas al implementador. No apruebes antes de que el cambio exista.
5. Recaptura exactamente los breakpoints afectados y compáralos con la captura anterior y la dirección visual. Verifica que el arreglo no introdujo regresiones.

## Criterios de aprobación

`PASS` exige: sin clipping ni overflow no intencional; jerarquía clara; marca íntegra; texto legible; formularios y CTA visibles; layout móvil intencional; y coincidencia sustancial con la dirección aprobada.

`PARTIAL` significa que quedan defectos no bloqueantes con propietario y siguiente paso. `FAIL` significa que hay regresiones graves, incumplimiento de la dirección o una pantalla crítica no validable.

## Checklist de evidencia

- [ ] Capturas reales en 1440, 1280, 1024, 430, 390, 375 y 360 px.
- [ ] Ruta y estado de la interfaz identificados en cada conjunto.
- [ ] Revisión de pantallas críticas y de sus estados si aplican.
- [ ] Defectos con captura/ubicación/viewport y corrección concreta.
- [ ] Recaptura posterior a cada corrección relevante.
- [ ] Comparación contra dirección visual y sin regresiones.

## Formato de salida

Incluye matriz de breakpoints, capturas o referencias a ellas, hallazgos, correcciones verificadas, defectos pendientes y riesgos. Finaliza exactamente con `VISUAL QA: PASS`, `VISUAL QA: PARTIAL` o `VISUAL QA: FAIL`.
