// MongoDB initialization script for Main App
db = db.getSiblingDB('miniwall');

// Create collections
db.createCollection('users');
db.createCollection('posts');
db.createCollection('comments');
db.createCollection('likes');

// Create indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.posts.createIndex({ "authorId": 1 });
db.posts.createIndex({ "createdAt": -1 });
db.comments.createIndex({ "postId": 1 });
db.comments.createIndex({ "authorId": 1 });
db.likes.createIndex({ "postId": 1, "userId": 1 }, { unique: true });

print('MiniWall App database initialized successfully');
