/**
 * User & Doctor API Tests (Admin + Logged Student)
 */
jest.mock("../../services/authService", () => {
  const original = jest.requireActual("../../services/authService");
  const mongoose = require("mongoose");

  return {
    ...original,

    protect: (req, res, next) => {
      const role = req.headers["x-test-role"] || "student";

      req.user = {
        _id:
          role === "admin"
            ? new mongoose.Types.ObjectId("65f000000000000000000002")
            : new mongoose.Types.ObjectId("65f000000000000000000001"),
        role,
      };

      next();
    },

    allowedTo: () => (req, res, next) => next(),
  };
});


// ------------------------------------------------------
// MOCK REDIS
// ------------------------------------------------------
jest.mock("../../config/redis", () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue("OK"),
  del: jest.fn().mockResolvedValue(1),
}));
require("dotenv").config({ path: "config.env.test" });

const request = require("supertest");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const app = require("../../app");

const User = require("../../models/userModel");





// ------------------------------------------------------
// DB SETUP
// ------------------------------------------------------
beforeAll(async () => {
  await mongoose.connect(process.env.DB_URI);
});

afterEach(async () => {
  await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.close();
});

// ------------------------------------------------------
// Helper: Create Admin
// ------------------------------------------------------
const createAdmin = async () => {
  return await User.create({
    _id: new mongoose.Types.ObjectId("65f000000000000000000002"),
    name: "Admin",
    email: "admin@test.com",
    password: await bcrypt.hash("Admin123!", 12),
    role: "admin",
  });
};

// ------------------------------------------------------
// Helper: Create Logged Student
// ------------------------------------------------------
const createStudent = async () => {
  return await User.create({
    _id: new mongoose.Types.ObjectId("65f000000000000000000001"),
    name: "Student User",
    email: "student@test.com",
    password: "Student123!",
    role: "student",
    studentData: {
      savedLectures: [],
    },
  });
};


// ------------------------------------------------------
// Helper: Create Doctor
// ------------------------------------------------------
const createDoctor = async () => {
  return await User.create({
    _id: new mongoose.Types.ObjectId("65f000000000000000000003"),
    name: "Dr. Bashar",
    email: "doctor@test.com",
    password: await bcrypt.hash("Doctor123!", 12),
    role: "doctor",
    doctorData: {
      specialization: "Math",
      academicTitle: "Professor",
      subjects: [],
    },
  });
};

// ------------------------------------------------------
// TEST SUITE
// ------------------------------------------------------
describe("User & Doctor API (Admin + Logged Student)", () => {
  beforeEach(async () => {
    await createAdmin();
    await createStudent();
  });

  // ------------------------------------------------------
  // USER CRUD (ADMIN)
  // ------------------------------------------------------
  it("✓ should return all users", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(2); // admin + student
  });

  it("✓ should return user by ID", async () => {
    const res = await request(app)
      .get("/api/v1/users/65f000000000000000000001")
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("student@test.com");
  });

  it("✓ should return 404 if user not found", async () => {
    const res = await request(app)
      .get("/api/v1/users/65f999999999999999999999")
      .set("x-test-role", "admin");

    expect(res.status).toBe(404);
  });

  it("✓ should delete user successfully", async () => {
    const res = await request(app)
      .delete("/api/v1/users/65f000000000000000000001")
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);
  });

  // ------------------------------------------------------
  // LOGGED USER (STUDENT)
  // ------------------------------------------------------
  it("✓ should return logged user data (getMe)", async () => {
    const res = await request(app)
      .get("/api/v1/users/getMe")
      .set("x-test-role", "student");

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("student@test.com");
  });

  it("✓ should update logged user data", async () => {
    const res = await request(app)
      .put("/api/v1/users/updateMe")
      .set("x-test-role", "student")
      .send({ name: "Updated Student" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Updated Student");
  });

  it("✓ should update logged user password", async () => {
 const res = await request(app)
  .put("/api/v1/users/updateMyPassword")
  .set("x-test-role", "student")
  .send({
    currentPassword: "Student123!",
    newPassword: "NewPass123!",
    passwordConfirm: "NewPass123!",
  });


    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("✓ should deactivate logged user (deleteMe)", async () => {
    const res = await request(app)
      .delete("/api/v1/users/deleteMe")
      .set("x-test-role", "student");

    expect(res.status).toBe(204);
  });

  // ------------------------------------------------------
  // DOCTOR CRUD (ADMIN)
  // ------------------------------------------------------
  it("✓ should create a doctor", async () => {
    const res = await request(app)
      .post("/api/v1/users/admin/doctors")
      .set("x-test-role", "admin")
      .send({
        name: "New Doctor",
        email: "newdoctor@test.com",
        password: "Doctor123!",
        specialization: "Physics",
        academicTitle: "Assistant Professor",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("doctor");
  });

  it("✓ should return all doctors", async () => {
    await createDoctor();

    const res = await request(app)
      .get("/api/v1/users/admin/doctors")
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);
    expect(res.body.results).toBe(1);
  });

  it("✓ should return doctor by ID", async () => {
    await createDoctor();

    const res = await request(app)
      .get("/api/v1/users/admin/doctors/65f000000000000000000003")
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("doctor@test.com");
  });

  it("✓ should update doctor successfully", async () => {
    await createDoctor();

    const res = await request(app)
      .put("/api/v1/users/admin/doctors/65f000000000000000000003")
      .set("x-test-role", "admin")
      .send({ specialization: "Chemistry" });

    expect(res.status).toBe(200);
    expect(res.body.data.doctorData.specialization).toBe("Chemistry");
  });

  it("✓ should delete doctor successfully", async () => {
    await createDoctor();

    const res = await request(app)
      .delete("/api/v1/users/admin/doctors/65f000000000000000000003")
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);
  });
});
