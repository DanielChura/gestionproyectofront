# AGENTS.md — Reglas y Arquitectura

## 1. Arquitectura y Separación de Capas

### Estructura y Flujo de Datos

- **Flujo estricto:** `Componente (UI) → Hook (Estado) → Service (API) → httpClient → Interface (Contrato)`.
- **`src/core/`**: Infraestructura global compartida (`api/httpClient.ts`, `interfaces/`, `services/`).
- **`src/features/<m>/`**: Módulos verticales de negocio (`pages/`, subcomponentes, `use<Feature>.ts`, `types.ts`).
- **`src/shared/`**: UI atómica transversal y utilidades comunes (`icons/`, badges, modales base).

### Responsabilidades por Capa

- **Interfaces (`src/core/interfaces/` o `features/<m>/types.ts`):** Definen modelos de entidad y payloads de mutación (`XWriteData`, `XFilters`). Importar siempre con `import type`.
- **`httpClient` (`src/core/api/httpClient.ts`):** Instancia única y centralizada de Axios configurada con `baseURL` e interceptores de autenticación (`Bearer token`).
- **Services (`src/core/services/` o `features/<m>/services.ts`):** Funciones `async` puras. Consumen `httpClient`, tipan la respuesta (`httpClient.get<T>`) y retornan directo `data`. Prohibido almacenar estado aquí.
- **Hooks (`features/<m>/use<Feature>.ts`):** Orquestan llamadas a servicios y ciclo de vida (`data`, `loading`, `error`, `refetch`). Centralizan mutaciones y filtros.
- **Componentes:** Solo presentación y eventos. Consumen hooks y aplican el Sistema de Diseño.

### Reglas de Integración y API

- **Aislamiento de red:** La UI nunca consume `httpClient` ni ejecuta peticiones HTTP directas dentro de un `useEffect`.
- **Tipado explícito:** Toda petición debe declarar su genérico de retorno en el cliente (`httpClient.get<T>`, `httpClient.post<T>`).
- **Separación de contratos:** Entidades compartidas entre múltiples features van en `core/interfaces/`; tipos exclusivos de un feature van en su propio `types.ts`.

---

## 2. Sistema de Diseño (UI / Tailwind)

### Arquetipo y Principios

- **Estilo:** SaaS moderno (tipo ClickUp). Alta densidad, utilitario, plano y neutro. Restar antes de añadir.
- **Sin transiciones:** Prohibido usar `transition-*`. Estados `:hover` y `:focus` son inmediatos.
- **Ahorro de tokens (DRY):** Heredar estilos desde contenedores (`<thead>`, `<table>`, etc.) en vez de repetirlos en cada hijo.
- **Sin estilos como constantes:** Prohibido definir objetos/constantes de estilos (`const styles = { ... }`, `const button = "..."`) para clases Tailwind. Usar tokens Tailwind directamente en `className`, simples y legibles, con variantes `dark:` cuando corresponda. Evitar className dinámicos complejos; preferir cadenas estáticas.

### Tokens Fundamentales

- **Fondos:** `bg-white` (base, tarjetas, inputs). Hover de filas: `hover:bg-neutral-100`.
- **Textos:** Primario `text-neutral-800` | Acciones `text-neutral-700` | Muted / Celdas `text-neutral-600`.
- **Bordes:** `border border-neutral-200` (estructural y tablas); conserva `border-neutral-200` en los separadores de las vistas densas ya integradas, sin rediseñarlas durante una integración.
- **Radios:** `rounded-lg` (controles, tags, inputs), `rounded-xl` (paneles, tarjetas, modales), `rounded-full` (botón cerrar).
- **Tipografía:** Inter únicamente 400, 500 y 600. **Prohibido `bold`**.
  - Escala: `text-[10px]` (tags), `text-xs` (UI base, tablas, inputs), `text-sm` (subtítulos, nav), `text-lg` (títulos).
- **Sombras:** No utilizar sombras en ninguno de los casos.
- **Iconos:** `size-4` en toda la app (`size-5` únicamente en navegación del sidebar).

### Convenciones de Construcción

- **Densidad por padding (Prohibido `h-*` o `min-h-*` en controles interactivos):**
  - Controles e inputs: `px-3 py-1.5 text-xs font-medium rounded-lg`
  - Filas y tablas: `px-3 py-2 text-xs`
  - Micro tags: `px-2 py-0.5 text-[10px] font-medium rounded bg-neutral-100`
  - Sidebar Nav (+1 escala): `px-3 py-2.5 text-sm font-medium rounded-lg gap-3`
- **Acciones (`cursor-pointer` obligatorio):**
  - Primaria: `bg-neutral-800 text-white hover:bg-neutral-700`
  - Secundaria: `bg-white border border-neutral-200 text-neutral-800 hover:bg-neutral-100`
  - Iconos de acción: `p-1.5 text-neutral-700 hover:bg-neutral-200 hover:text-neutral-800`
- **Inputs:** `bg-white border border-neutral-200 text-neutral-800 placeholder:text-neutral-600 px-3 py-1.5 text-xs rounded-lg focus:border-neutral-400 focus:outline-none`.
- **Tablas:** `<thead>` sin fondo con `border-b border-neutral-200 font-medium text-neutral-700`; filas nuevas con `border-b border-neutral-200 last:border-b-0 hover:bg-neutral-100`. Conserva los bordes `border-neutral-200` de las filas existentes en la vista Lista de tareas.

## 3. Rendimiento y carga de la interfaz

- Centraliza la obtención de datos en los hooks y servicios existentes. Evita solicitudes duplicadas entre componentes, consultas por cada fila y recargas completas después de cambios locales.
- Solicita únicamente los datos necesarios para la pantalla o interacción actual. Ejecuta en paralelo las peticiones independientes cuando sea apropiado y evita cadenas de solicitudes innecesarias.
- Mantén estables las dependencias de los efectos y evita bucles de peticiones o actualizaciones. Cancela o descarta respuestas obsoletas para impedir que sobrescriban datos actuales.
- Conserva el mecanismo centralizado de autenticación y renovación de tokens. Evita renovaciones simultáneas duplicadas, reintentos ilimitados y nuevos interceptores por componente.
- Evita repetir cálculos costosos, agrupaciones o recorridos de árboles durante cada renderizado. Usa memoización solo cuando aporte una mejora identificable; no añadas `useMemo`, `useCallback` o `memo` de forma indiscriminada.
- Respeta la paginación del backend y evita renderizar colecciones sin límites. Considera virtualización únicamente cuando el volumen y las mediciones lo justifiquen, conservando accesibilidad y navegación.
- Evalúa la carga diferida de rutas, vistas o dependencias pesadas que no sean necesarias al inicio. Revisa las advertencias de tamaño del build; no aumentes sus umbrales solo para ocultarlas.
- Muestra estados de carga por sección y conserva el contenido válido durante actualizaciones cuando corresponda. Evita bloquear toda la interfaz por una petición secundaria.
- Reutiliza el mecanismo existente de estado o caché. Si se conserva información entre consultas, define actualización, invalidación y limpieza al cambiar de usuario o cerrar sesión.
- Cuando el cambio afecte al rendimiento, comprueba las solicitudes de red, los renderizados y la carga de producción según corresponda. Compara antes y después e informa únicamente lo realmente medido.
