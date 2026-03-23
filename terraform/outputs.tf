output "server_ip" {
  description = "MiniWall Server Public IP Address"
  value       = google_compute_address.miniwall_ip.address
}

output "server_name" {
  description = "MiniWall Server Instance Name"
  value       = google_compute_instance.miniwall_server.name
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.gcp_project_id
}

output "deployment_url" {
  description = "MiniWall Application HTTP URL"
  value       = "http://${google_compute_address.miniwall_ip.address}"
}

output "ssh_command" {
  description = "Command to SSH into the server"
  value       = "gcloud compute ssh ${google_compute_instance.miniwall_server.name} --zone=${var.gcp_zone} --project=${var.gcp_project_id}"
}

output "zone" {
  description = "GCP Zone where instance is deployed"
  value       = var.gcp_zone
}