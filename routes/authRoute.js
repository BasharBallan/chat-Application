const express = require("express");
const router = express.Router();

const {
  signupValidator,
  loginValidator,
  adminLoginValidator,
  adminSignupValidator,
  forgotPasswordValidator,
} = require("../utils/validators/authValidator");

const {
  signup,
  login,
  forgotPassword,
  verifyPassResetCode,
  resetPassword,
  AdminSignup,
  Adminlogin,
  refreshToken,
  logout,
  protect,
  getMySessions,
  logoutFromSession,
  logoutFromOtherSessions,
  googleCallbackService,
  googleUnlinkService,
  googleInitService,
  setPasswordService,
} = require("../services/authService");

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & Authorization APIs
 */

/* =====================================================================
   STUDENT SIGNUP
   ===================================================================== */
/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Student Signup
 *     tags: [Auth]
 *     description: Register a new student account. Use the example below for testing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - passwordConfirm
 *             properties:
 *               name:
 *                 type: string
 *                 example: "scsduichsm,"
 *               email:
 *                 type: string
 *                 example: "basharbalcklsnan9@gmail.com"
 *               password:
 *                 type: string
 *                 example: "Pass123@456"
 *               passwordConfirm:
 *                 type: string
 *                 example: "Pass123@456"
 *     responses:
 *       201:
 *         description: Student registered successfully
 *       400:
 *         description: Invalid input data
 */
router.post("/signup", signupValidator, signup);

/* =====================================================================
   LOGIN (STUDENT / DOCTOR) — Updated to match new authService logic
   ===================================================================== */
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Student Login
 *     tags: [Auth]
 *     description: Login using email and password. Includes device detection, session creation, and refresh token rotation.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "doctordndsjvnssnaskcnakl30@example.com"
 *               password:
 *                 type: string
 *                 example: "Doctor12@345"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginValidator, login);

/* =====================================================================
   ADMIN LOGIN
   ===================================================================== */
/**
 * @swagger
 * /api/v1/auth/adminLogin:
 *   post:
 *     summary: Admin Login
 *     tags: [Auth]
 *     description: Login for admin users only. Use the example credentials below for testing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: "sosoad@gmail.com"
 *               password:
 *                 type: string
 *                 example: "Bashar1234@"
 *     responses:
 *       200:
 *         description: Admin login successful
 *       401:
 *         description: Invalid admin credentials
 */
router.post("/adminLogin", adminLoginValidator, Adminlogin);

/* =====================================================================
   ADMIN SIGNUP
   ===================================================================== */
/**
 * @swagger
 * /api/v1/auth/adminSignup:
 *   post:
 *     summary: Admin Signup (one-time use)
 *     tags: [Auth]
 *     description: Create a new admin account. Use the example below for testing.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Bascchar125"
 *               email:
 *                 type: string
 *                 example: "sosocdscad@gmail.com"
 *               password:
 *                 type: string
 *                 example: "Bashar1234@"
 *     responses:
 *       201:
 *         description: Admin created successfully
 *       400:
 *         description: Invalid input data
 */
router.post("/adminSignup", adminSignupValidator, AdminSignup);

/* =====================================================================
   FORGOT PASSWORD
   ===================================================================== */
/**
 * @swagger
 * /api/v1/auth/forgotPassword:
 *   post:
 *     summary: Forgot Password
 *     tags: [Auth]
 *     description: Send a reset code to the user's email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "basharballan9@gmail.com"
 *     responses:
 *       200:
 *         description: Reset code sent successfully
 *       404:
 *         description: Email not found
 */
router.post("/forgotPassword", forgotPasswordValidator, forgotPassword);

/* =====================================================================
   VERIFY RESET CODE
   ===================================================================== */
/**
 * @swagger
 * /api/v1/auth/verifyResetCode:
 *   post:
 *     summary: Verify Reset Code
 *     tags: [Auth]
 *     description: Verify the password reset code sent to the user's email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetCode
 *             properties:
 *               resetCode:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Reset code verified successfully
 *       400:
 *         description: Invalid or expired reset code
 */
router.post("/verifyResetCode", verifyPassResetCode);

/* =====================================================================
   RESET PASSWORD
   ===================================================================== */
/**
 * @swagger
 * /api/v1/auth/resetPassword:
 *   put:
 *     summary: Reset Password
 *     tags: [Auth]
 *     description: Reset the user's password after verifying the reset code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 example: "basharbalan9@gmail.com"
 *               newPassword:
 *                 type: string
 *                 example: "newStrongPassword123"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid request data
 */
router.put("/resetPassword", resetPassword);

/* =====================================================================
   REFRESH TOKEN
   ===================================================================== */
/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh Access Token
 *     tags: [Auth]
 *     description: Generate a new access token using a valid refresh token. Implements refresh token rotation and session validation.
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post("/refresh", refreshToken);

/* =====================================================================
   LOGOUT
   ===================================================================== */
/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout
 *     tags: [Auth]
 *     description: Logout the user and invalidate all active sessions. Clears refresh token cookie.
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", logout);

/* =====================================================================
   SESSION MANAGEMENT (NEW)
   ===================================================================== */

/**
 * @swagger
 * /api/v1/auth/sessions:
 *   get:
 *     summary: Get all active sessions
 *     tags: [Auth]
 *     description: Returns all active login sessions for the authenticated user.
 *     responses:
 *       200:
 *         description: Sessions retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/sessions", protect, getMySessions);

/**
 * @swagger
 * /api/v1/auth/sessions/{sessionId}:
 *   delete:
 *     summary: Logout from a specific session
 *     tags: [Auth]
 *     description: Terminates a specific session by its ID.
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the session to terminate
 *     responses:
 *       200:
 *         description: Session terminated successfully
 *       404:
 *         description: Session not found
 */
router.delete("/sessions/:sessionId", protect, logoutFromSession);

/**
 * @swagger
 * /api/v1/auth/sessions:
 *   delete:
 *     summary: Logout from all other sessions
 *     tags: [Auth]
 *     description: Terminates all sessions except the current one (based on refresh token).
 *     responses:
 *       200:
 *         description: All other sessions terminated
 *       401:
 *         description: Unauthorized
 */
router.delete("/sessions", protect, logoutFromOtherSessions);

/**
 * @swagger
 * /api/v1/auth/google/init:
 *   get:
 *     summary: Initialize Google OAuth (PKCE + State)
 *     tags: [Auth]
 *     description: Generates PKCE parameters (code_verifier, code_challenge) and a secure state token, stores them temporarily, and returns a Google OAuth URL for redirection.
 *     responses:
 *       200:
 *         description: Google OAuth URL generated successfully
 */
router.get("/google/init", googleInitService);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth Callback (PKCE Verification)
 *     tags: [Auth]
 *     description: Handles Google OAuth callback, verifies PKCE + state, exchanges authorization code for tokens, and logs the user in.
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code returned from Google
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: State token returned from Google
 *     responses:
 *       302:
 *         description: Redirects to frontend with access token
 *       400:
 *         description: Invalid or expired OAuth parameters
 */
router.get("/google/callback", googleCallbackService);

/**
 * @swagger
 * /api/v1/auth/unlink/google:
 *   delete:
 *     summary: Unlink Google Account
 *     tags: [Auth]
 *     description: Disconnects Google login from the authenticated user. Requires that the user has manually set a password.
 *     responses:
 *       200:
 *         description: Google account unlinked successfully
 *       400:
 *         description: Google not linked or password not manually set
 *       401:
 *         description: Unauthorized
 */
router.delete("/unlink/google", protect, googleUnlinkService);

/* =====================================================================
   SET PASSWORD (GOOGLE USERS)
   ===================================================================== */
/**
 * @swagger
 * /api/v1/auth/set-password:
 *   post:
 *     summary: Set password for Google-authenticated users
 *     tags: [Auth]
 *     description: Allows users who signed up with Google to manually set a password before unlinking Google.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 example: "Pass123@456"
 *     responses:
 *       200:
 *         description: Password set successfully
 *       400:
 *         description: Invalid password or user already has a password
 *       401:
 *         description: Unauthorized
 */
router.post("/set-password", protect, setPasswordService);

module.exports = router;
