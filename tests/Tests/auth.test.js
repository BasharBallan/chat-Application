/**
 * Auth API Test Suite (Clean Final Version)
 * Covers: Signup + Login + Admin + ForgotPassword + Sessions + Google OAuth
 */



// ------------------------------------------------------
// AUTH SERVICE MOCK (FINAL CLEAN VERSION)
// ------------------------------------------------------
jest.mock("../../services/authService", () => {
  const original = jest.requireActual("../../services/authService");
  return {
    ...original,
    createSession: jest.fn(),
    setRefreshTokenCookie: jest.fn(),
    protect: jest.fn((req, res, next) => next()),
    allowedTo: jest.fn(() => (req, res, next) => next()),
  };
});


const authService = require("../../services/authService");
const app = require("../../app");

require("dotenv").config({ path: "config.env.test" });

const request = require("supertest");
const mongoose = require("mongoose");

const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const OAuthTemp = require("../../models/oauthTempModel");
const User = require("../../models/userModel");

// ------------------------------------------------------
// GLOBAL EMAIL MOCK
// ------------------------------------------------------
jest.mock("../../utils/sendEmail", () => {
  return jest.fn().mockResolvedValue(true);
});

// ------------------------------------------------------
// NETWORK MOCKS
// ------------------------------------------------------
jest.mock("../../utils/network", () => ({
  getRealIp: jest.fn(() => "127.0.0.1"),
  getGeoLocation: jest.fn(() => ({ country: "Syria" })),
}));

// ------------------------------------------------------
// USER SESSION MODEL MOCK
// ------------------------------------------------------
const mockSessionCreate = jest.fn();
const mockSessionFind = jest.fn();
const mockSessionFindOne = jest.fn();
const mockSessionDeleteOne = jest.fn();
const mockSessionDeleteMany = jest.fn();

jest.mock("../../models/userSessionModel", () => ({
  create: (...args) => mockSessionCreate(...args),
  find: (...args) => mockSessionFind(...args),
  findOne: (...args) => mockSessionFindOne(...args),
  deleteOne: (...args) => mockSessionDeleteOne(...args),
  deleteMany: (...args) => mockSessionDeleteMany(...args),
}));

// ------------------------------------------------------
// REDIS MOCK
// ------------------------------------------------------
jest.mock("../../config/redis", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
  on: jest.fn(),
  connect: jest.fn(),
  quit: jest.fn(),
}));




// ------------------------------------------------------
// DB SETUP
// ------------------------------------------------------
beforeAll(async () => {
  await mongoose.connect(process.env.DB_URI);
});

afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await mongoose.connection.close();
});

// ======================================================================
// SIGNUP TESTS
// ======================================================================
describe("POST /auth/signup", () => {
  it("✓ should signup successfully with valid data", async () => {
    mockSessionCreate.mockResolvedValue({ _id: "session123" });

    const res = await request(app)
      .post("/api/v1/auth/signup")
      .set("User-Agent", "JestTestAgent")
      .send({
        name: "Valid User",
        email: "valid@example.com",
        password: "Valid@1234",
        passwordConfirm: "Valid@1234",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("valid@example.com");
  });

  it("✓ should fail when name is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        email: "noname@example.com",
        password: "Valid@1234",
        passwordConfirm: "Valid@1234",
      });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when email format is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: "Invalid Email",
        email: "not-an-email",
        password: "Valid@1234",
        passwordConfirm: "Valid@1234",
      });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when password is weak", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: "Weak Password",
        email: "weak@example.com",
        password: "123",
        passwordConfirm: "123",
      });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when passwordConfirm does not match", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: "Mismatch",
        email: "mismatch@example.com",
        password: "Valid@1234",
        passwordConfirm: "WrongConfirm",
      });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when email already exists", async () => {
    mockSessionCreate.mockResolvedValue({ _id: "session123" });

    await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: "User1",
        email: "duplicate@example.com",
        password: "Valid@1234",
        passwordConfirm: "Valid@1234",
      });

    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: "User2",
        email: "duplicate@example.com",
        password: "Valid@1234",
        passwordConfirm: "Valid@1234",
      });

    expect(res.status).toBe(400);
  });
});

// ======================================================================
// LOGIN TESTS
// ======================================================================
describe("POST /auth/login", () => {
  const mockCookie = jest.fn();
  app.response.cookie = mockCookie;

  it("✓ should login successfully with valid credentials", async () => {
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-token");

    mockSessionCreate.mockResolvedValue({ _id: "session123" });

    await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: "Login User",
        email: "login@example.com",
        password: "Valid@1234",
        passwordConfirm: "Valid@1234",
      });

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "login@example.com",
        password: "Valid@1234",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("login@example.com");
    expect(mockCookie).toHaveBeenCalled();
  });

  it("✓ should fail when email is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ password: "Valid@1234" });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when password is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(400);
  });

  it("✓ should fail with invalid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "wrong@example.com",
        password: "WrongPass123",
      });

    expect(res.status).toBe(401);
  });
});

// ======================================================================
// ADMIN SIGNUP
// ======================================================================
describe("POST /auth/adminSignup", () => {
  it("✓ should signup admin successfully", async () => {
    mockSessionCreate.mockResolvedValue({ _id: "session123" });

    const res = await request(app)
      .post("/api/v1/auth/adminSignup")
      .send({
        name: "Admin User",
        email: "admin@example.com",
        password: "Valid@1234",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("admin@example.com");
    expect(res.body.data.role).toBe("admin");
  });

  it("✓ should fail when name is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/adminSignup")
      .send({
        email: "admin@example.com",
        password: "Valid@1234",
      });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when email is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth/adminSignup")
      .send({
        name: "Admin User",
        email: "not-an-email",
        password: "Valid@1234",
      });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when email already exists", async () => {
    mockSessionCreate.mockResolvedValue({ _id: "session123" });

    await request(app)
      .post("/api/v1/auth/adminSignup")
      .send({
        name: "Admin1",
        email: "duplicate@example.com",
        password: "Valid@1234",
      });

    const res = await request(app)
      .post("/api/v1/auth/adminSignup")
      .send({
        name: "Admin2",
        email: "duplicate@example.com",
        password: "Valid@1234",
      });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when password is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/adminSignup")
      .send({
        name: "Admin User",
        email: "admin@example.com",
      });

    expect(res.status).toBe(400);
  });
});

// ======================================================================
// ADMIN LOGIN
// ======================================================================
describe("POST /auth/adminLogin", () => {
  it("✓ should login admin successfully", async () => {
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-token");

    mockSessionCreate.mockResolvedValue({ _id: "session123" });

    await request(app)
      .post("/api/v1/auth/adminSignup")
      .send({
        name: "Admin User",
        email: "admin@example.com",
        password: "Valid@1234",
      });

    const res = await request(app)
      .post("/api/v1/auth/adminLogin")
      .send({
        email: "admin@example.com",
        password: "Valid@1234",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("admin@example.com");
    expect(res.body.data.role).toBe("admin");
  });

  it("✓ should fail when email is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/adminLogin")
      .send({ password: "Valid@1234" });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when password is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/adminLogin")
      .send({ email: "admin@example.com" });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when admin not found", async () => {
    const res = await request(app)
      .post("/api/v1/auth/adminLogin")
      .send({
        email: "notfound@example.com",
        password: "Valid@1234",
      });

    expect(res.status).toBe(401);
  });

  it("✓ should fail when password is incorrect", async () => {
    jest.spyOn(bcrypt, "compare").mockResolvedValue(false);

    mockSessionCreate.mockResolvedValue({ _id: "session123" });

    await request(app)
      .post("/api/v1/auth/adminSignup")
      .send({
        name: "Admin User",
        email: "admin2@example.com",
        password: "Valid@1234",
      });

    const res = await request(app)
      .post("/api/v1/auth/adminLogin")
      .send({
        email: "admin2@example.com",
        password: "WrongPassword",
      });

    expect(res.status).toBe(401);
  });
});
// ======================================================================
// FORGOT PASSWORD TESTS
// ======================================================================
describe("POST /auth/forgotPassword", () => {
  it("✓ should send reset code when email exists", async () => {
    mockSessionCreate.mockResolvedValue({ _id: "session123" });

    await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: "User",
        email: "user@example.com",
        password: "Valid@1234",
        passwordConfirm: "Valid@1234",
      });

    const res = await request(app)
      .post("/api/v1/auth/forgotPassword")
      .send({ email: "user@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.message.toLowerCase()).toContain("reset");
  });

  it("✓ should fail when email is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgotPassword")
      .send({});

    expect(res.status).toBe(400);
  });

  it("✓ should fail when email format is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgotPassword")
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
  });

  it("✓ should fail when user does not exist", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgotPassword")
      .send({ email: "unknown@example.com" });

    expect(res.status).toBe(404);
  });
});

// ======================================================================
// SESSION TESTS
// ======================================================================

// ------------------------------------------------------
// GET MY SESSIONS
// ------------------------------------------------------
describe("GET /auth/sessions", () => {
  beforeEach(() => {
    authService.protect.mockImplementation((req, res, next) => {
      req.user = { _id: "123456789", role: "student" };
      next();
    });
  });

  it("✓ should return all active sessions", async () => {
    mockSessionFind.mockReturnValue({
      select: () => ({
        sort: () => [
          { _id: "1", createdAt: new Date() },
          { _id: "2", createdAt: new Date() },
        ],
      }),
    });

    const res = await request(app)
      .get("/api/v1/auth/sessions")
      .set("Authorization", "Bearer faketoken");

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(2);
  });
});

// ------------------------------------------------------
// DELETE SPECIFIC SESSION
// ------------------------------------------------------
describe("DELETE /auth/sessions/:sessionId", () => {
  beforeEach(() => {
    authService.protect.mockImplementation((req, res, next) => {
      req.user = { _id: "123456789", role: "student" };
      next();
    });
  });

  it("✓ should delete specific session", async () => {
    mockSessionFindOne.mockResolvedValue({ _id: "abc", user: "123456789" });
    mockSessionDeleteOne.mockResolvedValue({});

    const res = await request(app)
      .delete("/api/v1/auth/sessions/abc")
      .set("Authorization", "Bearer faketoken");

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("terminated");
  });

  it("✓ should return 404 if session not found", async () => {
    mockSessionFindOne.mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/v1/auth/sessions/unknown")
      .set("Authorization", "Bearer faketoken");

    expect(res.status).toBe(404);
  });
});

// ------------------------------------------------------
// DELETE ALL OTHER SESSIONS
// ------------------------------------------------------
describe("DELETE /auth/sessions", () => {
  beforeEach(() => {
    authService.protect.mockImplementation((req, res, next) => {
      req.user = { _id: "123456789", role: "student" };
      next();
    });
  });

  it("✓ should delete all other sessions except current", async () => {
    jest.spyOn(jwt, "verify").mockReturnValue({ userId: "123456789" });
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true);

    mockSessionFind.mockResolvedValue([
      { _id: "1", refreshTokenHash: "anyhash" },
      { _id: "2", refreshTokenHash: "anyhash" },
    ]);

    mockSessionDeleteMany.mockResolvedValue({});

    const res = await request(app)
      .delete("/api/v1/auth/sessions")
      .set("Cookie", ["refreshToken=faketoken"]);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("terminated");
  });

  it("✓ should fail when refresh token missing", async () => {
    const res = await request(app).delete("/api/v1/auth/sessions");

    expect(res.status).toBe(401);
  });
});
// ======================================================================
// GOOGLE OAUTH TESTS
// ======================================================================

// ------------------------------------------------------
// GOOGLE INIT (PKCE + STATE)
// ------------------------------------------------------
describe("GET /auth/google/init", () => {
  it("✓ should generate PKCE params and return Google OAuth URL", async () => {
    jest.spyOn(OAuthTemp, "create").mockResolvedValue({});

    const res = await request(app)
      .get("/api/v1/auth/google/init")
      .set("User-Agent", "JestTestAgent");

    expect(res.status).toBe(200);
    expect(res.body.url).toContain("https://accounts.google.com/o/oauth2/v2/auth");
    expect(OAuthTemp.create).toHaveBeenCalled();
  });
});

// ------------------------------------------------------
// GOOGLE CALLBACK (PKCE + STATE)
// ------------------------------------------------------
describe("GET /auth/google/callback", () => {
  beforeEach(() => {
    authService.protect.mockImplementation((req, res, next) => next());
  });

  it("✓ should fail when state is invalid", async () => {
    jest.spyOn(OAuthTemp, "findOne").mockResolvedValue(null);

    const res = await request(app)
      .get("/api/v1/auth/google/callback?code=123&state=wrong");

    expect(res.status).toBe(400);
  });
});

// ======================================================================
// GOOGLE UNLINK
// ======================================================================
describe("DELETE /auth/unlink/google", () => {
  it("✓ should unlink Google account successfully", async () => {
    const mockUser = {
      _id: "user123",
      googleId: "google123",
      provider: "google",
      passwordManuallySet: true,
      save: jest.fn().mockResolvedValue(true),
    };

    authService.protect.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const res = await request(app)
      .delete("/api/v1/auth/unlink/google")
      .set("Authorization", "Bearer faketoken");

    expect(res.status).toBe(200);
    expect(mockUser.googleId).toBeUndefined();
    expect(mockUser.provider).toBe("local");
  });

  it("✓ should fail if Google account not linked", async () => {
    const mockUser = {
      _id: "user123",
      googleId: undefined,
      passwordManuallySet: true,
    };

    authService.protect.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const res = await request(app)
      .delete("/api/v1/auth/unlink/google")
      .set("Authorization", "Bearer faketoken");

    expect(res.status).toBe(400);
  });

  it("✓ should fail if password not manually set", async () => {
    const mockUser = {
      _id: "user123",
      googleId: "google123",
      passwordManuallySet: false,
    };

    authService.protect.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const res = await request(app)
      .delete("/api/v1/auth/unlink/google")
      .set("Authorization", "Bearer faketoken");

    expect(res.status).toBe(400);
  });
});

// ======================================================================
// SET PASSWORD (GOOGLE USERS)
// ======================================================================
describe("POST /auth/set-password", () => {

  it("✓ should fail if password too short", async () => {
    const mockUser = {
      _id: "user123",
      passwordManuallySet: false,
    };

    authService.protect.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const res = await request(app)
      .post("/api/v1/auth/set-password")
      .send({ password: "123" })
      .set("Authorization", "Bearer faketoken");

    expect(res.status).toBe(400);
  });

  it("✓ should fail if password already set", async () => {
    const mockUser = {
      _id: "user123",
      passwordManuallySet: true,
    };

    authService.protect.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    const res = await request(app)
      .post("/api/v1/auth/set-password")
      .send({ password: "NewPass123" })
      .set("Authorization", "Bearer faketoken");

    expect(res.status).toBe(400);
  });
});
