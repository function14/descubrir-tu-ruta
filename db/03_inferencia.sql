-- =====================================================================
-- Descubrir tu Ruta - 03_inferencia.sql (PostgreSQL / Neon)
-- Vistas de puntaje que usa el motor de inferencia.
--   Regla exacta  -> aporta peso
--   Regla parcial -> aporta 0.5 * peso * cumplidas / total
-- =====================================================================

-- Evaluación de cada regla activa frente a los hechos de cada consulta.
CREATE VIEW puntaje_regla AS
SELECT ru_c.id_consulta, r.id_regla, r.id_destino, r.peso,
       tot.n AS total, COALESCE(ok.n, 0) AS cumplidas,
       CASE WHEN COALESCE(ok.n, 0) = tot.n THEN r.peso
            ELSE 0.5 * r.peso * COALESCE(ok.n, 0) / tot.n END AS aporte
FROM (SELECT DISTINCT id_consulta FROM respuesta_usuario) ru_c
CROSS JOIN regla r
JOIN (SELECT id_regla, COUNT(*) AS n FROM regla_condicion GROUP BY id_regla) tot
  ON tot.id_regla = r.id_regla
LEFT JOIN (SELECT rc.id_regla, ru.id_consulta, COUNT(*) AS n
             FROM regla_condicion rc
             JOIN respuesta_usuario ru
               ON ru.id_variable = rc.id_variable AND ru.id_valor = rc.id_valor
            GROUP BY rc.id_regla, ru.id_consulta) ok
       ON ok.id_regla = r.id_regla AND ok.id_consulta = ru_c.id_consulta
WHERE r.activa = 1;

-- Puntaje total por hipótesis (destino) para cada consulta.
CREATE VIEW puntaje_destino AS
SELECT pr.id_consulta, d.id_destino, d.nombre,
       SUM(pr.aporte) AS puntaje,
       SUM(CASE WHEN pr.cumplidas = pr.total THEN 1 ELSE 0 END) AS reglas_exactas
FROM puntaje_regla pr
JOIN destino d ON d.id_destino = pr.id_destino
WHERE d.activo = 1
GROUP BY pr.id_consulta, d.id_destino, d.nombre;

-- Caso conocido para verificar la carga (consulta 1 del seed):
-- Cultura, Urbano, Medio, Templado. Debe dar Medellín en primer lugar.
--
--   SELECT nombre AS destino, ROUND(puntaje, 2) AS puntaje, reglas_exactas
--   FROM puntaje_destino
--   WHERE id_consulta = 1
--   ORDER BY puntaje DESC, reglas_exactas DESC, nombre
--   LIMIT 3;
