# Vigente | Remuneraciones

Aplicación demostrativa de nómina privada ecuatoriana construida con Next.js, TypeScript y Neon Postgres. No guarda datos operativos en archivos: Vercel Functions lee y escribe el registro principal en `public.vigente_state`.

## Configuración local

1. Instale dependencias y prepare las variables:

```powershell
npm install
Copy-Item .env.example .env.local
```

2. En `.env.local`, configure:

- `DATABASE_URL`: conexión agrupada de Neon (`-pooler`), usada por la aplicación.
- `DATABASE_URL_UNPOOLED`: conexión directa, usada por migraciones y carga inicial.

3. Cree el esquema, cargue los datos de demostración y compruebe la conexión:

```powershell
npm run db:migrate
npm run db:seed
npm run db:check
npm run dev
```

Abra `http://localhost:3000`.

La carga inicial de `db/seed/vigente.seed.json` es un recurso estático de instalación. La aplicación nunca lo modifica ni lo usa como fuente de verdad después de inicializar Neon.

## Vercel + Neon

La opción recomendada es conectar Neon desde Vercel Marketplace al proyecto. La integración inyecta automáticamente las variables de conexión en Development, Preview y Production.

Flujo de despliegue:

```powershell
vercel link
vercel integration add neon
vercel env pull .env.local
npm run db:migrate
npm run db:seed
vercel --prod
```

Si el recurso ya existe, conéctelo al proyecto en Vercel y ejecute `vercel env pull .env.local`; no cree una segunda base. La carga inicial usa `ON CONFLICT DO NOTHING`, por lo que no reemplaza información existente.

## Persistencia y seguridad

- Las escrituras se ejecutan en una transacción PostgreSQL y bloquean el registro principal durante la actualización.
- Cada escritura exige `version`; un cambio concurrente devuelve HTTP 409.
- El pool usa `attachDatabasePool` para el ciclo de vida de Vercel Functions.
- Las credenciales permanecen en variables de servidor y nunca usan el prefijo `NEXT_PUBLIC_`.
- Las exportaciones JSON son instantáneas portables y omiten hashes de contraseña.
- Los usuarios de demostración contienen hashes bcrypt, nunca contraseñas en texto plano.

## Comandos de verificación

```powershell
npm run typecheck
npm test
npm run build
```

## Convenciones de cálculo

- Dinero: cadenas decimales con dos posiciones (`"2400.00"`).
- Tasas: cadenas decimales (`"0.0945"`).
- Operaciones: `decimal.js`, redondeo `ROUND_HALF_UP` a dos decimales por rubro.
- Sueldo mensual: base de 30 días; valor hora del escenario ordinario: remuneración mensual computable / 240.
- Las nóminas aprobadas guardan instantáneas de entradas, parámetros y fuentes.

## Alcance

Es una simulación educativa. Los reportes internos no sustituyen declaraciones, avisos, pagos ni trámites oficiales. La app muestra como pendiente cualquier regla que no pueda verificarse con la información disponible.
