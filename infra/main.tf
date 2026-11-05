# Motor de inferencia (Lambda) expuesto como servicio (API Gateway HTTP API).
# La base de conocimiento vive en Neon y la interfaz en Vercel, fuera de este estado.

terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.7"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Proyecto = "descubrir-tu-ruta"
    }
  }
}

locals {
  nombre = "descubrir-tu-ruta-inferencia"
}

data "aws_iam_policy_document" "lambda_asume_rol" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = local.nombre
  assume_role_policy = data.aws_iam_policy_document.lambda_asume_rol.json
}

# Solo logs: la Lambda llega a Neon por HTTPS, sin permisos sobre otros servicios de AWS.
resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.nombre}"
  retention_in_days = 14
}

data "archive_file" "lambda" {
  type        = "zip"
  source_file = "${path.module}/../lambda/dist/index.mjs"
  output_path = "${path.module}/.terraform/lambda.zip"
}

# Sin vpc_config a propósito: dentro de una VPC, llegar a Neon exigiría un NAT Gateway de pago.
resource "aws_lambda_function" "inferencia" {
  function_name    = local.nombre
  role             = aws_iam_role.lambda.arn
  runtime          = "nodejs24.x"
  handler          = "index.handler"
  memory_size      = 256
  timeout          = 10
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256

  environment {
    variables = {
      DATABASE_URL   = var.database_url
      ALLOWED_ORIGIN = var.allowed_origin
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.logs,
    aws_cloudwatch_log_group.lambda,
  ]
}

resource "aws_apigatewayv2_api" "se" {
  name          = "descubrir-tu-ruta"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = [var.allowed_origin]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type"]
    max_age       = 3600
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.se.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.inferencia.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "recomendar" {
  api_id    = aws_apigatewayv2_api.se.id
  route_key = "POST /recomendar"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "preguntas" {
  api_id    = aws_apigatewayv2_api.se.id
  route_key = "GET /preguntas"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.se.id
  name        = "$default"
  auto_deploy = true

  # La API es pública y cada POST escribe en la base: el límite protege el presupuesto.
  default_route_settings {
    throttling_rate_limit  = 5
    throttling_burst_limit = 10
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.inferencia.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.se.execution_arn}/*/*"
}

resource "aws_budgets_budget" "mensual" {
  name         = "descubrir-tu-ruta"
  budget_type  = "COST"
  limit_amount = "5"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.correo_alertas]
  }
}
