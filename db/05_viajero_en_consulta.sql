-- =====================================================================
-- Descubrir tu Ruta - 05_viajero_en_consulta.sql
-- Migración para bases creadas antes de pedir los datos del viajero.
-- Cada consulta nueva guarda nombres, apellidos y teléfono, y se puede
-- recuperar después con el teléfono y los apellidos.
-- Las consultas anteriores quedan sin estos datos (NULL).
-- Las instalaciones nuevas ya lo traen en 01_schema.sql.
-- =====================================================================
ALTER TABLE consulta
  ADD COLUMN nombres   VARCHAR(60),
  ADD COLUMN apellidos VARCHAR(60),
  ADD COLUMN telefono  VARCHAR(10) CHECK (telefono ~ '^[0-9]{10}$'),
  ADD CONSTRAINT consulta_viajero_completo CHECK (
    (nombres IS NULL AND apellidos IS NULL AND telefono IS NULL) OR
    (nombres IS NOT NULL AND apellidos IS NOT NULL AND telefono IS NOT NULL));

CREATE INDEX consulta_telefono_idx ON consulta (telefono);
