terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
  zone    = var.gcp_zone
}

resource "google_compute_firewall" "miniwall_firewall" {
  name    = "miniwall-firewall"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22", "80", "443", "3000", "4000"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["miniwall", "http-server"]
  
}

# Static IP address
resource "google_compute_address" "miniwall_ip" {
  name         = "miniwall-ip"
  region       = var.gcp_region
  network_tier = "STANDARD"
}

resource "google_compute_instance" "miniwall_server" {
  name         = "miniwall-server"
  machine_type = "e2-medium"
  zone         = var.gcp_zone

  tags = ["miniwall", "http-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 30
    }
  }

  network_interface {
    network = "default"
    access_config {
      nat_ip       = google_compute_address.miniwall_ip.address
      network_tier = "STANDARD"
    }
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    set -e

    echo "Starting MiniWall deployment with Modern Docker Stack..."

    # 1. Install Prerequisites
    apt-get update
    apt-get install -y ca-certificates curl gnupg git

    # 2. Add Docker's Official GPG Key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # 3. Add Docker Repository (Debian 12)
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    # 4. Install Docker Engine and Compose Plugin (V2)
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # 5. Start Docker
    systemctl start docker
    systemctl enable docker

    # 6. Prepare Application Directory
    mkdir -p /opt/miniwall
    cd /opt/miniwall
    
    # Clone repository
    rm -rf ./*
    git clone https://github.com/amuzyka/CSM020-Cloud-Computing-Jan2026.git .

    # 7. Create production environment file
    cat > .env.production << 'ENVFILE'
# ============================================
# MongoDB Configuration
# ============================================
MONGO_APP_ROOT_USERNAME=admin
MONGO_APP_ROOT_PASSWORD=admin123
MONGO_AUTH_ROOT_USERNAME=admin
MONGO_AUTH_ROOT_PASSWORD=admin123

# ============================================
# Server Configuration
# ============================================
APP_PORT=3000
AUTH_SERVER_PORT=4000
NODE_ENV=production

# ============================================
# JWT & OAuth2 Configuration
# ============================================
JWT_SECRET=${var.jwt_secret}
OAUTH2_CLIENT_ID=${var.oauth2_client_id}
OAUTH2_CLIENT_SECRET=${var.oauth2_client_secret}
OAUTH2_ACCESS_TOKEN_LIFETIME=3600
OAUTH2_REFRESH_TOKEN_LIFETIME=604800

# ============================================
# Service URLs
# ============================================
AUTH_SERVER_URL=http://miniwall-auth-server:4000
APP_URL=http://miniwall-app:3000

# ============================================
# Nginx & Logging
# ============================================
NGINX_PORT=80
LOG_LEVEL=info
LOG_FILE=/app/logs/app.log
ENVFILE

    # 8. Start services using modern Compose V2 (rebuild images on code changes)
    docker compose --env-file .env.production up -d --build

    echo "MiniWall deployment complete!"
    echo "Access at: http://${google_compute_address.miniwall_ip.address}"
  EOF

  depends_on = [
    google_compute_firewall.miniwall_firewall,
    google_compute_address.miniwall_ip
  ]
}