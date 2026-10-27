# Migraciones de Neon Postgres

El esquema vive en `db/migrations/`. Cada archivo SQL se aplica una sola vez y queda registrado en `_vigente_migrations`.

## Esquema inicial

`0001_vigente_state.sql` crea `public.vigente_state`, una tabla singleton con:

- `id = 'main'` como clave estable.
- `document jsonb` para el estado validado de la aplicación.
- `version bigint` para control optimista de concurrencia.
- `updated_at timestamptz` para trazabilidad operativa.

## Procedimiento

1. Use `DATABASE_URL_UNPOOLED` para evitar que una migración atraviese el pooler.
2. Ejecute `npm run db:migrate`.
3. En una instalación vacía, ejecute `npm run db:seed` una sola vez.
4. Compruebe el resultado con `npm run db:check`.

La carga inicial no sobrescribe el registro `main`. Las modificaciones posteriores deben entrar por el repositorio de la aplicación, que valida el documento, incrementa `version`, añade auditoría y confirma todo dentro de una transacción.
