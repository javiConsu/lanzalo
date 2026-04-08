# EXECUTION QUEUE — Lanzalo

**Última actualización:** 2026-04-08
**Sprint activo:** `SPRINT_01_ACTIVATION.plan.md`
**Regla:** esta es la única cola de trabajo válida para el sprint actual.

## 1. Prioridad única del sprint

> **Aumentar la activación real del flujo `idea -> viabilidad -> plan -> cofundador` y eliminar la dispersión entre promesa, producto y ejecución.**

## 2. Cola activa

| Orden | ID | Tarea | Responsable | Estado | Impacto esperado |
|---|---|---|---|---|---|
| 1 | S1-01 | Reescribir hero, subtítulo y CTAs de la landing al framing de cofundador IA en 14 días | Fron-Dani | todo | Alinea promesa con producto real |
| 2 | S1-03 | Verificar el flujo completo de onboarding en entorno real y registrar roturas | CEO-Neo | todo | Detecta el cuello de botella dominante |
| 3 | S1-05 | Separar modo demo y modo producción en planes | Back-David | todo | Evita señal falsa de activación |
| 4 | S1-06 | Persistir el estado diario del plan en backend | Back-David | todo | Elimina fragilidad por localStorage |
| 5 | S1-07 | Hacer visible el estado de tareas delegadas y su entregable | Fron-Dani + Back-David | todo | Convierte delegación en valor visible |
| 6 | S1-08 | Definir e instrumentar `first_useful_action` | Back-David | todo | Hace medible la activación real |
| 7 | S1-09 | Mejorar lectura de artefactos generados en el dashboard | Fron-Dani | todo | Sube percepción de valor útil |
| 8 | S1-10 | Congelar o esconder navegación que distrae del flujo principal | Fron-Dani | todo | Reduce ruido y dispersión |
| 9 | S1-02 | Auditar copy público y claims inconsistentes | CEO-Neo | todo | Cierra incoherencias externas |
| 10 | S1-04 | Corregir rutas rotas o pasos redundantes del onboarding | Fron-Dani | backlog | Sólo entra tras auditoría real |

## 3. Cola congelada

Estas líneas no se trabajan en este sprint salvo incidencia crítica directa.

| Línea congelada | Motivo |
|---|---|
| Nuevos módulos de marketing, SEO o ads | No arreglan activación |
| Escalabilidad avanzada | Prematura |
| Growth automation lateral | Coste antes de señal |
| Nuevos verticales | Dispersión |
| Refactors cosméticos sin impacto en funnel | Ruido |

## 4. WIP limits

Para evitar dispersión, se aplican estos límites.

| Tipo de trabajo | Límite |
|---|---|
| Tareas `in_progress` totales | 3 |
| Tareas simultáneas por responsable | 2 |
| Incidencias críticas fuera de sprint | 1 abierta a la vez |

## 5. Regla de movimiento

Una tarea sólo puede pasar de estado si cumple esto.

| Cambio de estado | Condición obligatoria |
|---|---|
| `todo` -> `in_progress` | Tiene responsable, criterio de éxito y encaje en foco |
| `in_progress` -> `in_review` | Tiene evidencia verificable |
| `in_review` -> `done` | Se verificó impacto real o integridad técnica |
| cualquier estado -> `cancelled` | Se demuestra que no mueve claridad, activación o utilidad |

## 6. Criterio de cancelación inmediata

Cancelar sin debate largo si ocurre una de estas.

| Condición | Acción |
|---|---|
| La tarea no mejora claridad, activación o utilidad | Cancelar |
| La tarea duplica algo del inventario | Cancelar |
| La tarea abre una línea nueva de producto | Congelar |
| La tarea lleva 3 intentos sin avance real | Redefinir o cortar |

## 7. Evidencia obligatoria por tarea

| Tipo de tarea | Evidencia mínima |
|---|---|
| Copy / landing | diff + URL o captura funcional |
| Funnel / onboarding | checklist recorrido + resultado por paso |
| Backend / persistencia | endpoint, prueba o evidencia de dato persistido |
| Analytics | evento capturado y nombre exacto |
| Dashboard / UX | pantalla funcional + comportamiento verificado |

## 8. Daily cut

Cada día, antes de abrir trabajo nuevo, revisar esta tabla y responder sólo una pregunta:

> **¿Qué tarea en esta cola moverá más el funnel hoy?**

Si no hay respuesta clara, trabajar la de menor orden numérico.

## 9. Orden operativa actual

El orden vigente del sprint es este.

1. Mensaje y promesa.
2. Auditoría real del flujo.
3. Separación demo vs producción.
4. Persistencia y trazabilidad.
5. Medición de activación.
6. Limpieza de navegación y artefactos.

## 10. Nota final

No se crean tareas nuevas fuera de este archivo hasta cerrar o revisar el sprint.
