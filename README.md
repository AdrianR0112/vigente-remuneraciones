# Vigente | Remuneraciones

Aplicación demostrativa de nómina privada ecuatoriana construida con Next.js, TypeScript y persistencia real en `data/vigente.json`.

## Ejecutar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. El archivo JSON se lee y escribe únicamente en el servidor; no se publica desde `public/`.

## Comandos de verificación

```bash
npm run typecheck
npm test
npm run build
```

## Persistencia y seguridad

- Las escrituras se serializan, validan y guardan primero en un temporal; después se reemplaza el archivo.
- Antes de reemplazar o importar se guarda una copia en `data/backups/`.
- Cada escritura exige `version` y devuelve conflicto HTTP 409 cuando otra operación ya modificó los datos.
- Un JSON dañado no se borra ni se reinicia. La API responde con diagnóstico y lista los respaldos restaurables.
- Los usuarios de demostración contienen hashes bcrypt, nunca contraseñas en texto plano.

### Despliegue en Vercel

El sistema de archivos del despliegue es de solo lectura. Cuando detecta Vercel, la aplicación copia el JSON inicial a `/tmp/vigente-remuneraciones/` para permitir altas, ediciones y respaldos durante la vida de la instancia. Ese directorio es temporal y puede reiniciarse en un nuevo despliegue o instancia.

Para conservar cambios entre reinicios, configure `VIGENTE_DATA_PATH` con la ruta de un volumen persistente compatible con el proveedor. En Vercel estándar, una base de datos o un servicio de almacenamiento externo es necesario para persistencia real; `/tmp` evita el `EROFS`, pero no sustituye ese almacenamiento.

## Convenciones de cálculo

- Dinero: cadenas decimales con dos posiciones (`"2400.00"`).
- Tasas: cadenas decimales (`"0.0945"`).
- Operaciones: `decimal.js`, redondeo `ROUND_HALF_UP` a dos decimales por rubro.
- Sueldo mensual: base de 30 días; valor hora del escenario ordinario: remuneración mensual computable / 240.
- Las nóminas aprobadas guardan instantáneas de entradas, parámetros y fuentes.

## Alcance

Es una simulación educativa. Los reportes internos no sustituyen declaraciones, avisos, pagos ni trámites oficiales. La app muestra como pendiente cualquier regla que no pueda verificarse con la información disponible.
