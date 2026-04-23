const express = require("express");

const {
  getUserValidator,
  deleteUserValidator,
  updateLoggedUserValidator,
  updateLoggedUserPasswordValidator,
  createDoctorValidator,
  getDoctorValidator,
  updateDoctorValidator,
  deleteDoctorValidator,
} = require("../utils/validators/userValidator");

const {
  getUsers,
  getUser,
  deleteUser,
  getLoggedUserData,
  updateLoggedUserPassword,
  updateLoggedUserData,
  deleteLoggedUserData,
  addDoctor,
  getDoctors,
  getDoctor,
  updateDoctor,
  deleteDoctor,
} = require("../services/userService");

const { protect, allowedTo } = require("../services/authService");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management APIs
 */

/**
 * @swagger
 * tags:
 *   name: Doctors
 *   description: Doctor management APIs (Admin only)
 */

//
// ------------------------------------------------------
// Logged User Routes
// ------------------------------------------------------

/**
 * @swagger
 * /api/v1/users/getMe:
 *   get:
 *     summary: Get logged-in user data
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Returns the profile data of the authenticated user.
 *     responses:
 *       200:
 *         description: User data returned successfully
 *       401:
 *         description: Unauthorized
 */
router.get("/getMe", protect, getLoggedUserData, getUser);

/**
 * @swagger
 * /api/v1/users/updateMyPassword:
 *   put:
 *     summary: Update logged-in user's password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Allows the authenticated user to update their password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 example: "oldPass123"
 *               newPassword:
 *                 type: string
 *                 example: "newStrongPass456"
 *               passwordConfirm:
 *                 type: string
 *                 example: "newStrongPass456"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/updateMyPassword",
  protect,
  updateLoggedUserPasswordValidator,
  updateLoggedUserPassword
);

/**
 * @swagger
 * /api/v1/users/updateMe:
 *   put:
 *     summary: Update logged-in user's profile data
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Allows the authenticated user to update their personal data.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Bashar Ahmad"
 *               email:
 *                 type: string
 *                 example: "bashar@example.com"
 *     responses:
 *       200:
 *         description: User updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put(
  "/updateMe",
  protect,
  updateLoggedUserValidator,
  updateLoggedUserData
);

/**
 * @swagger
 * /api/v1/users/deleteMe:
 *   delete:
 *     summary: Deactivate logged-in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Soft delete for the authenticated user.
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *       401:
 *         description: Unauthorized
 */
router.delete("/deleteMe", protect, deleteLoggedUserData);

//
// ------------------------------------------------------
// Admin Routes (Users CRUD)
// ------------------------------------------------------

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     description: Returns a list of all users (Admin only).
 *     responses:
 *       200:
 *         description: List of users returned successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *

 */
router
  .route("/")
  .get(protect, allowedTo("admin"), getUsers)


/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User returned successfully
 *       404:
 *         description: User not found
 *

 *   delete:
 *     summary: Delete a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 */
router
  .route("/:id")
  .get(protect, allowedTo("admin"), getUserValidator, getUser)
  .delete(protect, allowedTo("admin"), deleteUserValidator, deleteUser);

//
// ------------------------------------------------------
// Admin Routes (Doctors CRUD)
// ------------------------------------------------------

/**
 * @swagger
 * /api/v1/users/admin/doctors:
 *   post:
 *     summary: Add a new doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     description: Admin can create a new doctor account.
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
 *               - specialization
 *               - academicTitle
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Dr. Ahmad"
 *               email:
 *                 type: string
 *                 example: "doctor@example.com"
 *               password:
 *                 type: string
 *                 example: "Doctor@1234"
 *               specialization:
 *                 type: string
 *                 example: "Computer Science"
 *               academicTitle:
 *                 type: string
 *                 example: "Assistant Professor"
 *     responses:
 *       201:
 *         description: Doctor created successfully
 *       400:
 *         description: Invalid input data
 */

router.post(
  "/admin/doctors",
  protect,
  allowedTo("admin"),
  createDoctorValidator,
  addDoctor
);

/**
 * @swagger
 * /api/v1/users/admin/doctors:
 *   get:
 *     summary: Get all doctors
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     description: Returns a list of all doctors.
 *     responses:
 *       200:
 *         description: List of doctors returned successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/admin/doctors",
  protect,
  allowedTo("admin"),
  getDoctors
);

/**
 * @swagger
 * /api/v1/users/admin/doctors/{id}:
 *   get:
 *     summary: Get doctor by ID
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Doctor returned successfully
 *       404:
 *         description: Doctor not found
 */
router.get(
  "/admin/doctors/:id",
  protect,
  allowedTo("admin"),
  getDoctorValidator,
  getDoctor
);

/**
 * @swagger
 * /api/v1/users/admin/doctors/{id}:
 *   put:
 *     summary: Update doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Doctor updated successfully
 *       404:
 *         description: Doctor not found
 */
router.put(
  "/admin/doctors/:id",
  protect,
  allowedTo("admin"),
  updateDoctorValidator,
  updateDoctor
);

/**
 * @swagger
 * /api/v1/users/admin/doctors/{id}:
 *   delete:
 *     summary: Delete doctor
 *     tags: [Doctors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Doctor deleted successfully
 *       404:
 *         description: Doctor not found
 */
router.delete(
  "/admin/doctors/:id",
  protect,
  allowedTo("admin"),
  deleteDoctorValidator,
  deleteDoctor
);

module.exports = router;
