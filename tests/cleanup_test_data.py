#!/usr/bin/env python3
"""
MiniWall Test Data Cleanup Script
Removes test users, clients, and data created during testing
"""

import requests
import json
import sys
import subprocess
import os

def load_credentials():
    """Load test credentials from file"""
    try:
        with open("test_credentials.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print("No test credentials found. Run setup first.")
        return None

def stop_services():
    """Stop Docker services"""
    print("Stopping Docker services...")
    try:
        result = subprocess.run(['docker-compose', '-f', 'docker-compose.dev.yml', 'down'], 
                              capture_output=True, text=True, cwd='..')
        if result.returncode == 0:
            print("Services stopped successfully")
            return True
        else:
            print(f"Failed to stop services: {result.stderr}")
            return False
    except Exception as e:
        print(f"Error stopping services: {e}")
        return False

def remove_volumes():
    """Remove Docker volumes"""
    print("Removing Docker volumes...")
    try:
        result = subprocess.run(['docker-compose', '-f', 'docker-compose.dev.yml', 'down', '-v'], 
                              capture_output=True, text=True, cwd='..')
        if result.returncode == 0:
            print("Volumes removed successfully")
            return True
        else:
            print(f"Failed to remove volumes: {result.stderr}")
            return False
    except Exception as e:
        print(f"Error removing volumes: {e}")
        return False

def remove_images():
    """Remove Docker images"""
    print("Removing Docker images...")
    try:
        # Get image names from docker-compose
        result = subprocess.run(['docker-compose', '-f', 'docker-compose.dev.yml', 'config'], 
                              capture_output=True, text=True, cwd='..')
        
        if result.returncode == 0:
            # Extract service names and remove their images
            services = ['miniwall-app', 'miniwall-auth-server', 'mongodb-app', 'mongodb-auth']
            for service in services:
                try:
                    # Remove the service image
                    image_result = subprocess.run(['docker', 'rmi', f'miniwall-{service}-dev'], 
                                                  capture_output=True, text=True)
                    if image_result.returncode == 0:
                        print(f"Removed image: miniwall-{service}-dev")
                except Exception:
                    pass  # Ignore if image doesn't exist
        
        print("Image removal completed")
        return True
    except Exception as e:
        print(f"Error removing images: {e}")
        return False

def cleanup_test_data():
    """Clean up test data"""
    print("Cleaning up test data...")
    
    credentials = load_credentials()
    if not credentials:
        return False
    

    base_url = "http://localhost"
    auth_base_url = f"{base_url}/auth"
    app_base_url = base_url
    
    try:
        headers = {"Authorization": f"Bearer {credentials['jwt_token']}"}
        oauth_headers = {"Authorization": f"Bearer {credentials['oauth2_token']}"}
        
        # 1. Delete OAuth2 client
        print("1. Deleting OAuth2 clients...")
        clients_response = requests.get(f"{base_url}/clients", headers=headers)
        if clients_response.status_code == 200:
            clients = clients_response.json()
            # Handle both array and object with clients property
            if isinstance(clients, dict):
                clients = clients.get("clients", [])
            if isinstance(clients, list):
                for client in clients:
                    if "test" in client.get("name", "").lower():
                        client_id = client.get("_id") or client.get("id")
                        if client_id:
                            # FIXED: Use base_url for delete endpoint
                            delete_response = requests.delete(
                                f"{base_url}/clients/{client_id}", 
                                headers=headers
                            )
                            if delete_response.status_code in [200, 204]:
                                print(f"   Deleted client: {client.get('name', 'Unknown')}")
        
        # 2. Delete test posts
        print("2. Deleting test posts...")
        posts_response = requests.get(
            f"{app_base_url}/posts", 
            headers=oauth_headers
        )
        if posts_response.status_code == 200:
            posts = posts_response.json()
            if isinstance(posts, list):
                for post in posts:
                    author_id = post.get("authorId", "")
                    if any(test_user in str(author_id) for test_user in ["olga", "nick", "mary"]):
                        post_id = post.get("_id") or post.get("id")
                        if post_id:
                            delete_response = requests.delete(
                                f"{app_base_url}/posts/{post_id}", 
                                headers=oauth_headers
                            )
                            if delete_response.status_code in [200, 204]:
                                print(f"   Deleted post by {author_id}")
        
        # 3. Delete test users
        print("3. Deleting test users...")
        test_users = ["olga", "nick", "mary", "test_client_user"]
        for username in test_users:
            # Try to delete via auth service if endpoint exists
            try:
                # This assumes your auth service has a delete endpoint
                delete_user_response = requests.delete(
                    f"{auth_base_url}/users/{username}",
                    headers=headers
                )
                if delete_user_response.status_code in [200, 204]:
                    print(f"   Deleted user: {username}")
                else:
                    print(f"   User '{username}' cleanup skipped (status: {delete_user_response.status_code})")
            except Exception:
                print(f"   User '{username}' cleanup requires manual intervention or admin endpoint")
        
        # 4. Remove credentials file
        if os.path.exists("test_credentials.json"):
            os.remove("test_credentials.json")
            print("   Removed test credentials file")
        
        print("Cleanup complete!")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"Network error during cleanup: {e}")
        return False
    except Exception as e:
        print(f"Cleanup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main cleanup function"""
    print("MiniWall Test Data Cleanup")
    print("=" * 30)
    
    # Clean up test data first (while services are running)
    cleanup_attempted = cleanup_test_data()
    if not cleanup_attempted:
        print("\nTest data cleanup failed or no credentials found, continuing with service cleanup...")
    
    # Stop services
    stop_services()
    
    # Ask user about volumes and images
    try:
        response = input("\nRemove Docker volumes? (y/N): ").strip().lower()
        if response in ['y', 'yes']:
            remove_volumes()
        
        response = input("Remove Docker images? (y/N): ").strip().lower()
        if response in ['y', 'yes']:
            remove_images()
            
    except KeyboardInterrupt:
        print("\nCleanup interrupted by user")
    
    print("\nCleanup complete!")

if __name__ == "__main__":
    main()
    