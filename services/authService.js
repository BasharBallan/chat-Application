
const mongoose = require("mongoose");
const crypto = require("crypto");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const asyncHandler = require("express-async-handler");
const ApiError = require("../utils/apiError");
const sendEmail = require("../utils/sendEmail");

const createToken = require("../utils/createToken");
const User = require("../models/userModel");
const OAuthTemp = require("../models/oauthTempModel");

const getMessage = require("../utils/getMessage");
const UserSession = require("../models/userSessionModel");

const { getRealIp, getGeoLocation } = require("../utils/network");
const logger = require("../utils/logger");


// ======================================================================
// TOKEN HELPERS (Access / Refresh Tokens + Session Creation)
// ======================================================================

// Create short-lived access token
const createAccessToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });

// Create long-lived refresh token
const createRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });

// ======================================================================
// CREATE SESSION (Refresh Token Rotation)
// ======================================================================
module.exports.createSession = async (userId, refreshToken, req) => {
  try {
    logger.info("Creating new session", {
      meta: {
        userId, 
        device: req.headers["user-agent"],
        ip: req.ip,
        correlationId: req.correlationId
      }
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    const expiresInMs =
      (process.env.JWT_REFRESH_EXPIRES_IN_DAYS
        ? Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS)
        : 30) *
      24 * 60 * 60 * 1000;

    const session = await UserSession.create({
      user: userId, 
      refreshTokenHash,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      expiresAt: new Date(Date.now() + expiresInMs),
    });

    logger.info("Session created successfully", {
      meta: {
        userId,
        sessionId: session._id,
        correlationId: req.correlationId
      }
    });

    return session;

  } catch (err) {
    logger.error("Session creation failed", {
      meta: {
        userId,
        error: err.message,
        correlationId: req.correlationId
      }
    });
    throw err;
  }
};

// Set refresh token cookie (HTTP-only)
module.exports.setRefreshTokenCookie = (res, refreshToken) => {
  const maxAgeMs =
    (process.env.JWT_REFRESH_EXPIRES_IN_DAYS
      ? Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS)
      : 30) *
    24 * 60 * 60 * 1000;

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: maxAgeMs,
  });
};


// ======================================================================
// DEVICE ALERT SYSTEM (Detect new device/IP and send email)
// ======================================================================

exports.checkNewDeviceAndSendAlert = async (userId, normalizedUA, ip, req) => {

  try {
    logger.info("Device check started", {
      meta: {
        userId,
        device: normalizedUA,
        ip,
        correlationId: req.correlationId
      }
    });

    const existingSession = await UserSession.findOne({
      user: userId,
      userAgent: normalizedUA,
      ip,
    });

    if (existingSession) {
      logger.info("Device recognized (no alert needed)", {
        meta: {
          userId,
          device: normalizedUA,
          ip,
          correlationId: req.correlationId
        }
      });
      return;
    }

    logger.warn("New device detected", {
      meta: {
        userId,
        device: normalizedUA,
        ip,
        correlationId: req.correlationId
      }
    });

    const user = await User.findById(userId);
    if (!user) return;

    // Send email in background
    setImmediate(() => {
      sendEmail({
        email: user.email,
        subject: "New Login Detected",
        html: `
          <h2>New Login Detected</h2>
          <p>Hello ${user.name},</p>
          <p>A new login to your account was detected:</p>
          <ul>
            <li><strong>Device:</strong> ${normalizedUA}</li>
            <li><strong>IP:</strong> ${ip}</li>
            <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p>If this wasn't you, please reset your password immediately.</p>
        `,
      })
        .then(() => {
          logger.info("Device alert email sent", {
            meta: {
              userId,
              email: user.email,
              correlationId: req.correlationId
            }
          });
        })
        .catch((err) => {
          logger.error("Device alert email failed", {
            meta: {
              userId,
              error: err.message,
              correlationId: req.correlationId
            }
          });
        });
    });
  } catch (err) {
    logger.error("Device check failed", {
      meta: {
        userId,
        error: err.message,
        correlationId: req.correlationId
      }
    });
  }
};


// ======================================================================
// AUTH: STUDENT SIGNUP
// ======================================================================

// ------------------------------------------------------
// @desc    Student Signup
// @route   POST /api/v1/auth/signup
// @access  Public
// ------------------------------------------------------
exports.signup = asyncHandler(async (req, res, next) => {
  const { name, email, password, studentNumber, year, semester } = req.body;

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      status: "fail",
      message: "Email already in use",
    });
  }

  // Create student account
  const student = await User.create({
    name,
    email,
    password,
    role: "student",
    studentData: {
      studentNumber,
      year,
      semester,
    },
  });

  // Generate tokens + session
  const accessToken = createAccessToken(student._id);
  const refreshToken = createRefreshToken(student._id);
  await exports.createSession(student._id, refreshToken, req);

  exports.setRefreshTokenCookie(res, refreshToken);

  student.password = undefined;

  res.status(201).json({
    status: "success",
    message: "Signup successful",
    data: student,
    token: accessToken,
  });
});


// ======================================================================
// AUTH: STUDENT LOGIN
// ======================================================================
// ------------------------------------------------------
// @desc    Student Login
// @route   POST /api/v1/auth/login
// @access  Public
// ------------------------------------------------------
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  logger.info("Login attempt", {
    meta: {
      email,
      ip: req.ip,
      device: req.headers["user-agent"],
      correlationId: req.correlationId
    }
  });

  // 1) Find user
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return next(new ApiError("Incorrect email or password", 401));
  }

  // 2) Validate password
  const isCorrectPassword = await bcrypt.compare(password, user.password);
  if (!isCorrectPassword) {
    return next(new ApiError("Incorrect email or password", 401));
  }

  // 3) Create tokens
  const accessToken = createAccessToken(user._id);
  const refreshToken = createRefreshToken(user._id);

  // 4) Create fingerprint
  const fingerprint = refreshToken.slice(0, 12);

  // 5) Fast IP
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "0.0.0.0";

  // 6) Device
  const rawUA = req.headers["user-agent"] || "Unknown Device";
  const normalizedUA = rawUA.slice(0, 40);

  // 7) Hash refresh token
  const refreshTokenHash = await bcrypt.hash(refreshToken, 8);

  // 8) Create session (blocking to ensure refresh works)
const newSession = await UserSession.create({

    user: user._id,
    refreshTokenHash,
    fingerprint,
    userAgent: normalizedUA,
    ip,
    lastUsedAt: new Date(),
    expiresAt: new Date(
      Date.now() +
        parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || "30") *
          24 * 60 * 60 * 1000
    ),
  });

  logger.info("Session created", {
    meta: {
      userId: user._id,
      sessionId: newSession.insertedId,
      ip,
      device: normalizedUA,
      correlationId: req.correlationId
    }
  });

  // 9) Set cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:
      parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || "30") *
      24 * 60 * 60 * 1000,
  });

  user.password = undefined;

  logger.info("Login successful", {
    meta: {
      userId: user._id,
      ip,
      device: normalizedUA,
      correlationId: req.correlationId
    }
  });

  res.status(200).json({
    status: "success",
    message: "Logged in successfully.",
    data: user,
    token: accessToken,
  });
});




// ======================================================================
// AUTH: ADMIN SIGNUP
// ======================================================================

// ------------------------------------------------------
// @desc    Create Admin (one-time setup)
// @route   POST /api/v1/auth/adminSignup
// @access  Public (should be removed after first use)
// ------------------------------------------------------
exports.AdminSignup = asyncHandler(async (req, res, next) => {
  const adminUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: "admin",
  });

  const accessToken = createAccessToken(adminUser._id);
  const refreshToken = createRefreshToken(adminUser._id);
 await exports.createSession(adminUser._id, refreshToken, req);

  exports.setRefreshTokenCookie(res, refreshToken);

  res.status(201).json({
    status: "success",
    message: getMessage("admin_signup_success", req.lang),
    data: adminUser,
    token: accessToken,
  });
});


// ======================================================================
// AUTH: ADMIN LOGIN
// ======================================================================

// ------------------------------------------------------
// @desc    Admin Login
// @route   POST /api/v1/auth/adminLogin
// @access  Public
// ------------------------------------------------------
exports.Adminlogin = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const admin = await User.findOne({ email, role: "admin" }).select("+password");
  if (!admin) {
    return next(new ApiError("Incorrect email or password", 401));
  }

  const isCorrectPassword = await bcrypt.compare(password, admin.password);
  if (!isCorrectPassword) {
    return next(new ApiError("Incorrect email or password", 401));
  }

  const accessToken = jwt.sign(
    { userId: admin._id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { userId: admin._id, role: admin.role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  );

  const userAgent = req.headers["user-agent"] || "Unknown Device";
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    "Unknown IP";

  const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

  await UserSession.create({
    user: admin._id,
    refreshTokenHash,
    userAgent,
    ip,
    expiresAt: new Date(
      Date.now() +
        parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || "30") *
          24 * 60 * 60 * 1000
    ),
  });

await exports.checkNewDeviceAndSendAlert(admin._id, userAgent, ip, req);


  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:
      parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || "30") *
      24 * 60 * 60 * 1000,
  });

  admin.password = undefined;

  res.status(200).json({
    status: "success",
    message: "Admin logged in successfully.",
    data: admin,
    token: accessToken,
  });
});


// ======================================================================
// MIDDLEWARE: PROTECT ROUTES
// ======================================================================
// ------------------------------------------------------
// @desc    Protect routes (JWT Authentication)
// @access  Private
// ------------------------------------------------------
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Extract token from Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  // Log: access attempt
  logger.info("Protect: access attempt", {
    meta: {
      hasToken: !!token,
      ip: req.ip,
      device: req.headers["user-agent"],
      correlationId: req.correlationId
    }
  });

  if (!token) {
    logger.warn("Protect failed: no token provided", {
      meta: { correlationId: req.correlationId }
    });
    return next(new ApiError(getMessage("not_logged_in", req.lang), 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);

    logger.info("Protect: token verified", {
      meta: {
        userId: decoded.userId,
        correlationId: req.correlationId
      }
    });

  } catch (err) {
    logger.warn("Protect failed: invalid token", {
      meta: {
        error: err.message,
        correlationId: req.correlationId
      }
    });
    return next(new ApiError(getMessage("invalid_credentials", req.lang), 401));
  }

  // Check if user still exists
  const currentUser = await User.findById(decoded.userId);
  if (!currentUser) {
    logger.warn("Protect failed: user no longer exists", {
      meta: {
        userId: decoded.userId,
        correlationId: req.correlationId
      }
    });
    return next(new ApiError(getMessage("user_not_exist", req.lang), 401));
  }

  // Check if password changed after token was issued
  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );

    if (passChangedTimestamp > decoded.iat) {
      logger.warn("Protect failed: password changed after token issued", {
        meta: {
          userId: currentUser._id,
          correlationId: req.correlationId
        }
      });
      return next(new ApiError(getMessage("password_changed", req.lang), 401));
    }
  }

  // Log: access granted
  logger.info("Protect: access granted", {
    meta: {
      userId: currentUser._id,
      role: currentUser.role,
      correlationId: req.correlationId
    }
  });

  req.user = currentUser;
  next();
});


// ======================================================================
// REFRESH TOKEN (ROTATION)
// ======================================================================
// ------------------------------------------------------
// @desc    Refresh Access Token (Token Rotation)
// @route   POST /api/v1/auth/refresh
// @access  Public
// ------------------------------------------------------
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const oldRefreshToken = req.cookies?.refreshToken;

  logger.info("Refresh token attempt", {
    meta: {
      hasToken: !!oldRefreshToken,
      ip: req.ip,
      device: req.headers["user-agent"],
      correlationId: req.correlationId
    }
  });

  if (!oldRefreshToken) {
    return next(new ApiError(getMessage("not_logged_in", req.lang), 401));
  }

  // 1) Verify refresh token
  let payload;
  try {
    payload = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);

    logger.info("Refresh: refresh token verified", {
      meta: {
        userId: payload.userId,
        correlationId: req.correlationId
      }
    });

  } catch (err) {
    return next(new ApiError(getMessage("invalid_credentials", req.lang), 401));
  }

  // 2) Extract fingerprint
  const fingerprint = oldRefreshToken.slice(0, 12);

  // 3) Find session by fingerprint
  const session = await UserSession.findOne({
    user: payload.userId,
    fingerprint
  });

  if (!session) {
    logger.warn("Refresh failed: session not found (token misuse)", {
      meta: {
        userId: payload.userId,
        correlationId: req.correlationId
      }
    });
    return next(new ApiError(getMessage("not_logged_in", req.lang), 401));
  }

  // 4) Compare refresh token
  const isMatch = await bcrypt.compare(oldRefreshToken, session.refreshTokenHash);
  if (!isMatch) {
    return next(new ApiError(getMessage("not_logged_in", req.lang), 401));
  }

  // 5) Delete old session
  await UserSession.deleteOne({ _id: session._id });

  logger.info("Refresh: old session deleted", {
    meta: {
      userId: payload.userId,
      sessionId: session._id,
      correlationId: req.correlationId
    }
  });

  // 6) Create new tokens
  const newAccessToken = createAccessToken(payload.userId);
  const newRefreshToken = createRefreshToken(payload.userId);
  const newFingerprint = newRefreshToken.slice(0, 12);

  // 7) Create new session
  const newSession = await UserSession.collection.insertOne({
    user: payload.userId,
    refreshTokenHash: await bcrypt.hash(newRefreshToken, 8),
    fingerprint: newFingerprint,
    userAgent: req.headers["user-agent"]?.slice(0, 40),
    ip: req.ip,
    lastUsedAt: new Date(),
    expiresAt: new Date(
      Date.now() +
        parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || "30") *
          24 * 60 * 60 * 1000
    ),
  });

  logger.info("Refresh: new session created", {
    meta: {
      userId: payload.userId,
      sessionId: newSession.insertedId,
      correlationId: req.correlationId
    }
  });

  // 8) Set new cookie
  setRefreshTokenCookie(res, newRefreshToken);

  logger.info("Refresh token successful", {
    meta: {
      userId: payload.userId,
      correlationId: req.correlationId
    }
  });

  res.status(200).json({
    status: "success",
    token: newAccessToken,
  });
});


// ======================================================================
// MIDDLEWARE: ROLE-BASED AUTHORIZATION
// ======================================================================
exports.allowedTo = (...roles) =>
  asyncHandler(async (req, res, next) => {

    logger.info("Authorization check", {
      meta: {
        userId: req.user?._id,
        userRole: req.user?.role,
        allowedRoles: roles,
        correlationId: req.correlationId
      }
    });

    if (!roles.includes(req.user.role)) {
      logger.warn("Authorization failed: insufficient permissions", {
        meta: {
          userId: req.user._id,
          userRole: req.user.role,
          requiredRoles: roles,
          correlationId: req.correlationId
        }
      });

      return next(new ApiError(getMessage("unauthorized", req.lang), 403));
    }

    logger.info("Authorization success", {
      meta: {
        userId: req.user._id,
        role: req.user.role,
        correlationId: req.correlationId
      }
    });

    next();
  });



// ======================================================================
// LOGOUT (ALL SESSIONS)
// ======================================================================
// ------------------------------------------------------
// @desc    Logout (invalidate all sessions for user)
// @route   POST /api/v1/auth/logout
// @access  Public
// ------------------------------------------------------
exports.logout = asyncHandler(async (req, res, next) => {
  const refreshToken = req.cookies && req.cookies.refreshToken;

  // Log: logout attempt
  logger.info("Logout attempt", {
    meta: {
      hasToken: !!refreshToken,
      ip: req.ip,
      device: req.headers["user-agent"],
      correlationId: req.correlationId
    }
  });

  if (refreshToken) {
    try {
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET
      );

      // Log: token verified
      logger.info("Logout: refresh token verified", {
        meta: {
          userId: payload.userId,
          correlationId: req.correlationId
        }
      });

      // Delete all sessions for this user
      const deleted = await UserSession.deleteMany({ user: payload.userId });

      // Log: sessions deleted
      logger.info("Logout: all sessions invalidated", {
        meta: {
          userId: payload.userId,
          deletedSessions: deleted.deletedCount,
          correlationId: req.correlationId
        }
      });

    } catch (err) {
      // Log: invalid token
      logger.warn("Logout: invalid refresh token", {
        meta: {
          error: err.message,
          correlationId: req.correlationId
        }
      });
    }
  } else {
    // Log: no token found
    logger.warn("Logout attempt without refresh token", {
      meta: {
        correlationId: req.correlationId
      }
    });
  }

  // Clear cookie
  res.clearCookie("refreshToken");

  // Log: logout success
  logger.info("Logout successful", {
    meta: {
      correlationId: req.correlationId
    }
  });

  res.status(200).json({
    status: "success",
    message: getMessage("logout_success", req.lang) || "Logged out successfully",
  });
});



// ======================================================================
// FORGOT PASSWORD (SEND RESET CODE)
// ======================================================================

// ------------------------------------------------------
// @desc    Send password reset code to email
// @route   POST /api/v1/auth/forgotPassword
// @access  Public
// ------------------------------------------------------
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new ApiError(getMessage("no_user_with_email", req.lang), 404));
  }

  if (user.lastPasswordResetRequest && Date.now() - user.lastPasswordResetRequest < 60 * 1000) {
  return next(new ApiError("Please wait before requesting another code", 429));
  }

  user.lastPasswordResetRequest = Date.now();

  // Generate reset code
  const resetCode = crypto.randomInt(100000, 999999).toString();

  const hashedResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");

  user.passwordResetCode = hashedResetCode;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;
  await user.save();

  // Email template
  const htmlMessage = `
    <div style="font-family: Arial; padding: 20px;">
      <h2>Password Reset Code</h2>
      <p>Your reset code is:</p>
      <h1>${resetCode}</h1>
      <p>Valid for 10 minutes.</p>
    </div>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset code",
      html: htmlMessage,
    });
  } catch (err) {
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;
    await user.save();
    return next(new ApiError(getMessage("email_send_error", req.lang), 500));
  }

  res.status(200).json({
    status: "success",
    message: getMessage("reset_code_sent", req.lang),
  });
});


// ======================================================================
// VERIFY RESET CODE
// ======================================================================

// ------------------------------------------------------
// @desc    Verify password reset code
// @route   POST /api/v1/auth/verifyResetCode
// @access  Public
// ------------------------------------------------------
exports.verifyPassResetCode = asyncHandler(async (req, res, next) => {
  const { email, resetCode } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError(getMessage("no_user_with_email", req.lang), 404));
  }

  // Too many attempts
  if (user.passwordResetAttempts >= 5) {
    return next(new ApiError("Too many attempts, try again later", 429));
  }

  // Hash the code
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");

  // Check code + expiration
  if (
    user.passwordResetCode !== hashedResetCode ||
    user.passwordResetExpires < Date.now()
  ) {
    user.passwordResetAttempts += 1;
    await user.save();
    return next(new ApiError(getMessage("reset_code_invalid", req.lang), 400));
  }

  // Success
  user.passwordResetVerified = true;
  user.passwordResetAttempts = 0; // reset attempts
  await user.save();

  res.status(200).json({
    status: "success",
    message: getMessage("reset_code_verified", req.lang),
  });
});
// ======================================================================
// RESET PASSWORD
// ======================================================================

// ------------------------------------------------------
// @desc    Reset password after verification
// @route   POST /api/v1/auth/resetPassword
// @access  Public
// ------------------------------------------------------
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError(getMessage("no_user_with_email", req.lang), 404));
  }

  // Ensure reset code was verified
  if (!user.passwordResetVerified) {
    return next(new ApiError(getMessage("reset_code_not_verified", req.lang), 400));
  }

  // Update password
  user.password = newPassword;
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = undefined;
  user.passwordResetAttempts = 0;
  await user.save();

  // Generate new tokens
  const accessToken = createAccessToken(user._id);
  const newRefreshToken = createRefreshToken(user._id);

  // Create new session
  await exports.createSession(user._id, newRefreshToken, req);

  // Set refresh token cookie
  setRefreshTokenCookie(res, newRefreshToken);

  res.status(200).json({
    status: "success",
    message: getMessage("password_reset_success", req.lang),
    token: accessToken,
  });
});


// ======================================================================
// GET ALL ACTIVE SESSIONS
// ======================================================================

// ------------------------------------------------------
// @desc    Get all active sessions for current user
// @route   GET /api/v1/auth/sessions
// @access  Private
// ------------------------------------------------------
exports.getMySessions = asyncHandler(async (req, res, next) => {
  // Fetch all sessions for this user
  const sessions = await UserSession.find({ user: req.user._id })
    .select("-refreshTokenHash")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: sessions.length,
    data: sessions,
  });
});


// ======================================================================
// LOGOUT FROM SPECIFIC SESSION
// ======================================================================

// ------------------------------------------------------
// @desc    Logout from a specific session
// @route   DELETE /api/v1/auth/sessions/:sessionId
// @access  Private
// ------------------------------------------------------
exports.logoutFromSession = asyncHandler(async (req, res, next) => {
  const sessionId = req.params.sessionId;

  // Log: attempt to delete specific session
  logger.info("Session delete attempt", {
    meta: {
      userId: req.user._id,
      sessionId,
      ip: req.ip,
      device: req.headers["user-agent"],
      correlationId: req.correlationId
    }
  });

  // Ensure session belongs to current user
  const session = await UserSession.findOne({
    _id: sessionId,
    user: req.user._id,
  });

  if (!session) {
    logger.warn("Session delete failed: session not found or not owned by user", {
      meta: {
        userId: req.user._id,
        sessionId,
        correlationId: req.correlationId
      }
    });

    return next(new ApiError("Session not found", 404));
  }

  // Delete session
  await UserSession.deleteOne({ _id: sessionId });

  // Log: session deleted
  logger.info("Session deleted successfully", {
    meta: {
      userId: req.user._id,
      sessionId,
      correlationId: req.correlationId
    }
  });

  res.status(200).json({
    status: "success",
    message: "Session terminated successfully",
  });
});

// ======================================================================
// LOGOUT FROM ALL OTHER SESSIONS
// ======================================================================
// @desc    Logout from all sessions except current
// @route   DELETE /api/v1/auth/sessions
// @access  Private
// ------------------------------------------------------
exports.logoutFromOtherSessions = asyncHandler(async (req, res, next) => {
  const refreshToken = req.cookies.refreshToken;

  // Log: attempt
  logger.info("Logout from other sessions attempt", {
    meta: {
      userId: req.user._id,
      hasToken: !!refreshToken,
      ip: req.ip,
      device: req.headers["user-agent"],
      correlationId: req.correlationId
    }
  });

  if (!refreshToken) {
    logger.warn("Logout from other sessions failed: no refresh token", {
      meta: { correlationId: req.correlationId }
    });
    return next(new ApiError("Not logged in", 401));
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    logger.info("Logout from other sessions: refresh token verified", {
      meta: {
        userId: payload.userId,
        correlationId: req.correlationId
      }
    });

  } catch (err) {
    logger.warn("Logout from other sessions failed: invalid refresh token", {
      meta: {
        error: err.message,
        correlationId: req.correlationId
      }
    });
    return next(new ApiError("Invalid credentials", 401));
  }

  // Find current session
  const sessions = await UserSession.find({ user: payload.userId });

  let currentSession = null;
  for (const session of sessions) {
    const isMatch = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (isMatch) {
      currentSession = session;
      break;
    }
  }

  if (!currentSession) {
    logger.warn("Logout from other sessions failed: current session not found", {
      meta: {
        userId: payload.userId,
        correlationId: req.correlationId
      }
    });
    return next(new ApiError("Not logged in", 401));
  }

  // Delete all other sessions
  const deleted = await UserSession.deleteMany({
    user: payload.userId,
    _id: { $ne: currentSession._id }
  });

  logger.info("Other sessions deleted", {
    meta: {
      userId: payload.userId,
      currentSessionId: currentSession._id,
      deletedSessions: deleted.deletedCount,
      correlationId: req.correlationId
    }
  });

  res.status(200).json({
    status: "success",
    message: "All other sessions terminated successfully",
  });
});


// ======================================================================
// GOOGLE OAUTH CALLBACK (PKCE + STATE)
// ======================================================================
// @desc    Handle Google OAuth callback, verify PKCE + state, exchange code
// @route   GET /api/v1/auth/google/callback
// @access  Public
// ----------------------------------------------------------------------
exports.googleCallbackService = asyncHandler(async (req, res, next) => {
  const { code, state } = req.query;

  logger.info("Google OAuth callback received", {
    meta: {
      codeProvided: !!code,
      stateProvided: !!state,
      correlationId: req.correlationId
    }
  });

  if (!code || !state) {
    return next(new ApiError("Invalid OAuth callback parameters", 400));
  }

  // 1) Validate state
  const temp = await OAuthTemp.findOne({ state });

  logger.info("OAuthTemp lookup result", {
    meta: {
      found: !!temp,
      state,
      correlationId: req.correlationId
    }
  });

  if (!temp) {
    return next(new ApiError("Invalid or expired OAuth state", 400));
  }

  const codeVerifier = temp.codeVerifier;

  // 2) Exchange code for tokens
  logger.info("Exchanging code for tokens", {
    meta: {
      state,
      hasCodeVerifier: !!codeVerifier,
      correlationId: req.correlationId
    }
  });

  const tokenResponse = await axios.post(
    "https://oauth2.googleapis.com/token",
    {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  logger.info("Google token exchange successful", {
    meta: {
      hasIdToken: !!tokenResponse.data?.id_token,
      correlationId: req.correlationId
    }
  });

  const { id_token } = tokenResponse.data;
  const googleUser = jwt.decode(id_token);

  logger.info("Decoded Google user", {
    meta: {
      email: googleUser?.email,
      sub: googleUser?.sub,
      correlationId: req.correlationId
    }
  });

  if (!googleUser || !googleUser.email) {
    return next(new ApiError("Failed to retrieve Google user info", 400));
  }

  // 3) Find or create user
  let user = await User.findOne({ email: googleUser.email });

  logger.info("User lookup result", {
    meta: {
      exists: !!user,
      email: googleUser.email,
      correlationId: req.correlationId
    }
  });

  if (!user) {
    logger.info("Creating new Google user", {
      meta: {
        email: googleUser.email,
        correlationId: req.correlationId
      }
    });

    user = await User.create({
      name: googleUser.name,
      email: googleUser.email,
      googleId: googleUser.sub,
      provider: "google",
      password: crypto.randomBytes(20).toString("hex"),
      passwordManuallySet: false,
    });
  } else if (!user.googleId) {
    logger.info("Linking Google account to existing user", {
      meta: {
        userId: user._id,
        correlationId: req.correlationId
      }
    });

    user.googleId = googleUser.sub;
    user.provider = "google";
    await user.save();
  }

  // 4) Generate tokens
  const accessToken = createAccessToken(user._id);
  const refreshToken = createRefreshToken(user._id);

  // 5) Create session
  logger.info("Creating session for Google user", {
    meta: {
      userId: user._id,
      correlationId: req.correlationId
    }
  });

await module.exports.createSession(user._id, refreshToken, req);


  // 6) Set cookie
  logger.info("Setting refresh token cookie", {
    meta: {
      userId: user._id,
      correlationId: req.correlationId
    }
  });
module.exports.setRefreshTokenCookie(res, refreshToken);

  // 7) Delete temp entry
  logger.info("Deleting OAuthTemp entry", {
    meta: {
      tempId: temp._id,
      correlationId: req.correlationId
    }
  });

  await OAuthTemp.deleteOne({ _id: temp._id });

  // 8) Redirect
  logger.info("Google OAuth flow completed successfully", {
    meta: {
      userId: user._id,
      redirect: `${process.env.CLIENT_URL}/oauth-success?token=${accessToken}`,
      correlationId: req.correlationId
    }
  });

  return res.redirect(
    `${process.env.CLIENT_URL}/oauth-success?token=${accessToken}`
  );
});


// ======================================================================
// UNLINK GOOGLE ACCOUNT
// ======================================================================
// @desc    Disconnect Google account from the current user
// @route   DELETE /api/v1/auth/unlink/google
// @access  Private
// ----------------------------------------------------------------------
exports.googleUnlinkService = asyncHandler(async (req, res, next) => {
  const user = req.user;

  logger.info("Google unlink attempt", {
    meta: {
      userId: user._id,
      hasGoogleId: !!user.googleId,
      passwordManuallySet: user.passwordManuallySet,
      correlationId: req.correlationId
    }
  });

  // Google account not linked
  if (!user.googleId) {
    logger.warn("Google unlink failed: account not linked", {
      meta: {
        userId: user._id,
        correlationId: req.correlationId
      }
    });

    return res.status(400).json({
      status: "fail",
      message: "Google account is not linked",
    });
  }

console.log("UNLINK CHECK:", {
  id: user._id,
  passwordManuallySet: user.passwordManuallySet
});


  // User must have manually set a password before unlinking Google
  if (!user.passwordManuallySet) {
    logger.warn("Google unlink blocked: password not manually set", {
      meta: {
        userId: user._id,
        correlationId: req.correlationId
      }
    });

    return res.status(400).json({
      status: "fail",
      message: "You must set a password before unlinking Google",
    });
  }

  logger.info("Google unlink proceeding", {
    meta: {
      userId: user._id,
      correlationId: req.correlationId
    }
  });

  user.googleId = undefined;
  user.provider = "local";
  await user.save();

  logger.info("Google account unlinked successfully", {
    meta: {
      userId: user._id,
      correlationId: req.correlationId
    }
  });

  return res.status(200).json({
    status: "success",
    message: "Google account unlinked successfully",
  });
});


// ======================================================================
// SET PASSWORD FOR USERS WITHOUT A MANUALLY SET PASSWORD (GOOGLE USERS)
// ======================================================================
// @desc    Set a password for the current user if they haven't manually set one
// @route   POST /api/v1/auth/set-password
// @access  Private
// ----------------------------------------------------------------------
exports.setPasswordService = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const { password } = req.body;

  logger.info("Set password attempt", {
    meta: {
      userId: user._id,
      passwordManuallySet: user.passwordManuallySet,
      correlationId: req.correlationId
    }
  });

  // Validate password
  if (!password || password.length < 6) {
    logger.warn("Set password failed: invalid password", {
      meta: {
        userId: user._id,
        providedLength: password ? password.length : 0,
        correlationId: req.correlationId
      }
    });

    return res.status(400).json({
      status: "fail",
      message: "Password must be at least 6 characters",
    });
  }

  // User already manually set a password
  if (user.passwordManuallySet) {
    logger.warn("Set password blocked: password already manually set", {
      meta: {
        userId: user._id,
        correlationId: req.correlationId
      }
    });

    return res.status(400).json({
      status: "fail",
      message: "You already have a password. Use change password instead.",
    });
  }
console.log("SET-PASSWORD BEFORE SAVE:", {
  id: user._id,
  passwordManuallySet: user.passwordManuallySet
});


  // Set new password
  user.password = password;
  user.passwordManuallySet = true;
  await user.save();

console.log("SET-PASSWORD AFTER SAVE:", {
  id: user._id,
  passwordManuallySet: user.passwordManuallySet
});


  logger.info("Password set successfully", {
    meta: {
      userId: user._id,
      correlationId: req.correlationId
    }
  });

  return res.status(200).json({
    status: "success",
    message: "Password set successfully",
  });
});


// ======================================================================
// GOOGLE OAUTH INIT (PKCE + STATE)
// ======================================================================
// @desc    Generate PKCE parameters and Google OAuth URL
// @route   GET /api/v1/auth/google/init
// @access  Public
// ----------------------------------------------------------------------
exports.googleInitService = asyncHandler(async (req, res, next) => {
  const state = crypto.randomBytes(32).toString("hex");
  const codeVerifier = crypto.randomBytes(64).toString("hex");

  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await OAuthTemp.create({
    state,
    codeVerifier,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return res.status(200).json({
    status: "success",
    url: googleAuthUrl,
  });
  
});
