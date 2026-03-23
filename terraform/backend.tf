terraform {
  backend "gcs" {
    bucket = "miniwall-terraform-state-cs020-jan2026"
    prefix = "terraform/state"
  }
}
