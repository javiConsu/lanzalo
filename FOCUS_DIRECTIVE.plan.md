# Lanzalo — Directiva de foco y MVP

**Fecha:** 2026-04-08
**Rol:** Dirección de producto y orquestación operativa
**Estado:** Activa hasta reemplazo explícito

## Decisión

**Lanzalo deja de operar, a nivel de foco, como una promesa horizontal de "empresa autónoma que hace de todo".**

Desde hoy, el producto se define así:

> **Lanzalo es un cofundador IA que ayuda a un founder a lanzar una idea en 14 días con un flujo guiado de validación, plan accionable y delegación de tareas concretas a agentes.**

Esta decisión no prohíbe que existan más capacidades detrás. Prohíbe venderlas, diseñarlas y priorizarlas como si ya fueran el producto principal.

## Qué se mantiene

El núcleo actual que sí tiene sentido conservar es el flujo ya visible en código:

| Capa | Estado | Decisión |
|---|---|---|
| Landing pública | Existe | Reescribir mensaje para alinearlo al cofundador de 14 días |
| Onboarding idea propia / idea validada | Existe | Mantener |
| Perfil founder | Existe | Mantener |
| Análisis de viabilidad | Existe | Mantener |
| Plan de 14 días | Existe | Mantener y reforzar |
| Dashboard de cofundador | Existe | Convertir en centro del producto |
| Delegación de tareas a agentes | Existe parcialmente | Mantener |
| Artefactos generados | Existe parcialmente | Mantener |
| Trial + paywall | Existe | Mantener |

## Qué se congela

Todo lo siguiente queda congelado hasta que el núcleo active y convierta:

| Línea | Motivo del recorte |
|---|---|
| Narrativa de "crear y gestionar cualquier empresa autónoma" | Es demasiado amplia y resta credibilidad |
| Expansión de módulos secundarios sin uso probado | Dispersa roadmap |
| Nuevas automatizaciones de social, ads y growth no ligadas al flujo principal | Añaden coste antes de demostrar activación |
| Optimización de escalabilidad avanzada para alto volumen | Prematura |
| Experimentos de plataforma multi-venture como foco principal | El usuario todavía no compra eso; compra resultado claro |
| Cualquier funcionalidad que no mejore activación, claridad o conversión del flujo 14 días | Fuera de MVP |

## Promesa oficial del MVP

La promesa que debe gobernar copy, producto y ventas es esta:

> **Describe tu idea, recibe un análisis de viabilidad, obtén un plan de 14 días y ejecuta cada día con un cofundador IA que te ayuda a sacar el proyecto del papel.**

## Usuario principal

El usuario principal del MVP no es "cualquier empresa".

Es este:

| Variable | Definición |
|---|---|
| Perfil | Founder solo o equipo de 1-3 personas |
| Punto de partida | Tiene idea o quiere elegir una idea validada |
| Dolor | No sabe qué hacer primero y se dispersa |
| Deseo | Validar rápido, construir lo mínimo y conseguir primeras ventas |
| Lo que compra | Claridad, secuencia, ejecución guiada y ayuda práctica |

## Métrica norte

La métrica que manda no es número de features. Es esta:

**Porcentaje de usuarios registrados que completan el flujo hasta entrar en el dashboard de cofundador con plan generado y realizan al menos una delegación útil o una interacción accionable.**

## Métricas obligatorias del MVP

| Métrica | Objetivo inicial |
|---|---|
| Registro -> onboarding iniciado | > 60% |
| Onboarding iniciado -> análisis completado | > 45% |
| Análisis completado -> plan generado | > 35% |
| Plan generado -> entrada en cofundador | > 30% |
| Entrada en cofundador -> primera acción útil | > 20% |
| Trial -> pago | Validar, no escalar todavía |

## Definición del MVP real

El MVP no son todos los módulos actuales. El MVP son estas 20 tareas y no más.

| ID | Tarea | Prioridad |
|---|---|---|
| MVP-01 | Reescribir la hero y propuesta principal de landing al framing de cofundador 14 días | P0 |
| MVP-02 | Reescribir pricing, FAQ y CTAs para prometer un resultado concreto y no una empresa autónoma total | P0 |
| MVP-03 | Unificar el punto de entrada del onboarding y eliminar pasos ambiguos o duplicados | P0 |
| MVP-04 | Verificar que el flujo idea -> founder profile -> viability -> plan funciona sin rutas rotas | P0 |
| MVP-05 | Eliminar dependencias de demo en el camino principal de producción o dejarlas sólo para demo explícita | P0 |
| MVP-06 | Persistir el estado de tareas del plan en backend, no en localStorage | P0 |
| MVP-07 | Hacer que la delegación desde el dashboard cree trabajo trazable y visible para el usuario | P0 |
| MVP-08 | Mejorar la lectura de artefactos generados en el panel derecho del cofundador | P0 |
| MVP-09 | Registrar eventos completos del funnel de activación | P0 |
| MVP-10 | Definir un criterio de “acción útil” y medirlo | P0 |
| MVP-11 | Simplificar el dashboard clásico para no competir con el dashboard de cofundador | P1 |
| MVP-12 | Revisar copy del análisis de viabilidad para vender decisión, no espectáculo | P1 |
| MVP-13 | Ajustar el plan de 14 días para que siempre tenga outputs medibles y delegables | P1 |
| MVP-14 | Mejorar historial del chat para que el contexto de ejecución sea legible | P1 |
| MVP-15 | Añadir estados claros de progreso por día, sprint y entregable | P1 |
| MVP-16 | Añadir emails transaccionales ligados al avance real del flujo | P1 |
| MVP-17 | Preparar una demo estable del flujo completo para ventas y validación | P1 |
| MVP-18 | Revisar paywall para no bloquear activación demasiado pronto | P2 |
| MVP-19 | Congelar módulos no críticos en navegación o reetiquetarlos como secundarios | P2 |
| MVP-20 | Preparar tablero operativo de activación y conversión | P2 |

## Regla de priorización

Si una tarea no mejora una de estas tres variables, no entra en sprint:

1. **Claridad de promesa**
2. **Activación del flujo principal**
3. **Conversión a pago o señal real de valor**

## Qué no se debe volver a hacer

| Anti-patrón | Orden operativa |
|---|---|
| Construir nuevas pestañas porque “quedan bien” | Prohibido |
| Hablar de autonomía total sin demostrar el loop principal | Prohibido |
| Mezclar dashboard clásico, admin y cofundador sin jerarquía clara | Prohibido |
| Medir éxito por tareas cerradas en vez de por activación | Prohibido |
| Crear features para futuros volúmenes inexistentes | Prohibido |

## Resultado esperado de esta directiva

Si se cumple esta directiva, Lanzalo pasa de ser un sistema prometedor pero difuso a un producto entendible:

- una promesa clara,
- un flujo principal defendible,
- una demo vendible,
- una activación medible,
- y una base sobre la que luego sí podrás abrir verticales o automatizaciones más ambiciosas.

## Orden de ejecución inmediata

La secuencia correcta es:

1. **Alinear mensaje**
2. **Cerrar roturas del flujo principal**
3. **Medir activación real**
4. **Corregir delegación y entregables**
5. **Sólo después, optimizar monetización y expansión**
