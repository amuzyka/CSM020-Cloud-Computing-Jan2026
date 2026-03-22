#!/usr/bin/env python3
"""
MiniWall Test Environment Setup Script
Sets up OAuth2 client and test data for the MiniWall API test suite
"""

import requests
import json
import sys
import subprocess
import time

def start_services_if_needed():
    """Start Docker services if they're not running"""
    print("Checking if services are running...")
    
    try:
        # Check if services are already running
        result = subprocess.run(['docker-compose', '-f', 'docker-compose.dev.yml', 'ps'], 
                              capture_output=True, text=True, cwd='..')
        
        if 'Up' in result.stdout and result.returncode == 0:
            print("Services are already running")
            return True
    except Exception:
        pass
    
    print("Starting services...")
    try:
        # Start services
        result = subprocess.run(['docker-compose', '-f', 'docker-compose.dev.yml', 'up', '-d'], 
                              capture_output=True, text=True, cwd='..')
        
        if result.returncode != 0:
            print(f"Failed to start services: {result.stderr}")
            return False
        
        print("Waiting for services to be ready...")
        time.sleep(10)  # Give services time to start
        
        # Verify services are running
        result = subprocess.run(['docker-compose', '-f', 'docker-compose.dev.yml', 'ps'], 
                              capture_output=True, text=True, cwd='..')
        
        if 'Up' in result.stdout and result.returncode == 0:
            print("Services started successfully")
            return True
        else:
            print("Services may not have started properly")
            return False
            
    except Exception as e:
        print(f"Error starting services: {e}")
        return False

def setup_oauth2_client():
    """Set up OAuth2 client for testing"""
    print("Setting up OAuth2 client for testing...")
    
    # Base URLs (via nginx)
    auth_base_url = "http://localhost/auth"
    oauth_base_url = "http://localhost/oauth"
    
    try:
        # 1. Register a test user for OAuth2 client creation
        print("1. Registering test user...")
        register_data = {
            "username": "test_client_user",
            "email": "client@example.com", 
            "password": "client123"
        }
        
        response = requests.post(f"{auth_base_url}/register", json=register_data)
        if response.status_code not in [200, 201]:
            if response.status_code == 401:
                print("User may already exist, attempting login...")
            else:
                print(f"Failed to register user: {response.status_code}")
                print(f"Response: {response.text}")
                return False
        
        # 2. Login to get JWT token
        print("2. Getting JWT token...")
        login_response = requests.post(f"{auth_base_url}/login", 
                                     json={"username": "test_client_user", "password": "client123"})
        
        if login_response.status_code != 201:
            print(f"Failed to login: {login_response.status_code}")
            return False
        
        jwt_token = login_response.json().get("access_token")
        
        # 3. Create OAuth2 client
        print("3. Creating OAuth2 client...")
        client_data = {
            "name": "Test Client",
            "redirectUris": ["https://httpbin.org/anything"],
            "allowedScopes": ["read", "write"],
            "grantTypes": ["authorization_code", "client_credentials", "refresh_token"]
        }
        
        headers = {"Authorization": f"Bearer {jwt_token}"}
        client_response = requests.post(f"{auth_base_url}/clients", headers=headers, json=client_data)
        
        if client_response.status_code != 201:
            print(f"Failed to create OAuth2 client: {client_response.status_code}")
            print(f"Response: {client_response.text}")
            return False
        
        client_info = client_response.json()
        client_id = client_info.get("client", {}).get("clientId")
        client_secret = client_info.get("clientSecret")
        
        # 4. Get OAuth2 access token
        print("4. Getting OAuth2 access token...")
        token_data = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret
        }
        
        token_response = requests.post(f"{oauth_base_url}/token", json=token_data)
        
        if token_response.status_code not in [200, 201]:
            print(f"Failed to get OAuth2 token: {token_response.status_code}")
            print(f"Response: {token_response.text}")
            return False
        
        oauth2_token = token_response.json().get("access_token")
        
        # 5. Save credentials to file
        credentials = {
            "client_id": client_id,
            "client_secret": client_secret,
            "oauth2_token": oauth2_token,
            "jwt_token": jwt_token
        }
        
        with open("test_credentials.json", "w") as f:
            json.dump(credentials, f, indent=2)
        
        print("OAuth2 client setup complete!")
        print(f"   Client ID: {client_id}")
        print(f"   Client Secret: {client_secret}")
        print(f"   Credentials saved to: test_credentials.json")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"Network error: {e}")
        return False
    except Exception as e:
        print(f"Setup failed: {e}")
        return False

def verify_services():
    """Verify that all required services are running"""
    print("Verifying service connectivity...")
    
    services = {
        "Nginx": "http://localhost/health",
        "App Server (via nginx)": "http://localhost/health"
    }
    
    all_running = True
    
    for service, url in services.items():
        try:
            response = requests.get(url, timeout=5)
            if response.status_code in [200, 401]:  # 401 is OK - means service is running
                print(f"{service} - OK")
            else:
                print(f"{service} - Status {response.status_code}")
                all_running = False
        except requests.exceptions.RequestException:
            print(f"{service} - Connection failed")
            all_running = False
    
    return all_running

def main():
    """Main setup function"""
    print("MiniWall Test Environment Setup")
    print("=" * 40)
    
    # Start services if not running
    if not start_services_if_needed():
        print("\nFailed to start services. Please check Docker configuration.")
        sys.exit(1)
    
    print()
    
    # Verify services are running
    if not verify_services():
        print("\nServices are not responding correctly. Please check the logs:")
        print("   docker-compose -f docker-compose.dev.yml logs")
        sys.exit(1)
    
    print()
    
    # Set up OAuth2 client
    if not setup_oauth2_client():
        print("\nOAuth2 setup failed")
        sys.exit(1)
    
    print("\nTest environment setup complete!")
    print("You can now run the tests with: python3 miniwall-api-tests.py")

if __name__ == "__main__":
    main()
