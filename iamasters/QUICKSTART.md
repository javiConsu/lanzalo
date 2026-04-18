# IAmasters — Cómo probarlo en 10 minutos

Esta es la ruta más corta. Sin Docker ni Postgres local.

## 1. Prerequisitos

- **Node.js 18 o superior** — comprueba con `node -v`
- **OpenAI API key** — entra a https://platform.openai.com/api-keys y crea una. Necesita al menos $5 de crédito (un curso completo con voz cuesta ~$1).
- **Postgres gratis en Neon** — regístrate en https://neon.tech, crea un proyecto y copia la `connection string` que te da (algo como `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`).

## 2. Instalación

Desde la raíz del repo lanzalo (rama `claude/ai-academy-spanish-uxwUd`):

```bash
cd iamasters
cp .env.example .env
npm install
```

## 3. Configurar `.env`

Edita `iamasters/.env` y pon al menos estas dos líneas reales:

```bash
OPENAI_API_KEY=sk-proj-...              # tu key de OpenAI
DATABASE_URL=postgresql://...?sslmode=require   # tu connection string de Neon
```

El resto puede quedarse con los valores por defecto.

## 4. Crear tablas y datos iniciales

```bash
npm run db:setup        # crea 5 tablas en Neon
npm run seed            # inserta los 5 cursos base + 40 lecciones (sin coste)
```

Al final del seed debes ver:

```
✅ Seed completado
   Cursos:   5 creados, 0 ya existían
   Lecciones: 40 insertadas, 0 ya existían
```

## 5. Arranca backend y frontend

```bash
npm run dev
```

Verás dos servidores:

- Backend en `http://localhost:4100`
- Frontend en `http://localhost:5173`  ← **abre esta**

## 6. Qué probar

### A. Catálogo sin coste
Abre `http://localhost:5173`. Verás los 5 cursos agrupados por departamento. Entra en uno y verás sus 8 lecciones con objetivos.

Hasta aquí **no has gastado nada de OpenAI**.

### B. Generar contenido de UNA lección (~$0.04)
Haz clic en una lección cualquiera. Como no tiene contenido aún, te saldrá el botón **"Generar ahora"**. Púlsalo. En 10-20s verás:

- Intro
- 5-8 slides con heading, bullets y ejemplos
- Resumen
- Botón de audio en cada slide

El primer clic en el audio sintetiza la voz (otros 2-3s). Los siguientes clics en el mismo slide son instantáneos (cacheado).

### C. Probar el Tutor
En el panel lateral escribe una pregunta: *"¿Me das un ejemplo aplicado a una empresa SaaS?"*. Responde en 3-5s.

### D. Hacer el quiz
En el último slide, pulsa **"Hacer quiz →"**. Genera 5 preguntas. Responde una, pulsa "Comprobar" y verás score + feedback del Evaluador.

### E. El momento wow: subir un documento cliente
Ve a `http://localhost:5173/ingest`:

1. Sube un PDF cualquiera (un manual interno, un playbook, cualquier documento real de tu empresa)
2. Pulsa **"Generar curso"** en ese documento
3. Pon un tema, elige departamento, 5 lecciones (para ir más rápido)
4. En 20-30s tendrás un curso nuevo con outline anclado en ESE PDF
5. Abre el curso → genera contenido de la lección 1 → verás cómo los ejemplos salen de tu documento

## 7. Si algo falla

| Síntoma | Probable causa | Arreglo |
|---|---|---|
| `ECONNREFUSED` al cargar la web | Backend no arranca | Revisa consola de `npm run dev`. Normalmente es `DATABASE_URL` mal formado |
| Web vacía, sin errores | DB sin datos | Ejecuta `npm run seed` |
| Botón "Generar ahora" falla con 401 | OpenAI key inválida o sin crédito | Revisa https://platform.openai.com/usage |
| Audio no carga | Cuota TTS agotada | Mismo sitio de OpenAI |
| Error SSL en Neon | Falta `?sslmode=require` | Añádelo al final de `DATABASE_URL` |

## 8. Coste esperado probando

- Generar contenido de 1 lección: **~$0.04**
- Generar audio de 1 lección (5-6 fragmentos): **~$0.10**
- Curso entero (8 lecciones con contenido + audio): **~$1.10**
- Los 5 cursos base completos: **~$5.50**

Nada se regenera dos veces. Audio y respuestas del Profesor se cachean por hash del texto.

## 9. Para apagarlo

`Ctrl+C` en la terminal donde corre `npm run dev`.

Los datos quedan en Neon. Para borrar todo:

```bash
psql $DATABASE_URL -c "DROP TABLE chat_sessions, quiz_attempts, enrollments, lessons, courses, ingested_documents CASCADE;"
```

---

Cualquier paso que falle, pégame el error exacto y lo resolvemos.
