variable "region" {
  description = "Región de AWS; la misma de Neon para minimizar la latencia."
  type        = string
  default     = "us-east-1"
}

variable "database_url" {
  description = "Cadena de conexión pooled de Neon."
  type        = string
  sensitive   = true
}

variable "allowed_origin" {
  description = "Dominio de Vercel autorizado por CORS, sin barra final."
  type        = string
}

variable "correo_alertas" {
  description = "Correo que recibe la alerta del presupuesto mensual."
  type        = string
}
