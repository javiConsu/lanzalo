# ACTIVATION SCOREBOARD — Lanzalo

**Última actualización:** 2026-04-08
**Objetivo:** medir si el producto activa de verdad o sólo genera curiosidad.

## 1. Regla principal

Lanzalo no se gobierna por número de features cerradas.

Se gobierna por la capacidad de llevar a un usuario desde la idea hasta una primera acción útil dentro del flujo de cofundador IA.

> **Métrica norte:** porcentaje de usuarios registrados que completan el flujo hasta entrar en el dashboard de cofundador con plan generado y realizan una primera acción útil.

## 2. Funnel oficial del MVP

| Etapa | Definición operativa | Evento o señal |
|---|---|---|
| E1 Registro | Usuario crea cuenta o inicia sesión por primera vez | `user_registered` o evento equivalente de auth |
| E2 Onboarding iniciado | Usuario entra en el flujo principal de onboarding | `onboarding_started` |
| E3 Idea capturada | Usuario describe idea o elige idea validada | `idea_captured` |
| E4 Perfil founder completado | Usuario completa contexto mínimo para personalización | `founder_profile_completed` |
| E5 Viabilidad completada | Usuario recibe resultado del análisis | `viability_analyzed` |
| E6 Plan generado | Usuario obtiene plan de 14 días | `plan_generated` |
| E7 Entrada en cofundador | Usuario entra en dashboard de cofundador | `cofounder_opened` |
| E8 Primera acción útil | Usuario delega una tarea o interactúa con el chat para avanzar una tarea real | `first_useful_action` |
| E9 Conversión a pago | Usuario pasa de trial a pago | `trial_converted` |

## 3. Objetivos iniciales

Mientras no haya baseline sólido, estos objetivos sirven como criterio de priorización.

| Métrica | Objetivo inicial | Estado actual |
|---|---|---|
| Registro -> onboarding iniciado | > 60% | No medido de forma fiable |
| Onboarding iniciado -> idea capturada | > 75% | No medido de forma fiable |
| Idea capturada -> viabilidad completada | > 45% | No medido de forma fiable |
| Viabilidad completada -> plan generado | > 35% | No medido de forma fiable |
| Plan generado -> entrada en cofundador | > 30% | No medido de forma fiable |
| Entrada en cofundador -> primera acción útil | > 20% | No medido de forma fiable |
| Trial -> pago | Señal, no escala todavía | No medido de forma fiable |

## 4. Definición exacta de “primera acción útil”

No cuenta cualquier clic. Sólo cuenta si el usuario cruza una de estas tres líneas.

| Acción | Cuenta como útil | Motivo |
|---|---|---|
| Delega una tarea del plan al agente | Sí | Activa la promesa principal del producto |
| Envía un mensaje en el chat que produce un resultado accionable | Sí | Demuestra uso operativo del cofundador |
| Completa manualmente una tarea del día con rastro verificable | Sí | Muestra avance real dentro del plan |
| Sólo navega por tabs o paneles | No | Curiosidad, no activación |
| Sólo entra y sale del dashboard | No | No demuestra valor |

## 5. Eventos obligatorios

Estos eventos deben existir y quedar instrumentados.

| Evento | Estado esperado | Propietario |
|---|---|---|
| `onboarding_started` | Implementado o validado | Backend / Frontend |
| `idea_captured` | Implementado o validado | Backend / Frontend |
| `founder_profile_completed` | Implementado o validado | Backend / Frontend |
| `viability_analyzed` | Ya aparece en código | Validar |
| `plan_generated` | Ya aparece en código | Validar |
| `cofounder_opened` | Crear o validar | Frontend |
| `task_delegated` | Crear o validar | Backend / Frontend |
| `first_useful_action` | Crear | Backend / Frontend |
| `trial_converted` | Crear o validar | Backend / Pagos |

## 6. Métricas de salud del producto

Además del funnel, revisar estas métricas de salud.

| Métrica | Pregunta que responde |
|---|---|
| Tiempo medio registro -> plan generado | ¿El flujo tarda demasiado en dar valor? |
| Tiempo medio plan generado -> primera acción útil | ¿El usuario entiende qué hacer después del plan? |
| % usuarios con error en viabilidad | ¿El análisis bloquea activación? |
| % usuarios con error en generación del plan | ¿El núcleo del producto falla? |
| % tareas delegadas con entregable visible | ¿La promesa de coejecución se cumple? |
| % usuarios que vuelven en 24h / 72h | ¿Hay continuidad real? |

## 7. Reglas de interpretación

| Situación | Lectura correcta | Decisión |
|---|---|---|
| Mucho registro y poco plan generado | Problema de onboarding o viabilidad | Prioridad P0 |
| Mucho plan generado y poca entrada en cofundador | El CTA o la promesa post-plan no se entienden | Prioridad P0 |
| Mucha entrada en cofundador y poca acción útil | El dashboard no guía lo suficiente | Prioridad P0 |
| Mucha acción útil y poca conversión | El valor existe pero la monetización no convence | Prioridad P1 |
| Bajo volumen en todo el funnel | Problema de adquisición o mensaje | Revisar landing y fuente de tráfico |

## 8. Formato de revisión diaria

Cada revisión diaria debe rellenar esta tabla.

| Fecha | Registros | Onboarding iniciado | Viabilidad completada | Plan generado | Cofundador abierto | Primera acción útil | Trial convertidos | Incidencias críticas |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| YYYY-MM-DD | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Ninguna |

## 9. Criterio de decisión semanal

Cada semana sólo se deben tomar decisiones que muevan una de estas tres variables.

| Variable | Qué significa |
|---|---|
| Claridad | el usuario entiende qué compra |
| Activación | el usuario llega al loop principal |
| Utilidad | el usuario ejecuta una acción real con ayuda del producto |

Si una propuesta no mejora una de esas tres, no entra en la semana.

## 10. Estado actual del tablero

A día de hoy, el producto tiene señales de instrumentación parcial, pero no una lectura fiable del funnel completo.

Conclusión operativa:

> **Antes de seguir añadiendo funciones, hay que cerrar la medición de E1 a E8 y convertir este tablero en el criterio oficial de priorización.**
