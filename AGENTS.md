# AGENTS.md — Reglas del proyecto

## 1. Arquitectura

- Flujo: `Componente → Hook → Service → httpClient → Interface`.
- `core/`: `httpClient`, `interfaces/` y `services/` compartidos. `features/<m>/`: `pages/`, componentes, `use<Feature>.ts`, `services.ts`, `types.ts`. `shared/`: UI atómica (`icons/`, `Input`, `Form`, `Button`, `Modal`, `Toast`).
- La UI solo consume hooks; nunca `httpClient` ni services. Hooks: estado, mutaciones y filtros. Services: `async` puros, tipados, sin estado. Interfaces compartidas en `core/`, propias en `features/<m>/types.ts`; siempre `import type`.
- Toda petición declara su genérico: `httpClient.get<T>` / `post<T>`.

## 2. Diseño (ClickUp, light/dark)

- Solo Tailwind. CSS únicamente en `src/index.css` para tokens/base; prohibido CSS por componente, inline styles, `transition-*`, sombras y `bold`. Inter 400/500/600.
- Tokens: paleta Tailwind estándar. Cualquier token semántico nuevo se define una sola vez en `src/index.css` (`@theme`) y se usa desde ahí; no se enumeran en este documento ni se inventan valores.
- Escala: `text-[10px]` tags, `text-xs` UI/tablas/inputs, `text-sm` subtítulos/nav, `text-lg` títulos. Radios: `rounded-lg` controles, `rounded-xl` paneles/modales, `rounded-full` cerrar. Iconos `size-4` (`size-5` solo sidebar).
- Densidad (sin `h-*`/`min-h-*` en controles): controles `px-3 py-1.5 text-xs font-medium rounded-lg`; filas `px-3 py-2 text-xs`; tags `px-2 py-0.5 text-[10px] font-medium rounded`; nav `px-3 py-2.5 text-sm font-medium rounded-lg gap-3`.
- Reutilizar `shared/` (`Button`, `Input`, `Form`, `Modal`, `Toast`, `icons`) antes de escribir controles o estilos. `cursor-pointer` obligatorio en acciones.
- className cortas y estáticas; heredar del contenedor; sin constantes de estilos ni interpolación compleja. Dark mode con variantes `dark:` equivalentes; sin hojas CSS alternativas.

## 3. React

- Componentes funcionales, una responsabilidad, <80 líneas. JSX solo renderiza; lógica y handlers en `use<Feature>` o helpers puros.
- Composición (`children`/slots) sobre props drilling. Máx. 5 props; más → objeto tipado o context. Sin "god props" ni atributos HTML innecesarios (solo accesibilidad/función).
- Keys `id` (no index salvo lista estática). No crear objetos/funciones inline en props memoizadas. `memo`/`useMemo`/`useCallback` solo justificados: listas, cálculos costosos o hijos memoizados.
- Context solo para auth, tema o toast. No abstraer hasta el tercer uso (salvo shared claro).

## 4. Hooks

- Un `use<Feature>` orquesta estado, servicios y mutaciones; ningún componente llama services.
- `useState`: inicializador perezoso y forma funcional si depende del previo. `useEffect`: dependencias exactas y cleanup; no para cálculos síncronos. Sin hooks condicionales. No duplicar estado derivado. Custom hook si se usa ≥2 veces.

## 5. Datos y errores

- **Sin loading/spinners por ahora.** La UI asume datos o vacío.
- Errores de red/mutación → Toast desde el hook, mensaje claro sin detalles técnicos. Sin `alert` ni `console.log` en producción. Validar inputs en la frontera.

## 6. Rutas y rendimiento

- `React.lazy` + `Suspense` por ruta/feature, fallback mínimo. No cargar features en el bundle inicial.
- Sin requests duplicados ni por fila; paralelizar independientes; respetar paginación; cancelar respuestas obsoletas; memoizar solo cálculos costosos.

## 7. Estructura

- Un componente por archivo (PascalCase); hooks/utils camelCase. Mantener `pages/`, `use<Feature>.ts`, `types.ts`, `services.ts`. Barrel solo si aporta; evitar ciclos.
