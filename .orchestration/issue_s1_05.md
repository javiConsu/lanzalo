## Contexto
El backend del plan mezcla flujo real y fallback demo. Eso contamina la lectura de activación y debilita la integridad del MVP.

Documentos de referencia:
- `FOCUS_DIRECTIVE.plan.md`
- `SPRINT_01_ACTIVATION.plan.md`
- `backend/routes/plans.js`

## Objetivo
Separar de forma explícita el modo demo y el modo producción en la generación del plan de 14 días.

## Trabajo a realizar
- Revisar `backend/routes/plans.js`.
- Evitar que el camino principal de producción dependa de fallback demo silencioso.
- Si se mantiene demo, dejarlo explícito y aislado.
- Garantizar que la señal de activación del producto refleje uso real y no maqueta.

## Criterios de aceptación
- El flujo productivo falla o responde de forma explícita cuando faltan datos críticos; no simula éxito sin avisar.
- El modo demo queda aislado y utilizable sólo cuando se solicite de forma explícita.
- El comportamiento queda documentado.

## Evidencia requerida
- Diff o PR.
- Nota técnica breve explicando el nuevo comportamiento.
