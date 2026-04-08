## Contexto
El dashboard de cofundador guarda parte del estado del plan en `localStorage`. Eso vuelve frágil la experiencia y rompe trazabilidad real.

Documentos de referencia:
- `SPRINT_01_ACTIVATION.plan.md`
- `docs/EXECUTION_QUEUE.md`
- `frontend/src/pages/CofundadorDashboard.jsx`

## Objetivo
Persistir el estado diario de tareas del plan en backend para que el progreso no dependa del navegador del usuario.

## Trabajo a realizar
- Diseñar persistencia mínima para estado de tareas del plan.
- Crear o adaptar endpoints/backend necesarios.
- Conectar el dashboard para leer y escribir ese estado desde backend.
- Mantener una UX clara de `todo`, `in_progress`, `done`.

## Criterios de aceptación
- El estado de tareas persiste entre sesiones y dispositivos.
- El dashboard deja de depender de `localStorage` como fuente principal de verdad.
- El estado delegado o completado puede auditarse.

## Evidencia requerida
- Diff o PR.
- Prueba funcional mostrando persistencia real.
