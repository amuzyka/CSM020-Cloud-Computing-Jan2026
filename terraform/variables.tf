variable "gcp_project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "gcp_region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "gcp_zone" {
  description = "GCP Zone"
  type        = string
  default     = "us-central1-a"
}

variable "github_repo" {
  description = "GitHub repository (username/repo)"
  type        = string
  default     = "amuzyka/CSM020-Cloud-Computing-Jan2026"
}

variable "jwt_secret" {
  description = "JWT Secret for authentication"
  type        = string
  sensitive   = true
}

variable "oauth2_client_id" {
  description = "OAuth2 Client ID"
  type        = string
  default     = "miniwall-client"
}

variable "oauth2_client_secret" {
  description = "OAuth2 Client Secret"
  type        = string
  sensitive   = true
}