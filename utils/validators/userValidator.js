const slugify = require("slugify");
const bcrypt = require("bcryptjs");
const { check, body } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const User = require("../../models/userModel");


// ------------------------------------------------------
// Delete User (Admin)
// ------------------------------------------------------
exports.deleteUserValidator = [
  check("id").isMongoId().withMessage("Invalid user ID format"),
  validatorMiddleware,
];
// ------------------------------------------------------
// Get User by ID
// ------------------------------------------------------
exports.getUserValidator = [
  check("id").isMongoId().withMessage("Invalid user ID format"),
  validatorMiddleware,
];

// ------------------------------------------------------
// Update Logged User (student/doctor)
// ------------------------------------------------------
exports.updateLoggedUserValidator = [
  body("name")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val, { req }) =>
      User.findOne({ email: val }).then((user) => {
        if (user && user._id.toString() !== req.user._id.toString()) {
          return Promise.reject(new Error("Email already in use"));
        }
      })
    ),

  check("phone")
    .optional()
    .isMobilePhone(["ar-EG", "ar-SA"])
    .withMessage("Invalid phone number (only EG & SA allowed)"),

  validatorMiddleware,
];

// ------------------------------------------------------
// Change Logged User Password (Student / Doctor / Admin)
// ------------------------------------------------------
exports.updateLoggedUserPasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required"),

  body("passwordConfirm")
    .notEmpty()
    .withMessage("Password confirmation is required"),

 

  validatorMiddleware,
];




// ------------------------------------------------------
// Doctor CRUD Validators (Admin)
// ------------------------------------------------------

// Create Doctor
exports.createDoctorValidator = [
  check("name")
    .notEmpty()
    .withMessage("Doctor name is required")
    .isLength({ min: 3 })
    .withMessage("Doctor name must be at least 3 characters")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  check("email")
    .notEmpty()
    .withMessage("Doctor email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val) =>
      User.findOne({ email: val }).then((user) => {
        if (user) return Promise.reject(new Error("Email already in use"));
      })
    ),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isStrongPassword()
    .withMessage(
      "Password must include uppercase, lowercase, number, symbol, and be at least 8 characters"
    ),

  check("specialization")
    .notEmpty()
    .withMessage("Specialization is required"),

  check("academicTitle")
    .notEmpty()
    .withMessage("Academic title is required"),

  validatorMiddleware,
];

// Get Doctor by ID
exports.getDoctorValidator = [
  check("id").isMongoId().withMessage("Invalid doctor ID format"),
  validatorMiddleware,
];

// Update Doctor
exports.updateDoctorValidator = [
  check("id").isMongoId().withMessage("Invalid doctor ID format"),

  body("name")
    .optional()
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  check("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email address")
    .custom((val, { req }) =>
      User.findOne({ email: val }).then((user) => {
        if (user && user._id.toString() !== req.params.id) {
          return Promise.reject(new Error("Email already in use"));
        }
      })
    ),

  check("specialization").optional(),
  check("academicTitle").optional(),

  validatorMiddleware,
];

// Delete Doctor
exports.deleteDoctorValidator = [
  check("id").isMongoId().withMessage("Invalid doctor ID format"),
  validatorMiddleware,
];
