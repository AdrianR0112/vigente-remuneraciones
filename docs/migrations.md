# Versionado y migraciones del JSON

La propiedad raíz `schemaVersion` identifica la forma del documento; `version` controla concurrencia y aumenta en cada escritura.

## Versión 1

Versión inicial. Incluye todas las colecciones exigidas, dinero como cadenas con dos decimales, tasas como cadenas decimales y fechas calendario ISO `YYYY-MM-DD`.

## Política de migración

1. El servidor lee el archivo sin modificarlo y valida `schemaVersion`.
2. Una futura migración debe transformar una copia en memoria, validar el documento completo y crear un respaldo del original.
3. Solo después de la validación se escribe un temporal y se reemplaza el archivo de forma atómica.
4. La migración añade una entrada de auditoría con versiones de esquema y de datos.
5. Si la transformación falla, el archivo original permanece intacto y la aplicación ofrece restauración; nunca reinicia datos silenciosamente.

No existen migraciones anteriores a la versión 1.
