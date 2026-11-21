# AGENTS.md — Reglas del proyecto

## 1. Arquitectura

- Flujo: `Componente → Hook → Service → httpClient → Interface`.
- `core/`: `httpClient`, `interfaces/` y `services/` compartidos. `features/<m>/`: `pages/`, componentes, `use<Feature>.ts`, `services.ts`, `types.ts`. `shared/`: UI atómica (`icons/`, `Input`, `Form`, `Button`, `Modal`, `Toast`).
- La UI solo consume hooks; nunca `httpClient` ni services. Hooks: estado, mutaciones y filtros. Services: `async` puros, tipados, sin estado. Interfaces compartidas en `core/`, propias en `features/<m>/types.ts`; siempre `import type`.
- Toda petición declara su genérico: `httpClient.get<T>` / `post<T>`.
- Sin movimientos/arrastre manual de tareas: si algún día se necesita, usar la librería dedicada (`@dnd-kit` ya está instalada); no recrear hooks de drag propios.
- Layout: `Sidebar` = barra de módulos, `SectionNav` = opciones de la sección, `SectionHeader` = cabecera del contenido (título + acción opcional + switch opcional). No llamar “menu” a la navegación.

## 2. Diseño (ClickUp, light/dark)

- Solo Tailwind. CSS únicamente en `src/index.css` para tokens/base; prohibido CSS por componente, `transition-*`, sombras y `bold`. Inter 400/500/600. Inline style solo para valores dinámicos (color de tema e indentación); nada más.
- Tokens: paleta Tailwind estándar. Cualquier token semántico nuevo se define una sola vez en `src/index.css` (`@theme`) y se usa desde ahí; no se enumeran en este documento ni se inventan valores.
- Escala: `text-xs` mínimo (incluye tags), `text-xs` UI/tablas/inputs, `text-sm` subtítulos/nav, `text-lg` títulos. Radios: `rounded-md` controles, `rounded-xl` paneles/modales, `rounded-full` cerrar. Iconos `size-4` (`size-5` solo sidebar).
- Contraste: alto solo en títulos y nombre principal (`text-neutral-800 dark:text-neutral-100`). Metadatos, iconos y texto secundario en tonos neutros moderados (`text-neutral-500`/`600` y equivalentes oscuros), sin blancos/negros puros ni acentos fuertes.
- Texto: prohibido `text-white` y `text-black`. Sobre fondo oscuro usar `text-neutral-100` como mínimo; para texto oscuro usar `text-neutral-900` (nunca `text-dark`). Si el contenedor ya define el color, heredar en vez de repetirlo.
- Fondo: `bg-white` solo en casos puntuales (paneles/modales sobre superficie gris). Prohibido `bg-dark`; usar la variante `dark:bg-*` equivalente de la paleta neutral. Respeta siempre el sistema de diseño.
- Tablas: encabezados (`thead th`) siempre `font-weight: 400`, definido en la base de `src/index.css`; no añadir `font-medium` a `<th>`.
- Botones de icono: contenedor con radio y padding (`p-1.5`); el hover colorea el contenedor (`hover:bg-*`), nunca solo el icono.
- Densidad (sin `h-*`/`min-h-*` en controles): controles `px-3 py-1.5 text-sm font-medium rounded-md` (Input/Select `style="small"`: `text-xs` y padding apretado); filas `px-3 py-2 text-xs`; tags `px-2 py-0.5 text-xs font-medium rounded`; nav `px-3 py-2.5 text-sm font-medium rounded-md gap-4`.
- Reutilizar `shared/` (`Button`, `Input`, `Form`, `Modal`, `Toast`, `icons`) antes de escribir controles o estilos. `button` y `[role="button"]` ya tienen `cursor-pointer` por la base de `src/index.css`; no repetir la clase.
- Un único `Button`: `variant="primary"` (por defecto) o `"secondary"`, y `size="base"` (por defecto) o `"sm"`. `size` solo cambia padding/layout; los colores dependen solo del `variant`. En headers de sección usar `size="sm"`.
- className cortas y estáticas; heredar del contenedor; sin constantes de estilos ni interpolación compleja. Dark mode con variantes `dark:` equivalentes; sin hojas CSS alternativas.
- Atributos HTML solo funcionales (`disabled`, `onClick`, `className`, `aria-*`); `aria-label` solo en controles sin texto visible (botón de icono o enlace con imagen); no `title` salvo petición explícita.
- Prohibido `uppercase` (ni CSS ni texto forzado): el contenido se muestra siempre con su capitalización original.

## 3. React

- Componentes funcionales, una responsabilidad, <80 líneas. JSX solo renderiza; lógica y handlers en `use<Feature>` o helpers puros.
- Composición (`children`/slots) sobre props drilling. Máx. 5 props; más → objeto tipado o context. Sin "god props" ni atributos HTML innecesarios (solo accesibilidad/función).
- Keys `id` (no index salvo lista estática). No crear objetos/funciones inline en props memoizadas. `memo`/`useMemo`/`useCallback` solo justificados: listas, cálculos costosos o hijos memoizados.
- Context solo para auth, tema o toast. No abstraer hasta el tercer uso (salvo shared claro).

## 4. Hooks

- Un `use<Feature>` orquesta estado, servicios y mutaciones; ningún componente llama services.
- `useState`: inicializador perezoso y forma funcional si depende del previo. `useEffect`: dependencias exactas y cleanup; no para cálculos síncronos. Sin hooks condicionales. No duplicar estado derivado. Custom hook si se usa ≥2 veces.

## 5. Datos y errores

- **Estados de carga con skeleton, nunca texto ni spinner.** Usar `Skeleton` + `SkeletonTheme` de `react-loading-skeleton` con `baseColor="var(--skeleton-base)"` y `highlightColor="var(--skeleton-highlight)"` (definidos en `src/index.css`) y `enableAnimation={false}` (sin shimmer). El skeleton reproduce solo la forma del contenido que carga (una fila y sus registros, no la página completa); no escribir «Cargando…». Marcar el contenedor con `aria-busy`.
- Errores de red/mutación → Toast desde el hook, mensaje claro sin detalles técnicos. Nunca textos de error en la UI ni `alert`/`console.log` en producción. Validar inputs en la frontera.

## 6. Rutas y rendimiento

- `React.lazy` + `Suspense` por ruta/feature, fallback mínimo. No cargar features en el bundle inicial.
- Sin requests duplicados ni por fila; paralelizar independientes; respetar paginación; cancelar respuestas obsoletas; memoizar solo cálculos costosos.

## 7. Estructura

- Nombres de carpetas, archivos, componentes, hooks, funciones, tipos y variables en inglés (incluidas las carpetas de `features/<module>/`). Solo los textos visibles al usuario (labels de `routes.ts`, títulos, mensajes, placeholders) se mantienen en español.
- Un componente por archivo (PascalCase); hooks/utils camelCase. Mantener `pages/`, `use<Feature>.ts`, `types.ts`, `services.ts`. Barrel solo si aporta; evitar ciclos.
