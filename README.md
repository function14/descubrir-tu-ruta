# Descubrir tu Ruta

Sistema experto que recomienda destinos turísticos de Colombia. Materia: Sistemas Expertos, UMB.

| Capa | Carpeta | Servicio |
|---|---|---|
| Base de conocimiento y transaccional | `db/` | Neon (PostgreSQL) |
| Motor de inferencia | `lambda/` | AWS Lambda |
| SE como servicio | `infra/` | Amazon API Gateway (HTTP API) |
| Interfaz | `web/` | Vercel |

## Probar en local

No necesita cuentas: usa la API real sobre PostgreSQL embebido (PGlite).

```powershell
cd lambda
npm install
npm test        # 46 pruebas
npm run dev     # http://localhost:8787
```

## API

### `GET /preguntas`

Devuelve la siguiente pregunta del cuestionario adaptativo. Las respuestas previas van como parámetros.

```
GET /preguntas?tipo_experiencia=Cultura
```
```json
{
  "fin": false,
  "respondidas": 1,
  "siguiente": { "variable": "clima", "valores": ["Frío", "Templado", "Cálido"] }
}
```

Con `"fin": true` ya no queda nada por preguntar y corresponde llamar a `POST /recomendar`.

### `POST /recomendar`

Cada consulta queda a nombre de quien la hace. `viajero` es obligatorio:

- `nombres` y `apellidos`: de 2 a 60 caracteres. Se aceptan letras, espacios, guiones y apóstrofos.
- `telefono`: un número de Colombia de 10 dígitos, celular (3…) o fijo (60…). Se aceptan espacios, guiones y el indicativo +57; se guarda solo con los dígitos.
- `autoriza_datos`: debe ser `true`. Es la autorización para guardar estos datos con la consulta.

En `respuestas`, las claves son los nombres de `variable` y los valores, las etiquetas de `valor`, exactamente como están en la base. Basta una respuesta. Un valor que no exista devuelve 400 con la lista de permitidos.

```json
{
  "viajero": {
    "nombres": "Ana María",
    "apellidos": "Gómez Pérez",
    "telefono": "300 123 4567",
    "autoriza_datos": true
  },
  "respuestas": {
    "tipo_experiencia": "Cultura",
    "clima": "Templado",
    "presupuesto": "Medio",
    "geografia": "Urbano"
  }
}
```

| Variable | Valores |
|---|---|
| `tipo_experiencia` | Aventura, Naturalista/Ecoturismo, Cultura, Playa/Relax |
| `clima` | Frío, Templado, Cálido |
| `presupuesto` | Económico, Medio, Alto |
| `esfuerzo_fisico` | Bajo, Medio, Alto |
| `geografia` | Playa, Urbano, Rural, Montaña, Selva, Desierto, Lago |
| `afluencia` | Masiva, Moderada, Tranquila |
| `apto_pareja` | Sí, No |
| `actividad_rural` | Sí, No |

```json
{
  "consulta_id": 2,
  "recomendaciones": [
    {
      "posicion": 1,
      "destino": "Medellín",
      "region": "Antioquia",
      "descripcion": "Ciudad con oferta cultural y gastronómica",
      "puntaje": 2,
      "peso_relativo": 29.27,
      "reglas_exactas": 2,
      "reglas": ["R23", "RC8"],
      "explicacion": [
        {
          "regla": "R23",
          "tipo": "exacta",
          "aporte": 1,
          "condiciones": [
            { "variable": "tipo_experiencia", "valor": "Cultura", "cumplida": true }
          ]
        }
      ]
    }
  ]
}
```

`recomendaciones` trae todos los destinos con puntaje mayor que 0, de mayor a menor peso. `peso_relativo` es el puntaje del destino normalizado sobre el total, en porcentaje: expresa compatibilidad relativa, no una probabilidad.

Si ninguna regla coincide, `recomendaciones` llega vacío junto con un `mensaje`.

### `POST /consultas/buscar`

Lista las consultas de una persona, de la más reciente a la más antigua. Exige el teléfono y el primer apellido, o los dos apellidos. No distingue mayúsculas ni tildes.

Una consulta solo aparece si coinciden los dos datos, así que conocer un teléfono no basta para ver a nombre de quién está. Si algo no coincide, la respuesta es igual a la de un teléfono sin consultas.

```json
{ "telefono": "3001234567", "apellidos": "gomez" }
```
```json
{
  "consultas": [
    {
      "consulta_id": 7,
      "fecha": "2026-11-12T23:37:05Z",
      "nombres": "Ana María",
      "apellidos": "Gómez Pérez",
      "respuestas": { "tipo_experiencia": "Cultura", "clima": "Templado", "presupuesto": "Medio", "geografia": "Urbano" },
      "destino_principal": "Medellín",
      "peso_principal": 29.27,
      "total_destinos": 18
    }
  ]
}
```

Las consultas creadas antes de pedir estos datos no tienen nombre y no aparecen.

### `POST /consultas/detalle`

Devuelve una consulta completa, con la misma forma de `POST /recomendar` y además `fecha`, `nombres`, `apellidos` y `respuestas`. El ranking y la explicación se recalculan a partir de los hechos guardados. Mientras la base de conocimiento no cambie, el resultado es idéntico al original.

```json
{ "telefono": "3001234567", "apellidos": "Gómez", "consulta_id": 7 }
```

Si la consulta no existe o los datos no coinciden, responde 404.

## Despliegue

Requiere `DATABASE_URL` (cadena pooled de Neon) y credenciales de AWS.

```powershell
# 1. Base de conocimiento (se niega a correr si ya está cargada)
cd lambda
npm run db:cargar
#    Una base cargada antes de un cambio de esquema se actualiza con las migraciones
#    de db/ (04_…, 05_…), en orden. Las instalaciones nuevas no las necesitan.

# 2. Lambda y API Gateway
npm run build
cd ..\infra
$env:TF_VAR_database_url = "..."
$env:TF_VAR_allowed_origin = "https://descubrir-tu-ruta.vercel.app"
$env:TF_VAR_correo_alertas = "..."
terraform init
terraform apply

# 3. Interfaz: en Vercel, la variable API_URL = salida api_url de Terraform
```

`infra/terraform.tfstate` guarda `DATABASE_URL` en texto plano: está en `.gitignore` y no debe subirse.

### Activar la alerta de presupuesto

La cuenta de AWS aloja otros proyectos, así que el presupuesto de $5 solo mide los recursos con la etiqueta `Proyecto=descubrir-tu-ruta`. AWS no deja activar una etiqueta hasta que aparece en facturación (alrededor de 24 horas después del primer uso). Mientras tanto el presupuesto marca $0. Para activarla:

```powershell
aws ce update-cost-allocation-tags-status --profile descubrir-ruta --region us-east-1 --cost-allocation-tags-status TagKey=Proyecto,Status=Active
```

## Retirar los recursos

```powershell
cd infra
terraform destroy
```

El proyecto de Neon y el de Vercel se eliminan desde sus paneles.
