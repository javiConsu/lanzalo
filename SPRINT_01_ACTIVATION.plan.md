# Sprint 01 — Activación del cofundador IA

**Ventana sugerida:** 7 días
**Objetivo único:** aumentar la activación real del flujo `idea -> viabilidad -> plan -> cofundador`
**Métrica de éxito:** más usuarios llegan al dashboard de cofundador, entienden qué hacer y ejecutan una primera acción útil.

## Criterio de entrada

Este sprint existe porque el producto ya tiene un flujo principal visible, pero la promesa, la persistencia y la experiencia siguen mezcladas.

No se admiten tareas fuera de estas tres categorías:

| Categoría | Qué entra |
|---|---|
| Claridad | copy, navegación, framing |
| Activación | onboarding, viabilidad, plan, cofundador |
| Ejecución útil | delegación, trazabilidad, entregables |

## Tareas del sprint

| ID | Tarea | Responsable sugerido | Resultado verificable |
|---|---|---|---|
| S1-01 | Reescribir hero, subtítulo y CTAs de la landing al framing de cofundador IA en 14 días | Fron-Dani | Landing deja de prometer autonomía total y promete resultado concreto |
| S1-02 | Auditar todo el copy público para eliminar claims horizontales inconsistentes | CEO-Neo | Documento de claims eliminados y claims permitidos |
| S1-03 | Verificar el flujo completo de onboarding en entorno real y registrar roturas | CEO-Neo | Checklist con pasos, rutas y fallos reales |
| S1-04 | Corregir rutas rotas o pasos redundantes del onboarding | Fron-Dani | Flujo continuo sin dead ends |
| S1-05 | Separar explícitamente modo demo y modo producción en planes | Back-David | El flujo productivo no depende de fallback demo silencioso |
| S1-06 | Persistir el estado diario de tareas del plan en backend | Back-David | El progreso no depende de localStorage |
| S1-07 | Hacer visible en el dashboard cuándo una tarea fue delegada, en qué estado está y qué entregó | Fron-Dani + Back-David | El usuario puede seguir una tarea delegada de punta a punta |
| S1-08 | Definir y registrar el evento `first_useful_action` | Back-David | Evento disponible y trazable en analytics |
| S1-09 | Revisar panel derecho de artefactos para que muestre outputs legibles y no sólo títulos difusos | Fron-Dani | Artefactos útiles y entendibles |
| S1-10 | Congelar o esconder navegación que distrae del flujo principal | Fron-Dani | Menos ruido en dashboard |

## Orden correcto

El sprint no debe ejecutarse en paralelo sin criterio. El orden correcto es este:

| Orden | Bloque |
|---|---|
| 1 | Mensaje y promesa |
| 2 | Flujo principal sin roturas |
| 3 | Persistencia y trazabilidad |
| 4 | Medición de activación |
| 5 | Limpieza de ruido visual y navegación |

## Definición de “acción útil” del usuario

No vale cualquier clic.

Una acción útil cuenta sólo si ocurre una de estas tres:

| Acción útil | Por qué cuenta |
|---|---|
| Genera plan de 14 días | confirma intención y comprensión del valor |
| Entra al dashboard de cofundador y delega una tarea | activa la promesa principal |
| Interactúa con el chat para avanzar una tarea concreta | demuestra uso operacional |

## Riesgos de ejecución

| Riesgo | Mitigación |
|---|---|
| El equipo vuelve a meter features laterales | bloquear tareas fuera de sprint |
| Se corrigen pantallas sin medir el funnel | instrumentación obligatoria antes de cerrar |
| Se maquilla activación con demos | separar modo demo y modo real |
| El dashboard sigue mezclando dos productos | congelar navegación no esencial |

## Regla de cierre del sprint

Este sprint no se cierra por número de tareas hechas.

Se cierra sólo si se cumplen estas cuatro condiciones:

1. la promesa pública ya coincide con el flujo real,
2. el onboarding principal funciona de punta a punta,
3. la delegación deja rastro y entregable visible,
4. el funnel de activación queda medible.

## Lo que queda explícitamente fuera

Queda fuera de este sprint:

| Fuera de sprint | Motivo |
|---|---|
| Nuevos módulos de marketing, SEO o ads | no arreglan activación |
| Escalabilidad avanzada de colas | prematuro |
| Nuevos verticales | distraen del producto actual |
| Refactors cosméticos sin impacto en activación | ruido |
| Automatizaciones de growth no conectadas al onboarding | coste sin prueba |
