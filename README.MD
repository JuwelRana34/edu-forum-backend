# **Edu Forum BD Backend**

This project serves as the backend for **Edu Forum BD**, a platform designed for users to share posts, engage in discussions, and interact through comments. The backend is built with **Node.js** and uses **MongoDB** as its database, featuring secure JWT-based authentication.

---

## **Live Site**

- **Firebase**: [Edu Forum BD](https://edu-forum-bd.web.app)
- **Netlify**: [Edu Forum BD](https://edu-forum.netlify.app/)

---

## **Features**

### **Authentication and Authorization**

- JWT-based authentication with secure HTTP-only cookies.
- Role-based access control (Admin/User).

### **User Management**

- User registration and login.
- Promote users to admin roles (admin-only).
- Fetch user-specific details, including recent posts and profile.

### **Post Management**

- Create posts with tags.
- Limitations on post count for non-gold members.
- Fetch posts with filters (tags, search keywords) and sort by popularity or creation date.

### **Admin Features**

- Admins can manage users,
- promote users to admin roles,
- create/manage tags 
-also take action comment report and admin can delete the comment if report is valid.

### **Tag Management**

- Add and retrieve tags for categorizing posts.
- Filter posts by tags.

### **Comment Management**

- View all comments associated with a post.
- Aggregate post details with comments for better insights.

### **Dynamic Insights**

- Real-time statistics for total users, posts, and comments.

### **Secure Middleware**

- Authentication middleware to verify JWT tokens.
- Admin-only middleware for privileged operations.

### **Payment Integration**

- Ready integration with Stripe for premium features.

### **Pagination and Scalability**

- Pagination support for fetching users and posts.

### **Sorting and Filtering**

- Sort posts by popularity or filter posts by tags and keywords.

---

## **Technologies Used**

- **Node.js** with **Express.js** for backend development.
- **MongoDB** for database management.
- **JWT** for secure authentication.
- **Stripe** for payment processing.
- **Cors** for cross-origin resource sharing.
- **Cookie-parser** for managing cookies.

---

## **API Overview**

### **Authentication APIs**

- `POST /jwt` - Generate a JWT token for a user.
- `POST /logOut` - Clear the authentication token.

### **User APIs**

- `POST /user` - Register a new user.
- `GET /user` - Fetch user details (protected).
- `GET /user/recentPost` - Fetch recent posts by a user (protected).
- `GET /users` - Fetch paginated users (admin-only).

### **Admin APIs**

- `PUT /makeAdmin` - Promote a user to admin role (admin-only).
- `GET /admin/:email` - Check if a user is an admin (protected).

### **Post APIs**

- `POST /post` - Create a new post (protected).
- `GET /AllPost` - Fetch all posts with optional filters.
- `GET /sortByPopularity` - Sort posts by popularity.

### **Tag APIs**

- `POST /tag` - Add a new tag (admin-only).
- `GET /tag` - Retrieve all tags.

### **Statistics API**

- `GET /info-full-web` - Retrieve total users, posts, and comments.

---

## **Environment Variables**

To run the project locally, set the following environment variables:

```
DB_UserName=your_mongodb_username
DB_Pass=your_mongodb_password
jwt_secret=your_jwt_secret
PAYMENT_SECRET=your_stripe_secret_key
NODE_ENV=development
