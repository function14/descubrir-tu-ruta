-- =====================================================================
-- Descubrir tu Ruta - 04_todos_los_destinos.sql
-- Migración para bases creadas con el límite de tres posiciones.
-- La recomendación ahora guarda todos los destinos compatibles.
-- Las instalaciones nuevas ya lo traen en 01_schema.sql.
-- =====================================================================
ALTER TABLE recomendacion DROP CONSTRAINT recomendacion_posicion_check;
ALTER TABLE recomendacion ADD CONSTRAINT recomendacion_posicion_check CHECK (posicion >= 1);
