output "api_url" {
  description = "URL pública del sistema experto como servicio."
  value       = aws_apigatewayv2_api.se.api_endpoint
}
