# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js con TypeScript, API del servidor Node.js y persistencia local en archivos JSON. Esta elección fue indicada por el usuario; el proyecto debe ejecutarse localmente y no se publicará como sitio alojado.

## Users

- Administrador de la empresa simulada Vigente, responsable de configuración, usuarios y respaldo.
- Responsable de nómina, que registra novedades, calcula, revisa, aprueba, paga y cierra períodos.
- Usuario de consulta, que revisa trabajadores, roles y reportes sin modificar datos.

## Product Purpose

Gestionar de forma trazable la remuneración de una empresa privada ecuatoriana de desarrollo de software. El producto debe separar entradas, reglas, cálculos, obligaciones patronales, provisiones, pagos y evidencia normativa; el éxito significa que un período pueda reproducirse y auditarse sin confundir una simulación con cumplimiento legal certificado.

## Positioning

El cálculo conserva una instantánea de parámetros y entradas por versión de nómina, y presenta cada resultado con base, fórmula, tasa, incidencia y fuente. La persistencia es un único archivo JSON versionado, validado y protegido mediante escrituras atómicas y respaldos.

## Operating Context

Uso interno en español, principalmente en escritorio, con revisiones ocasionales desde móvil. La demostración corresponde a octubre de 2026, zona horaria America/Guayaquil y moneda USD. El flujo central es: seleccionar período, revisar novedades, calcular, revisar detalle, aprobar, registrar pago y cerrar.

## Capabilities and Constraints

- Datos persistentes en `data/vigente.json`; sin base de datos, servicios externos ni localStorage como fuente de verdad.
- Seis trabajadores ficticios, cargos editables, organigrama, escala salarial, novedades, nómina, beneficios, reportes, parámetros y respaldo/importación JSON.
- Validación integral, control de versión, serialización de escrituras, respaldo previo, restauración y manejo explícito de corrupción.
- Aritmética monetaria decimal con redondeo HALF_UP a dos decimales.
- Estados y fuentes distinguen `Verificado`, `Referencia académica`, `Simulado` y `Pendiente`.
- Los períodos aprobados o cerrados quedan protegidos; aprobar y pagar son operaciones separadas.
- Los identificadores personales y empresariales son de demostración; no se inventan cédulas, RUC ni cuentas reales.
- La aplicación informa límites de la evidencia y no declara cumplimiento legal automático.

## Brand Commitments

Nombre: «Vigente | Remuneraciones». Voz profesional, clara y prudente. La interfaz debe hacer visible qué está vigente, qué es una simulación y qué requiere verificación.

## Evidence on Hand

- Brief funcional aportado por el usuario: `C:/Users/adri0/.codex/attachments/887369e8-3a17-4c4f-887d-f7fa31be7919/Pasted text.txt`.
- Referencias oficiales consultadas del Ministerio del Trabajo, IESS y SRI, registradas dentro del JSON inicial con fecha de consulta 2026-10-27.
- No se recibieron los cuatro PDF académicos mencionados; las referencias de sus páginas 7 y 8 se incorporan únicamente según la transcripción explícita del brief y se etiquetan como académicas pendientes de contraste.

## Product Principles

1. Toda cifra debe poder explicarse y reproducirse.
2. Lo pendiente se muestra como pendiente; nunca se rellena con certeza inventada.
3. La operación diaria debe ser rápida, pero los cambios sensibles dejan auditoría.
4. La vista de costo devengado y la de desembolsos nunca se mezclan.
5. Los datos históricos se conservan mediante inactivación, versiones y respaldos.

## Accessibility & Inclusion

Interfaz adaptable, navegación por teclado, foco visible, contraste AA, etiquetas explícitas, tablas con encabezados semánticos y estados que no dependan solo del color.
