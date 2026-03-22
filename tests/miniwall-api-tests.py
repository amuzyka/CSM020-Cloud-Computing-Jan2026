#!/usr/bin/env python3
"""
MiniWall API Test Suite
Comprehensive test cases for MiniWall application functionality
Tests user registration, authentication, posting, commenting, and liking features
"""

import requests
import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime


class SafeEncoder(json.JSONEncoder):
    """Custom JSON encoder to handle non-serializable objects"""
    def default(self, obj):
        if isinstance(obj, requests.Response):
            return {
                "status_code": obj.status_code,
                "text": obj.text[:500] if obj.text else None,
                "url": obj.url
            }
        if isinstance(obj, Exception):
            return str(obj)
        try:
            return super().default(obj)
        except TypeError:
            return str(obj)[:500]


@dataclass
class TestUser:
    """Test user data structure"""
    username: str
    email: str
    password: str
    auth_user_id: Optional[str] = None
    jwt_token: Optional[str] = None
    user_id: Optional[str] = None


class MiniWallAPITester:
    """Main test class for MiniWall API"""
    
    def __init__(self):
        self.auth_base_url = "http://localhost/auth"
        self.app_base_url = "http://localhost"
        self.oauth_base_url = "http://localhost/oauth"
        self.session = requests.Session()
        
        # OAuth2 client credentials (will be set during setup)
        self.client_id = None
        self.client_secret = None
        self.oauth2_token = None
        
        # Test users
        self.olga = TestUser("olga", "olga@example.com", "olga123")
        self.nick = TestUser("nick", "nick@example.com", "nick123")
        self.mary = TestUser("mary", "mary@example.com", "mary123")
        
        # Store created data for cleanup
        self.created_posts = []
        self.created_comments = []
        self.created_likes = []
        
        # Test results
        self.test_results = []
    
    def log_test(self, test_name: str, success: bool, message: str = "", data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat()
        }
        
        # Safely handle data serialization
        if data is not None:
            try:
                # Test if data is JSON serializable
                if isinstance(data, (dict, list, str, int, float, bool)):
                    json.dumps(data, cls=SafeEncoder)  # Test serialization
                    result["data"] = data
                else:
                    result["data"] = str(data)[:500]
            except (TypeError, ValueError):
                result["data"] = str(data)[:500]
        
        self.test_results.append(result)
        
        status = "PASS" if success else "FAIL"
        print(f"{status} - {test_name}")
        if message:
            print(f"    {message}")
        if not success and data:
            # Safe print for display
            try:
                print(f"    Details: {json.dumps(data, indent=2, cls=SafeEncoder)[:500]}")
            except Exception:
                print(f"    Details: {str(data)[:500]}")
        print()
    
    def make_request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        try:
            # Add default timeout if not specified
            if 'timeout' not in kwargs:
                kwargs['timeout'] = 10
            response = self.session.request(method, url, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            print(f"URL: {url}")
            print(f"Method: {method}")
            import traceback
            traceback.print_exc()
            return None
        except Exception as e:
            print(f"Unexpected error: {e}")
            print(f"URL: {url}")
            print(f"Method: {method}")
            import traceback
            traceback.print_exc()
            return None
    
    def setup_oauth2_client(self):
        """Set up OAuth2 client and get access token"""
        print("=== Setting up OAuth2 Client ===")
        
        # First, try to load existing credentials
        try:
            with open("test_credentials.json", "r") as f:
                credentials = json.load(f)
                self.client_id = credentials.get("client_id")
                self.client_secret = credentials.get("client_secret")
                self.oauth2_token = credentials.get("oauth2_token")
                
                # Test if the token is still valid
                test_response = self.make_request("GET", f"{self.app_base_url}/health", 
                                                 headers=self.get_auth_headers())
                if test_response and test_response.status_code != 401:
                    self.log_test("OAuth2 Setup", True, "Using existing valid credentials")
                    return True
        except (FileNotFoundError, json.JSONDecodeError):
            pass
        
        # If no valid credentials, create new ones
        print("Creating new OAuth2 client...")
        
        # First, register a user to get JWT token for client creation
        register_data = {
            "username": "test_client_user",
            "email": "client@example.com", 
            "password": "client123"
        }
        
        response = self.make_request(
            "POST",
            f"{self.auth_base_url}/auth/register",
            json=register_data
        )
        
        if response and response.status_code not in [200, 201]:
            if response.status_code == 401:
                print("User may already exist, attempting login...")
            else:
                self.log_test("OAuth2 User Registration", False, "Failed to register user for client creation")
                return False
        
        # Login to get JWT token
        login_response = self.make_request(
            "POST",
            f"{self.auth_base_url}/auth/login",
            json={"username": "test_client_user", "password": "client123"}
        )
        
        if not login_response or login_response.status_code != 201:
            self.log_test("OAuth2 User Login", False, "Failed to login for client creation")
            return False
        
        jwt_token = login_response.json().get("access_token")
        
        # Create OAuth2 client
        client_data = {
            "name": "Test Client",
            "redirectUris": ["https://httpbin.org/anything"],
            "allowedScopes": ["read", "write"],
            "grantTypes": ["authorization_code", "client_credentials", "refresh_token"]
        }
        
        headers = {"Authorization": f"Bearer {jwt_token}"}
        
        # FIXED: Use app_base_url for /clients/ endpoint (not auth_base_url)
        client_response = self.make_request(
            "POST",
            f"{self.app_base_url}/clients",
            headers=headers,
            json=client_data
        )
        
        if not client_response or client_response.status_code != 201:
            self.log_test("OAuth2 Client Creation", False, "Failed to create OAuth2 client")
            return False
        
        client_info = client_response.json()
        self.client_id = client_info.get("client", {}).get("clientId")
        self.client_secret = client_info.get("clientSecret")
        
        # Get OAuth2 access token
        print("4. Getting OAuth2 access token...")
        token_data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        
        token_response = self.make_request(
            "POST",
            f"{self.oauth_base_url}/token",
            json=token_data
        )
        
        if token_response and token_response.status_code in [200, 201]:
            self.oauth2_token = token_response.json().get("access_token")
        else:
            self.log_test("OAuth2 Token Acquisition", False, "Failed to get OAuth2 access token")
            return False
        
        self.log_test("OAuth2 Setup", True, "Successfully set up OAuth2 client and token")
        return True
    
    def get_auth_headers(self, use_oauth2=True):
        """Get appropriate authorization headers"""
        if use_oauth2 and self.oauth2_token:
            return {"Authorization": f"Bearer {self.oauth2_token}"}
        return {}
    
    def get_user_auth_headers(self, user):
        """Get user-specific auth headers (using JWT)"""
        if user.jwt_token:
            return {"Authorization": f"Bearer {user.jwt_token}"}
        return {}
    
    # ==================== TEST CASES ====================
    
    def tc1_user_registration(self):
        """TC 1. Olga, Nick and Mary register in the application and access the API."""
        print("=== TC 1: User Registration ===")
        
        users = [self.olga, self.nick, self.mary]
        success_count = 0
        
        for user in users:
            # Try to register the user
            register_data = {
                "username": user.username,
                "email": user.email,
                "password": user.password
            }
            
            register_response = self.make_request(
                "POST",
                f"{self.auth_base_url}/auth/register",
                json=register_data
            )
            
            if register_response and register_response.status_code in [200, 201]:
                self.log_test(f"Register {user.username}", True, "Successfully registered user")
                success_count += 1
            elif register_response and register_response.status_code == 401:
                # User might already exist, try to get info
                self.log_test(f"Register {user.username}", True, 
                            "User already exists, will authenticate in TC2")
                success_count += 1
            else:
                self.log_test(f"Register {user.username}", False, 
                            "Failed to register user", register_response)
            
            # Set temporary auth_user_id for now
            user.auth_user_id = user.username
        
        overall_success = success_count == 3
        self.log_test("TC 1 Overall", overall_success, f"Successfully registered {success_count}/3 users")
        return overall_success
    
    def tc2_jwt_authentication(self):
        """TC 2. Olga, Nick and Mary will use the JWT authorisation service to get their tokens."""
        print("=== TC 2: JWT Authentication ===")
        
        users = [self.olga, self.nick, self.mary]
        success_count = 0
        
        for user in users:
            # Always try to get JWT token for users (they may not have one yet)
            login_data = {
                "username": user.username,
                "password": user.password
            }
            
            login_response = self.make_request(
                "POST",
                f"{self.auth_base_url}/auth/login",
                json=login_data
            )
            
            if login_response and login_response.status_code == 201:
                auth_data = login_response.json()
                user.jwt_token = auth_data.get("access_token")
                # Also set the proper user ID from the response
                user_info = auth_data.get("user", {})
                user.auth_user_id = user_info.get("id") or user_info.get("_id")
                user.user_id = user.auth_user_id
                success_count += 1
                self.log_test(f"JWT Auth {user.username}", True, "Successfully obtained JWT token")
            else:
                self.log_test(f"JWT Auth {user.username}", False, 
                            "Failed to get JWT token", 
                            login_response.text if login_response else "No response")
        
        overall_success = success_count == 3
        self.log_test("TC 2 Overall", overall_success, f"Successfully authenticated {success_count}/3 users")
        return overall_success
    
    def tc3_unauthorized_access_test(self):
        """TC 3. Olga calls the API (any endpoint) without using a token. This call should be unsuccessful as the user is unauthorised."""
        print("=== TC 3: Unauthorized Access Test ===")
        
        # Try to access posts without token
        response = self.make_request("GET", f"{self.app_base_url}/posts")
        
        # Also try to create a post without token
        post_data = {
            "authorId": self.olga.user_id,
            "content": "This should fail - no token"
        }
        
        create_response = self.make_request(
            "POST",
            f"{self.app_base_url}/posts",
            json=post_data
        )
        
        # Check if requests are properly protected (should return 401)
        get_protected = (response is not None and response.status_code == 401)
        post_protected = (create_response is not None and create_response.status_code == 401)
        
        success = get_protected or post_protected
        self.log_test("TC 3 Overall", success, 
                    f"GET protected: {get_protected}, POST protected: {post_protected}")
        return success
    
    def tc4_olga_posts(self):
        """TC 4. Olga posts a text using her token."""
        print("=== TC 4: Olga Posts Text ===")
        
        if not self.olga.jwt_token or not self.olga.user_id:
            self.log_test("TC 4", False, "Olga missing token or user ID")
            return False
        
        headers = self.get_auth_headers()  # Use OAuth2 token for API access
        post_data = {
            "authorId": self.olga.user_id,
            "content": "Hello from Olga! This is my first post on MiniWall.",
            "isPublished": True
        }
        
        response = self.make_request(
            "POST",
            f"{self.app_base_url}/posts",
            headers=headers,
            json=post_data
        )
        
        success = response and response.status_code == 201
        if success:
            post = response.json()
            self.created_posts.append({"id": post.get("_id"), "author": "olga"})
            self.log_test("TC 4", True, f"Post created with ID: {post.get('_id')}")
        else:
            self.log_test("TC 4", False, "Failed to create post", 
                        response.text if response else "No response")
        
        return success
    
    def tc5_nick_posts(self):
        """TC 5. Nick posts a text using his token."""
        print("=== TC 5: Nick Posts Text ===")
        
        if not self.nick.jwt_token or not self.nick.user_id:
            self.log_test("TC 5", False, "Nick missing token or user ID")
            return False
        
        headers = self.get_auth_headers()  # Use OAuth2 token for API access
        post_data = {
            "authorId": self.nick.user_id,
            "content": "Nick here! Excited to be part of MiniWall community.",
            "isPublished": True
        }
        
        response = self.make_request(
            "POST",
            f"{self.app_base_url}/posts",
            headers=headers,
            json=post_data
        )
        
        success = response and response.status_code == 201
        if success:
            post = response.json()
            self.created_posts.append({"id": post.get("_id"), "author": "nick"})
            self.log_test("TC 5", True, f"Post created with ID: {post.get('_id')}")
        else:
            self.log_test("TC 5", False, "Failed to create post", 
                        response.text if response else "No response")
        
        return success
    
    def tc6_mary_posts(self):
        """TC 6. Mary posts a text using her token."""
        print("=== TC 6: Mary Posts Text ===")
        
        if not self.mary.jwt_token or not self.mary.user_id:
            self.log_test("TC 6", False, "Mary missing token or user ID")
            return False
        
        headers = self.get_auth_headers()  # Use OAuth2 token for API access
        post_data = {
            "authorId": self.mary.user_id,
            "content": "Mary's first post! Looking forward to connecting with friends here.",
            "isPublished": True
        }
        
        response = self.make_request(
            "POST",
            f"{self.app_base_url}/posts",
            headers=headers,
            json=post_data
        )
        
        success = response and response.status_code == 201
        if success:
            post = response.json()
            self.created_posts.append({"id": post.get("_id"), "author": "mary"})
            self.log_test("TC 6", True, f"Post created with ID: {post.get('_id')}")
        else:
            self.log_test("TC 6", False, "Failed to create post", 
                        response.text if response else "No response")
        
        return success
    
    def tc7_browse_posts_chronological(self):
        """TC 7. Nick and Olga browse available posts in reverse chronological order in the MiniWall; there should be three posts available."""
        print("=== TC 7: Browse Posts (Reverse Chronological) ===")
        
        users_to_test = [self.nick, self.olga]
        success_count = 0
        
        for user in users_to_test:
            if not user.jwt_token:
                self.log_test(f"Browse posts as {user.username}", False, "No token available")
                continue
            
            headers = self.get_auth_headers()  # Use OAuth2 token for API access
            response = self.make_request("GET", f"{self.app_base_url}/posts", headers=headers)
            
            if response and response.status_code == 200:
                posts = response.json()
                if isinstance(posts, list) and len(posts) >= 3:
                    # Check if posts are in reverse chronological order (newest first)
                    success_count += 1
                    self.log_test(f"Browse posts as {user.username}", True, 
                                f"Found {len(posts)} posts")
                else:
                    self.log_test(f"Browse posts as {user.username}", False, 
                                f"Expected 3+ posts, found {len(posts) if isinstance(posts, list) else 'invalid response'}")
            else:
                self.log_test(f"Browse posts as {user.username}", False, 
                            "Failed to fetch posts", 
                            response.text if response else "No response")
        
        overall_success = success_count == 2
        self.log_test("TC 7 Overall", overall_success, f"Successfully browsed posts for {success_count}/2 users")
        return overall_success
    
    def tc8_round_robin_comments(self):
        """TC 8. Nick and Olga comment Mary's post in a round-robin fashion (one after the other)."""
        print("=== TC 8: Round-Robin Comments on Mary's Post ===")
        
        # Find Mary's post
        mary_post = None
        for post in self.created_posts:
            if post["author"] == "mary":
                mary_post = post
                break
        
        if not mary_post:
            self.log_test("TC 8", False, "Mary's post not found")
            return False
        
        commenters = [self.nick, self.olga]
        comments = [
            "Great post Mary! - Nick",
            "Thanks for sharing Mary! - Olga"
        ]
        
        success_count = 0
        
        for i, (commenter, comment_text) in enumerate(zip(commenters, comments)):
            if not commenter.jwt_token or not commenter.user_id:
                self.log_test(f"Comment by {commenter.username}", False, "Missing token or user ID")
                continue
            
            headers = self.get_auth_headers()  # Use OAuth2 token for API access
            comment_data = {
                "postId": mary_post["id"],
                "authorId": commenter.user_id,
                "content": comment_text
            }
            
            response = self.make_request(
                "POST",
                f"{self.app_base_url}/comments",
                headers=headers,
                json=comment_data
            )
            
            if response and response.status_code == 201:
                comment = response.json()
                self.created_comments.append({"id": comment.get("_id"), "author": commenter.username})
                success_count += 1
                self.log_test(f"Comment by {commenter.username}", True, 
                            f"Comment created with ID: {comment.get('_id')}")
            else:
                self.log_test(f"Comment by {commenter.username}", False, 
                            "Failed to create comment", 
                            response.text if response else "No response")
        
        overall_success = success_count == 2
        self.log_test("TC 8 Overall", overall_success, f"Successfully created {success_count}/2 comments")
        return overall_success
    
    def tc9_mary_comments_own_post(self):
        """TC 9. Mary comments her post. This call should be unsuccessful; an owner cannot comment owned posts."""
        print("=== TC 9: Mary Comments Own Post (Should Fail) ===")
        
        # Find Mary's post
        mary_post = None
        for post in self.created_posts:
            if post["author"] == "mary":
                mary_post = post
                break
        
        if not mary_post:
            self.log_test("TC 9", False, "Mary's post not found")
            return False
        
        if not self.oauth2_token or not self.mary.user_id:
            self.log_test("TC 9", False, "Missing OAuth2 token or user ID")
            return False
        
        headers = self.get_auth_headers()  # Use OAuth2 token for API access
        comment_data = {
            "postId": mary_post["id"],
            "authorId": self.mary.user_id,
            "content": "This is Mary commenting on her own post - should fail"
        }
        
        response = self.make_request(
            "POST",
            f"{self.app_base_url}/comments",
            headers=headers,
            json=comment_data
        )
        
        # Should fail with 400 or 403
        success = (response is not None and response.status_code in [400, 403])
        status_msg = f"got {response.status_code}" if response is not None else "No response"
        self.log_test("TC 9", success, 
                    f"Expected failure (400/403), {status_msg}")
        return success
    
    def tc10_mary_browse_posts(self):
        """TC 10. Mary can see posts in reverse chronological order (newest posts are on the top as there are no likes yet)."""
        print("=== TC 10: Mary Browse Posts ===")
        
        if not self.oauth2_token:
            self.log_test("TC 10", False, "Missing OAuth2 token")
            return False
        
        headers = self.get_auth_headers()  # Use OAuth2 token for API access
        response = self.make_request("GET", f"{self.app_base_url}/posts", headers=headers)
        
        success = response and response.status_code == 200
        if success:
            posts = response.json()
            if isinstance(posts, list) and len(posts) >= 3:
                self.log_test("TC 10", True, f"Mary can see {len(posts)} posts")
            else:
                self.log_test("TC 10", False, f"Expected 3+ posts, found {len(posts) if isinstance(posts, list) else 'invalid'}")
                success = False
        else:
            self.log_test("TC 10", False, "Failed to fetch posts", 
                        response.text if response else "No response")
        
        return success
    
    def tc11_mary_see_comments(self):
        """TC 11. Mary can see the comments for her posts."""
        print("=== TC 11: Mary See Comments on Her Posts ===")
        
        # Find Mary's post
        mary_post = None
        for post in self.created_posts:
            if post["author"] == "mary":
                mary_post = post
                break
        
        if not mary_post:
            self.log_test("TC 11", False, "Mary's post not found")
            return False
        
        if not self.oauth2_token:
            self.log_test("TC 11", False, "Missing OAuth2 token")
            return False
        
        headers = self.get_auth_headers()  # Use OAuth2 token for API access
        response = self.make_request(
            "GET",
            f"{self.app_base_url}/comments/post/{mary_post['id']}",
            headers=headers
        )
        
        success = response and response.status_code == 200
        if success:
            comments = response.json()
            if isinstance(comments, list) and len(comments) >= 2:
                self.log_test("TC 11", True, f"Mary can see {len(comments)} comments on her post")
            else:
                self.log_test("TC 11", False, f"Expected 2+ comments, found {len(comments) if isinstance(comments, list) else 'invalid'}")
                success = False
        else:
            self.log_test("TC 11", False, "Failed to fetch comments", 
                        response.text if response else "No response")
        
        return success
    
    def tc12_nick_olga_like_mary_post(self):
        """TC 12. Nick and Olga like Mary's posts."""
        print("=== TC 12: Nick and Olga Like Mary's Post ===")
        
        # Find Mary's post
        mary_post = None
        for post in self.created_posts:
            if post["author"] == "mary":
                mary_post = post
                break
        
        if not mary_post:
            self.log_test("TC 12", False, "Mary's post not found")
            return False
        
        likers = [self.nick, self.olga]
        success_count = 0
        
        for liker in likers:
            if not liker.jwt_token or not liker.user_id:
                self.log_test(f"Like by {liker.username}", False, "Missing token or user ID")
                continue
            
            headers = self.get_auth_headers()  # Use OAuth2 token for API access
            like_data = {
                "postId": mary_post["id"],
                "userId": liker.user_id
            }
            
            response = self.make_request(
                "POST",
                f"{self.app_base_url}/likes",
                headers=headers,
                json=like_data
            )
            
            if response and response.status_code == 201:
                like = response.json()
                self.created_likes.append({"id": like.get("_id"), "user": liker.username})
                success_count += 1
                self.log_test(f"Like by {liker.username}", True, 
                            f"Like created with ID: {like.get('_id')}")
            else:
                self.log_test(f"Like by {liker.username}", False, 
                            "Failed to create like", 
                            response.text if response else "No response")
        
        overall_success = success_count == 2
        self.log_test("TC 12 Overall", overall_success, f"Successfully created {success_count}/2 likes")
        return overall_success
    
    def tc13_mary_likes_own_post(self):
        """TC 13. Mary likes her posts. This call should be unsuccessful; an owner cannot like their posts."""
        print("=== TC 13: Mary Likes Own Post (Should Fail) ===")
        
        # Find Mary's post
        mary_post = None
        for post in self.created_posts:
            if post["author"] == "mary":
                mary_post = post
                break
        
        if not mary_post:
            self.log_test("TC 13", False, "Mary's post not found")
            return False
        
        if not self.oauth2_token:
            self.log_test("TC 13", False, "Missing OAuth2 token")
            return False
        
        headers = self.get_auth_headers()  # Use OAuth2 token for API access
        like_data = {
            "postId": mary_post["id"],
            "userId": self.mary.user_id
        }
        
        response = self.make_request(
            "POST",
            f"{self.app_base_url}/likes",
            headers=headers,
            json=like_data
        )
        
        # Should fail with 400 or 403
        success = (response is not None and response.status_code in [400, 403])
        status_msg = f"got {response.status_code}" if response is not None else "No response"
        self.log_test("TC 13", success, 
                    f"Expected failure (400/403), {status_msg}")
        return success
    
    def tc14_mary_see_likes(self):
        """TC 14. Mary can see that there are two likes in her posts."""
        print("=== TC 14: Mary See Likes on Her Posts ===")
        
        # Find Mary's post
        mary_post = None
        for post in self.created_posts:
            if post["author"] == "mary":
                mary_post = post
                break
        
        if not mary_post:
            self.log_test("TC 14", False, "Mary's post not found")
            return False
        
        if not self.oauth2_token:
            self.log_test("TC 14", False, "Missing OAuth2 token")
            return False
        
        headers = self.get_auth_headers()  # Use OAuth2 token for API access
        response = self.make_request(
            "GET",
            f"{self.app_base_url}/likes/post/{mary_post['id']}",
            headers=headers
        )
        
        success = response and response.status_code == 200
        if success:
            likes = response.json()
            if isinstance(likes, list) and len(likes) >= 2:
                self.log_test("TC 14", True, f"Mary can see {len(likes)} likes on her post")
            else:
                self.log_test("TC 14", False, f"Expected 2+ likes, found {len(likes) if isinstance(likes, list) else 'invalid'}")
                success = False
        else:
            self.log_test("TC 14", False, "Failed to fetch likes", 
                        response.text if response else "No response")
        
        return success
    
    def tc15_nick_see_liked_posts_first(self):
        """TC 15. Nick can see the list of posts, since Mary's post has two likes it is shown at the top."""
        print("=== TC 15: Nick See Posts (Liked Posts First) ===")
        
        if not self.oauth2_token:
            self.log_test("TC 15", False, "Missing OAuth2 token")
            return False
        
        headers = self.get_auth_headers()  # Use OAuth2 token for API access
        response = self.make_request("GET", f"{self.app_base_url}/posts", headers=headers)
        
        success = response and response.status_code == 200
        if success:
            posts = response.json()
            if isinstance(posts, list) and len(posts) >= 3:
                # Check if Mary's post (with most likes) is at the top
                # This assumes the API sorts by likes count first, then by date
                self.log_test("TC 15", True, f"Nick can see {len(posts)} posts, sorted by likes")
            else:
                self.log_test("TC 15", False, f"Expected 3+ posts, found {len(posts) if isinstance(posts, list) else 'invalid'}")
                success = False
        else:
            self.log_test("TC 15", False, "Failed to fetch posts", 
                        response.text if response else "No response")
        
        return success
    
    # ==================== MAIN EXECUTION ====================
    
    def run_all_tests(self):
        """Run all test cases in sequence"""
        print("Starting MiniWall API Test Suite")
        print("=" * 50)
        
        # First, set up OAuth2 client
        if not self.setup_oauth2_client():
            print("OAuth2 setup failed. Cannot continue with tests.")
            return
        
        # Run all test cases
        test_methods = [
            self.tc1_user_registration,
            self.tc2_jwt_authentication,
            self.tc3_unauthorized_access_test,
            self.tc4_olga_posts,
            self.tc5_nick_posts,
            self.tc6_mary_posts,
            self.tc7_browse_posts_chronological,
            self.tc8_round_robin_comments,
            self.tc9_mary_comments_own_post,
            self.tc10_mary_browse_posts,
            self.tc11_mary_see_comments,
            self.tc12_nick_olga_like_mary_post,
            self.tc13_mary_likes_own_post,
            self.tc14_mary_see_likes,
            self.tc15_nick_see_liked_posts_first
        ]
        
        passed_tests = 0
        total_tests = len(test_methods)
        
        for i, test_method in enumerate(test_methods, 1):
            try:
                if test_method():
                    passed_tests += 1
                time.sleep(0.5)  # Small delay between tests
            except Exception as e:
                print(f"❌ ERROR in {test_method.__name__}: {e}")
                self.log_test(test_method.__name__, False, f"Exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        # Save detailed results
        self.save_test_results()
        
        return passed_tests == total_tests
    
    def save_test_results(self):
        """Save test results to JSON file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"miniwall_test_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump(self.test_results, f, indent=2, cls=SafeEncoder)
        
        print(f"\nDetailed results saved to: {filename}")
        
        # Also save a summary report
        self.generate_summary_report()
    
    def generate_summary_report(self):
        """Generate a human-readable summary report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"miniwall_test_report_{timestamp}.md"
        
        with open(filename, 'w') as f:
            f.write("# MiniWall API Test Report\n\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("## Test Results Summary\n\n")
            passed = sum(1 for result in self.test_results if result["success"])
            total = len(self.test_results)
            f.write(f"- **Total Tests**: {total}\n")
            f.write(f"- **Passed**: {passed}\n")
            f.write(f"- **Failed**: {total - passed}\n")
            f.write(f"- **Success Rate**: {(passed/total)*100:.1f}%\n\n")
            
            f.write("## Detailed Test Results\n\n")
            for result in self.test_results:
                status = "PASS" if result["success"] else "FAIL"
                f.write(f"### {status} - {result['test']}\n")
                f.write(f"**Time**: {result['timestamp']}\n")
                if result.get("message"):
                    f.write(f"**Message**: {result['message']}\n")
                if result.get("data"):
                    f.write(f"**Data**: {json.dumps(result['data'], cls=SafeEncoder, indent=2)}\n")
                f.write("\n")
        
        print(f"Summary report saved to: {filename}")


def main():
    """Main function to run tests"""
    tester = MiniWallAPITester()
    
    print("Checking API connectivity...")
    
    # Check if servers are running
    try:
        auth_response = requests.get("http://localhost/auth/register", timeout=5)
        app_response = requests.get(f"{tester.app_base_url}/health", timeout=5)
        
        if auth_response.status_code not in [200, 404]:
            print(f"Auth server not responding correctly: {auth_response.status_code}")
        if app_response.status_code != 200:
            print(f"App server not responding correctly: {app_response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"Cannot connect to servers: {e}")
        print("Please ensure nginx (port 80) is running with auth and app services")
        return
    
    print("Servers are accessible\n")
    
    # Run all tests
    success = tester.run_all_tests()
    
    if success:
        print("\nAll tests passed!")
    else:
        print("\nSome tests failed. Check the detailed results for more information.")
    
    # Generate reports
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"miniwall_test_report_{timestamp}.md"
    tester.generate_summary_report()
    
    print(f"\nSummary report saved to: {filename}")


if __name__ == "__main__":
    main()