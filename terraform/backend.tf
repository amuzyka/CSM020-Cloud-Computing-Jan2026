terraform {
  backend "gcs" {
    bucket = "miniwall-terraform-state"
    prefix = "terraform/state"
  }
}
