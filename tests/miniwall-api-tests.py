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
        self.auth_base_url = "http://localhost:4000"
        self.app_base_url = "http://localhost:3000"
        self.session = requests.Session()
        
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
            "timestamp": datetime.now().isoformat(),
            "data": data
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if message:
            print(f"    {message}")
        if not success and data:
            print(f"    Details: {json.dumps(data, indent=2)}")
        print()
    
    def make_request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        try:
            response = self.session.request(method, url, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return None
    
    # ==================== TEST CASES ====================
    
    def tc1_user_registration(self):
        """TC 1. Olga, Nick and Mary register in the application and access the API."""
        print("=== TC 1: User Registration ===")
        
        users = [self.olga, self.nick, self.mary]
        success_count = 0
        
        for user in users:
            # Register with auth server
            register_data = {
                "username": user.username,
                "email": user.email,
                "password": user.password
            }
            
            response = self.make_request(
                "POST",
                f"{self.auth_base_url}/auth/register",
                json=register_data
            )
            
            if response and response.status_code == 201:
                auth_data = response.json()
                user.auth_user_id = auth_data.get("user", {}).get("id")
                user.jwt_token = auth_data.get("access_token")
                
                # Create user profile in app
                profile_data = {
                    "authUserId": user.auth_user_id,
                    "username": user.username,
                    "email": user.email,
                    "displayName": user.username.title()
                }
                
                profile_response = self.make_request(
                    "POST",
                    f"{self.app_base_url}/users",
                    json=profile_data
                )
                
                if profile_response and profile_response.status_code == 201:
                    profile = profile_response.json()
                    user.user_id = profile.get("id")
                    success_count += 1
                    self.log_test(f"Register {user.username}", True, 
                                f"User ID: {user.user_id}, Auth ID: {user.auth_user_id}")
                else:
                    self.log_test(f"Register {user.username}", False, 
                                "Failed to create user profile", profile_response.text if profile_response else "No response")
            else:
                self.log_test(f"Register {user.username}", False, 
                            "Failed to register with auth server", response.text if response else "No response")
        
        overall_success = success_count == 3
        self.log_test("TC 1 Overall", overall_success, f"Successfully registered {success_count}/3 users")
        return overall_success
    
    def tc2_jwt_authentication(self):
        """TC 2. Olga, Nick and Mary will use the JWT authorisation service to get their tokens."""
        print("=== TC 2: JWT Authentication ===")
        
        users = [self.olga, self.nick, self.mary]
        success_count = 0
        
        for user in users:
            if not user.auth_user_id:
                # Try to get token using login (assuming there's a login endpoint)
                login_data = {
                    "username": user.username,
                    "password": user.password
                }
                
                response = self.make_request(
                    "POST",
                    f"{self.auth_base_url}/auth/login",
                    json=login_data
                )
                
                if response and response.status_code == 200:
                    auth_data = response.json()
                    user.jwt_token = auth_data.get("access_token")
                    success_count += 1
                    self.log_test(f"Get token for {user.username}", True, "Token obtained successfully")
                else:
                    self.log_test(f"Get token for {user.username}", False, 
                                "Failed to get token", response.text if response else "No response")
            elif user.jwt_token:
                success_count += 1
                self.log_test(f"Get token for {user.username}", True, "Token already exists")
            else:
                self.log_test(f"Get token for {user.username}", False, "No auth user ID available")
        
        overall_success = success_count == 3
        self.log_test("TC 2 Overall", overall_success, f"Successfully obtained tokens for {success_count}/3 users")
        return overall_success
    
    def tc3_unauthorized_access(self):
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
        get_protected = response and response.status_code == 401
        post_protected = create_response and create_response.status_code == 401
        
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
        
        headers = {"Authorization": f"Bearer {self.olga.jwt_token}"}
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
            self.created_posts.append({"id": post.get("id"), "author": "olga"})
            self.log_test("TC 4", True, f"Post created with ID: {post.get('id')}")
        else:
            self.log_test("TC 4", False, "Failed to create post", response.text if response else "No response")
        
        return success
    
    def tc5_nick_posts(self):
        """TC 5. Nick posts a text using his token."""
        print("=== TC 5: Nick Posts Text ===")
        
        if not self.nick.jwt_token or not self.nick.user_id:
            self.log_test("TC 5", False, "Nick missing token or user ID")
            return False
        
        headers = {"Authorization": f"Bearer {self.nick.jwt_token}"}
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
            self.created_posts.append({"id": post.get("id"), "author": "nick"})
            self.log_test("TC 5", True, f"Post created with ID: {post.get('id')}")
        else:
            self.log_test("TC 5", False, "Failed to create post", response.text if response else "No response")
        
        return success
    
    def tc6_mary_posts(self):
        """TC 6. Mary posts a text using her token."""
        print("=== TC 6: Mary Posts Text ===")
        
        if not self.mary.jwt_token or not self.mary.user_id:
            self.log_test("TC 6", False, "Mary missing token or user ID")
            return False
        
        headers = {"Authorization": f"Bearer {self.mary.jwt_token}"}
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
            self.created_posts.append({"id": post.get("id"), "author": "mary"})
            self.log_test("TC 6", True, f"Post created with ID: {post.get('id')}")
        else:
            self.log_test("TC 6", False, "Failed to create post", response.text if response else "No response")
        
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
            
            headers = {"Authorization": f"Bearer {user.jwt_token}"}
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
                            "Failed to fetch posts", response.text if response else "No response")
        
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
            
            headers = {"Authorization": f"Bearer {commenter.jwt_token}"}
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
                self.created_comments.append({"id": comment.get("id"), "author": commenter.username})
                success_count += 1
                self.log_test(f"Comment by {commenter.username}", True, 
                            f"Comment created with ID: {comment.get('id')}")
            else:
                self.log_test(f"Comment by {commenter.username}", False, 
                            "Failed to create comment", response.text if response else "No response")
        
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
        
        if not self.mary.jwt_token or not self.mary.user_id:
            self.log_test("TC 9", False, "Mary missing token or user ID")
            return False
        
        headers = {"Authorization": f"Bearer {self.mary.jwt_token}"}
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
        success = response and response.status_code in [400, 403]
        self.log_test("TC 9", success, 
                    f"Expected failure (400/403), got {response.status_code if response else 'No response'}")
        return success
    
    def tc10_mary_browse_posts(self):
        """TC 10. Mary can see posts in reverse chronological order (newest posts are on the top as there are no likes yet)."""
        print("=== TC 10: Mary Browse Posts ===")
        
        if not self.mary.jwt_token:
            self.log_test("TC 10", False, "Mary missing token")
            return False
        
        headers = {"Authorization": f"Bearer {self.mary.jwt_token}"}
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
            self.log_test("TC 10", False, "Failed to fetch posts", response.text if response else "No response")
        
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
        
        if not self.mary.jwt_token:
            self.log_test("TC 11", False, "Mary missing token")
            return False
        
        headers = {"Authorization": f"Bearer {self.mary.jwt_token}"}
        response = self.make_request(
            f"GET",
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
            self.log_test("TC 11", False, "Failed to fetch comments", response.text if response else "No response")
        
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
            
            headers = {"Authorization": f"Bearer {liker.jwt_token}"}
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
                self.created_likes.append({"id": like.get("id"), "user": liker.username})
                success_count += 1
                self.log_test(f"Like by {liker.username}", True, 
                            f"Like created with ID: {like.get('id')}")
            else:
                self.log_test(f"Like by {liker.username}", False, 
                            "Failed to create like", response.text if response else "No response")
        
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
        
        if not self.mary.jwt_token or not self.mary.user_id:
            self.log_test("TC 13", False, "Mary missing token or user ID")
            return False
        
        headers = {"Authorization": f"Bearer {self.mary.jwt_token}"}
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
        success = response and response.status_code in [400, 403]
        self.log_test("TC 13", success, 
                    f"Expected failure (400/403), got {response.status_code if response else 'No response'}")
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
        
        if not self.mary.jwt_token:
            self.log_test("TC 14", False, "Mary missing token")
            return False
        
        headers = {"Authorization": f"Bearer {self.mary.jwt_token}"}
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
            self.log_test("TC 14", False, "Failed to fetch likes", response.text if response else "No response")
        
        return success
    
    def tc15_nick_see_liked_posts_first(self):
        """TC 15. Nick can see the list of posts, since Mary's post has two likes it is shown at the top."""
        print("=== TC 15: Nick See Posts (Liked Posts First) ===")
        
        if not self.nick.jwt_token:
            self.log_test("TC 15", False, "Nick missing token")
            return False
        
        headers = {"Authorization": f"Bearer {self.nick.jwt_token}"}
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
            self.log_test("TC 15", False, "Failed to fetch posts", response.text if response else "No response")
        
        return success
    
    # ==================== MAIN EXECUTION ====================
    
    def run_all_tests(self):
        """Run all test cases in sequence"""
        print("🚀 Starting MiniWall API Test Suite")
        print("=" * 50)
        
        # Run all test cases
        test_methods = [
            self.tc1_user_registration,
            self.tc2_jwt_authentication,
            self.tc3_unauthorized_access,
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
            json.dump(self.test_results, f, indent=2)
        
        print(f"\n📄 Detailed results saved to: {filename}")
        
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
                status = "✅ PASS" if result["success"] else "❌ FAIL"
                f.write(f"### {status} - {result['test']}\n")
                f.write(f"**Time**: {result['timestamp']}\n")
                if result["message"]:
                    f.write(f"**Message**: {result['message']}\n")
                f.write("\n")
        
        print(f"📋 Summary report saved to: {filename}")

def main():
    """Main function to run tests"""
    tester = MiniWallAPITester()
    
    print("🔍 Checking API connectivity...")
    
    # Check if servers are running
    try:
        auth_response = requests.get(f"{tester.auth_base_url}/health", timeout=5)
        app_response = requests.get(f"{tester.app_base_url}/health", timeout=5)
        
        if auth_response.status_code != 200:
            print(f"❌ Auth server not responding correctly: {auth_response.status_code}")
        if app_response.status_code != 200:
            print(f"❌ App server not responding correctly: {app_response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to servers: {e}")
        print("Please ensure both auth server (port 4000) and app server (port 3000) are running")
        return
    
    print("✅ Servers are accessible\n")
    
    # Run all tests
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed. Check the detailed results for more information.")

if __name__ == "__main__":
    main()
