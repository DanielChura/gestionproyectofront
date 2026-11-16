# AGENTS.md

## Objetivo

Verificar si los requerimientos de abajo ya están implementados y, solo si se pide, implementar los pendientes. Respuestas directas, técnicas, sin relleno y con el mínimo de tokens.

## Estado

Marca solo la columna `Estado` de lo revisado, sin tocar el resto de la tabla:

- ✅ completo y verificado en el código
- 🟡 parcial (indica en `Notas` qué falta)
- ⬜ pendiente

## Estructura

- **Frontend:** por dominio (`home`, `equipo`, `organizacion`).
- **Backend:** atómico; los módulos pueden no tener carpeta propia (viven en controllers, services, repositories, dtos, entities).
- Antes de crear archivos, consulta Engram y haz una búsqueda dirigida del concepto. No asumas ubicaciones ni crees carpetas si ya existe un lugar.

## Eficiencia

- Usa solo los comandos necesarios; evita listados y búsquedas repetidas.
- Cambios mínimos, dentro del alcance del requerimiento.

## Excepciones

Todo error se maneja explícitamente con un mensaje completo y comprensible que diga: qué ocurrió, por qué y qué puede hacer el usuario. Prohibidos "Error" o "Algo salió mal". Cada regla `RN-xx` debe tener su mensaje.

- Backend: detalle técnico a logs; al cliente, solo el mensaje claro.
- Frontend: muestra el mensaje sin trazas ni códigos internos.

Ejemplo: "No se pudo guardar el equipo porque necesita al menos 2 integrantes activos. Agrega un integrante más e intenta de nuevo."

## Al terminar

Reporta: archivos modificados, IDs que cambiaron de estado y pendientes con su motivo.

---

## Tabla 1: Matriz de permisos por rol

| Estado | ID     | Módulo / Acción                    | Administrador                                 | Coordinador (Proyecto)                      | Trabajador Estándar                         | Notas                                                                                             |
| ------ | ------ | ---------------------------------- | --------------------------------------------- | ------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| ✅     | PER-01 | Catálogos (Áreas y Especialidades) | Crea y edita/renombra, sin eliminar           | Solo lectura                                | Solo lectura                                |                                                                                                   |
| 🟡     | PER-02 | Equipos de Trabajo                 | Crea, edita, asigna miembros y define alcance | Solo lectura                                | Solo lectura                                | Falta alcance multidisciplinario: `Team.area` es FK obligatoria y las tablas son `managed=False`. |
| ✅     | PER-03 | Cuentas e Invitaciones             | Invita por Gmail, audita y desbloquea cuentas | Sin acceso                                  | Sin acceso                                  |                                                                                                   |
| ✅     | PER-04 | Directorio de Personal             | Ve listado completo, edita fichas e inactiva  | Sin acceso                                  | Sin acceso                                  |                                                                                                   |
| ✅     | PER-05 | Publicaciones (Convocatorias)      | Crea, edita, publica y cierra convocatorias   | Solo lectura y postulación                  | Solo lectura y postulación                  |                                                                                                   |
| ✅     | PER-06 | Sidebar (Visualización)            | Ve todos los proyectos agrupados por área     | Solo proyectos asignados en lista plana     | Solo proyectos asignados en lista plana     |                                                                                                   |
| ✅     | PER-07 | Creación y asignación de tareas    | Crea y asigna a cualquiera del proyecto       | Crea y asigna a cualquiera del proyecto     | Crea con auto-asignación obligatoria        |                                                                                                   |
| ✅     | PER-08 | Movimiento en tablero Kanban       | Mueve cualquier tarea entre fases             | Mueve cualquier tarea de su proyecto        | Solo mueve tareas asignadas a su usuario    |                                                                                                   |
| ✅     | PER-09 | Vistas (Tablero, Gantt, Overview)  | Acceso total a todos los proyectos            | Acceso total en sus proyectos asignados     | Acceso total en sus proyectos asignados     |                                                                                                   |
| ✅     | PER-10 | Configuración personal             | Perfil, clave, Gmail, tema y especialidades   | Perfil, clave, Gmail, tema y especialidades | Perfil, clave, Gmail, tema y especialidades |                                                                                                   |

---

## Tabla 2: Requerimientos funcionales del sistema

| Estado | ID        | Requerimiento                  | Regla y funcionamiento esencial                                                                                                                     | Notas                                                                                                               |
| ------ | --------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| ✅     | RF-AUT-01 | Invitación exclusiva por Gmail | Alta manual cerrada. El correo debe terminar en @gmail.com y se asigna una área corporativa.                                                        |                                                                                                                     |
| ✅     | RF-AUT-02 | Activación y token temporal    | Envío de enlace de acceso con validez de 24 horas para fijar contraseña y pasar a estado activo.                                                    |                                                                                                                     |
| ✅     | RF-AUT-03 | Límites y auditoría de acceso  | Máximo 5 reenvíos diarios de invitación o recuperación. Bloqueo al 5.º intento fallido de login en 24 horas.                                        |                                                                                                                     |
| ✅     | RF-ORG-01 | Hub central de control         | Consola de admin con atajos de creación y tabla de proyectos en solo lectura con enlace de redirección.                                             |                                                                                                                     |
| ✅     | RF-ORG-02 | Catálogo de áreas              | Creación y renombrado de áreas corporativas. Se prohíbe su eliminación.                                                                             |                                                                                                                     |
| ✅     | RF-ORG-03 | Catálogo de especialidades     | Creación y renombrado de habilidades técnicas. Se prohíbe su eliminación.                                                                           |                                                                                                                     |
| ✅     | RF-TRB-01 | Directorio de personal         | Directorio centralizado para admin con filtros por área y estado. Permite editar horas semanales, área y correo @gmail.com.                         |                                                                                                                     |
| ✅     | RF-TRB-02 | Inactivación de personal       | Desactivar un usuario revoca su acceso de inmediato, pero conserva sus tareas asignadas para reasignación manual.                                   |                                                                                                                     |
| ✅     | RF-EQP-01 | Estructuración de equipos      | Células de trabajo con mínimo obligatorio de 2 integrantes activos. Un trabajador puede pertenecer a varios equipos.                                |                                                                                                                     |
| 🟡     | RF-EQP-02 | Alcance de área y remoción     | Alcance de área específica o multidisciplinario. Remover a un miembro no lo retira de proyectos donde ya estaba asignado.                           | Remoción conserva proyectos. Falta alcance multidisciplinario por `Team.area` obligatoria y tablas `managed=False`. |
| ✅     | RF-PUB-01 | Convocatorias de proyectos     | Publicación vinculada a un proyecto con cupos, fecha de cierre y requisitos. Se cierra automáticamente al llegar a 0 vacantes o al vencer la fecha. |                                                                                                                     |
| ✅     | RF-PUB-02 | Postulación instantánea        | El trabajador se postula con 1 clic como miembro estándar. Se bloquea si ya pertenece al proyecto y entra directo al sidebar.                       |                                                                                                                     |
| ✅     | RF-PRJ-01 | Visualización en sidebar       | El admin ve todos los proyectos ordenados por área. Los trabajadores solo ven sus proyectos asignados en lista plana.                               |                                                                                                                     |
| ✅     | RF-PRJ-02 | Creación y campos de tarea     | El nombre es el único campo obligatorio. Fecha de inicio, fecha límite, prioridad, asignación y descripción son opcionales. |                                                                                                                     |
| ✅     | RF-PRJ-03 | Asignación según rol           | Admin y coordinador eligen a cualquier integrante del proyecto. El trabajador estándar solo puede auto-asignarse.                                   |                                                                                                                     |
| ✅     | RF-PRJ-04 | Vistas estilo ClickUp          | Tablero kanban con arrastre restringido por rol, cronograma Gantt automático por fechas y dashboard Overview con KPIs.                              |                                                                                                                     |
| ✅     | RF-CFG-01 | Configuración de perfil        | Edición de datos personales, cambio de contraseña, apariencia visual, correo @gmail.com y marcado de especialidades del catálogo.                   |                                                                                                                     |

---

## Tabla 3: Historias de usuario consolidadas

| Estado | ID    | Rol                 | Quiero                                | Para                                    | Criterio de aceptación clave                                                 | Notas |
| ------ | ----- | ------------------- | ------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- | ----- |
| ✅     | HU-01 | Admin               | Invitar colaborador por Gmail y área  | Dar acceso controlado a la plataforma   | Requiere terminación @gmail.com, área obligatoria y token de 24 horas.       |       |
| ✅     | HU-02 | Admin               | Crear equipos con alcance de área     | Estructurar células de trabajo          | Exige mínimo 2 colaboradores activos y valida pertenencia de área.           |       |
| ✅     | HU-03 | Admin               | Publicar convocatoria de proyecto     | Abrir postulaciones a proyectos activos | Requiere proyecto real, número de vacantes y fecha límite de postulación.    |       |
| ✅     | HU-04 | Trabajador          | Postularme a una convocatoria activa  | Unirme a trabajar en un proyecto        | Asigna rol de miembro estándar, descuenta vacante y aparece en sidebar.      |       |
| ✅     | HU-05 | Trabajador          | Ver solo mis proyectos en lista plana | Concentrarme en mis asignaciones        | Solo muestra proyectos donde es miembro o coordinador, sin carpetas de área. |       |
| ✅     | HU-06 | Admin               | Ver todos los proyectos por área      | Monitorear el portafolio corporativo    | Muestra el 100% de proyectos organizados jerárquicamente por área.           |       |
| ✅     | HU-07 | Coordinador / Admin | Crear y asignar tareas a terceros     | Distribuir el trabajo del proyecto      | Permite elegir cualquier miembro del proyecto y exige fechas y prioridad.    |       |
| ✅     | HU-08 | Trabajador          | Crear mis propias tareas              | Registrar mis actividades técnicas      | Auto-asigna al creador y exige fechas de inicio y fin y prioridad.           |       |
| ✅     | HU-09 | Trabajador          | Mover mis tareas en el tablero        | Reportar mis avances en el flujo        | Solo permite arrastrar y cambiar de fase tareas asignadas a su usuario.      |       |
| ✅     | HU-10 | Todos               | Configurar perfil y especialidades    | Mantener datos y entorno al día         | Valida nuevo correo @gmail.com y especialidades del catálogo del admin.      |       |

---

## Tabla 4: Reglas de negocio y excepciones operativas

| Estado | ID    | Regla                  | Condición operativa y manejo de excepciones                                                                                          | Notas |
| ------ | ----- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| ✅     | RN-01 | Dominio Gmail          | Todo correo ingresado por invitación, registro o cambio de perfil debe pertenecer a @gmail.com.                                      |       |
| ✅     | RN-02 | Bloqueo de borrado     | Áreas y especialidades no se pueden eliminar bajo ningún caso. Solo se permite crear y renombrar.                                    |       |
| ✅     | RN-03 | Límite de reenvíos     | Máximo 5 envíos diarios por cuenta de enlaces de activación o solicitudes de recuperación de contraseña.                             |       |
| ✅     | RN-04 | Bloqueo por intentos   | La cuenta se bloquea por 24 horas o hasta intervención del admin tras 5 intentos fallidos consecutivos de login.                     |       |
| ✅     | RN-05 | Vigencia de tokens     | Todo enlace de invitación o restablecimiento caduca automáticamente a las 24 horas de su emisión.                                    |       |
| ✅     | RN-06 | Mínimo en equipos      | Un equipo debe tener al menos 2 integrantes activos. El sistema bloquea guardados con 0 o 1 miembro.                                 |       |
| ✅     | RN-07 | Salida de equipos      | Desvincular a un trabajador de un equipo no lo elimina de proyectos activos. Solo bloquea su entrada a futuros proyectos del equipo. |       |
| ✅     | RN-08 | Tareas de inactivos    | Al inactivar a un trabajador se bloquea su cuenta, pero se mantienen sus tareas para reasignación manual por el admin.               |       |
| ✅     | RN-09 | Auto-cierre de ofertas | La convocatoria pasa a cerrada y se oculta a los trabajadores si las vacantes llegan a 0 o se vence la fecha.                        |       |
| ✅     | RN-10 | Postulación única      | El sistema bloquea el botón de postulación si el trabajador ya es integrante activo del proyecto.                                    |       |
| ✅     | RN-11 | Auto-asignación        | Las tareas creadas por un trabajador estándar no tienen selector de responsable y se asignan a su propio usuario.                    |       |
| ✅     | RN-12 | Control de fases       | En el kanban, el trabajador estándar solo mueve sus propias tareas. Coordinador y admin mueven cualquier tarea.                      |       |
| ✅     | RN-13 | Integridad de Gantt    | Al crear una tarea, solo el nombre es obligatorio. Fechas, prioridad y asignación son opcionales con defaults para permitir creación ágil. |       |
| ✅     | RN-14 | Catálogo cerrado       | El trabajador no puede escribir especialidades libres en su perfil. Solo puede marcar las creadas por el administrador.              |       |

---

## Tabla 5: Reglas de negocio faltantes (por definir/implementar)

| Estado | ID    | Regla propuesta             | Definición necesaria                                                                                                    | Origen                                                                                             |
| ------ | ----- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| ✅     | RN-15 | Rol Coordinador operativo   | Definir cómo se asigna `RESPONSABLE`/`REVISOR` a un miembro del proyecto y qué UI/API lo expone. Hoy solo existe en DB. | PER-07, PER-08, RF-PRJ-03, HU-07                                                                   |
| ✅     | RN-16 | Obligatoriedad de tarea     | Confirmado: solo el título/nombre es obligatorio. Fechas, prioridad y responsable son opcionales en frontend y backend. | RF-PRJ-02, RN-13, HU-08                                                                            |
| ⬜     | RN-17 | Alcance de equipo           | Definir el campo de alcance (área única vs multidisciplinario) y cómo se valida al asignar proyectos.                   | RF-EQP-02, HU-02, PER-02                                                                           |
| ✅     | RN-18 | Cierre automático de oferta | Definir disparador (job/cron o cálculo al leer) que cambie a CERRADA al vencer o llenarse, con mensaje al admin.        | RN-09                                                                                              |
| ✅     | RN-19 | Cupos concurrentes          | Definir bloqueo de vacantes para que dos postulaciones simultáneas no sobrepasen el cupo.                               | RF-PUB-02, RN-10                                                                                   |
| ✅     | RN-20 | Desbloqueo de cuenta        | Definir endpoint/acción admin que limpie `AuthThrottle` y registre quién desbloqueó y cuándo.                           | Endpoint `admin/accounts/<id>/unlock/`, botón "Desbloquear" y evento de auditoría.                 |
| ✅     | RN-21 | Reenvíos diarios            | Definir ventana (día calendario America/Lima o 24 h móviles), contador y mensaje al llegar a 5.                         | Ventana día calendario America/Lima, contador por cuenta/scope y mensaje al llegar a 5.            |
| ✅     | RN-22 | Correo corporativo          | Definir si @gmail.com aplica a invitación, edición de perfil y edición de ficha; centralizar la validación en backend.  | Aplica a invitación, perfil, ficha y activación; `apps/workers/validators.py` centraliza la regla. |
