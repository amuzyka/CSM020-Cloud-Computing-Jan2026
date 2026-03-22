#!/usr/bin/env python3
"""
MiniWall Test Data Cleanup Script
Removes test users, clients, and data created during testing
"""

import requests
import json
import sys

def load_credentials():
    """Load test credentials from file"""
    try:
        with open("test_credentials.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print("No test credentials found. Run setup first.")
        return None

def cleanup_test_data():
    """Clean up test data"""
    print("Cleaning up test data...")
    
    credentials = load_credentials()
    if not credentials:
        return False
    
    auth_base_url = "http://localhost/api/auth"
    app_base_url = "http://localhost"
    
    try:
        headers = {"Authorization": f"Bearer {credentials['jwt_token']}"}
        
        # 1. Delete OAuth2 client
        print("1. Deleting OAuth2 clients...")
        clients_response = requests.get(f"{auth_base_url}/clients", headers=headers)
        if clients_response.status_code == 200:
            clients = clients_response.json().get("clients", [])
            for client in clients:
                if "test" in client.get("name", "").lower():
                    delete_response = requests.delete(f"{auth_base_url}/clients/{client['_id']}", headers=headers)
                    if delete_response.status_code in [200, 204]:
                        print(f"   Deleted client: {client['name']}")
        
        # 2. Delete test posts
        print("2. Deleting test posts...")
        posts_response = requests.get(f"{app_base_url}/posts", headers={"Authorization": f"Bearer {credentials['oauth2_token']}"})
        if posts_response.status_code == 200:
            posts = posts_response.json()
            if isinstance(posts, list):
                for post in posts:
                    if any(test_user in post.get("authorId", "") for test_user in ["olga", "nick", "mary"]):
                        delete_response = requests.delete(f"{app_base_url}/posts/{post['_id']}", 
                                                        headers={"Authorization": f"Bearer {credentials['oauth2_token']}"})
                        if delete_response.status_code in [200, 204]:
                            print(f"   Deleted post by {post.get('authorId')}")
        
        # 3. Delete test users
        print("3. Deleting test users...")
        test_users = ["olga", "nick", "mary", "test_client_user"]
        for username in test_users:
            # Note: This would require an admin endpoint or direct database access
            print(f"   User '{username}' cleanup requires manual intervention")
        
        # 4. Remove credentials file
        import os
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
        return False

def main():
    """Main cleanup function"""
    print("MiniWall Test Data Cleanup")
    print("=" * 30)
    
    if not cleanup_test_data():
        print("\nCleanup failed")
        sys.exit(1)
    
    print("\nCleanup complete!")

if __name__ == "__main__":
    main()
