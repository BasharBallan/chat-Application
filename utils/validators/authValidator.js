const { check } = require("express-validator");
const slugify = require("slugify");
const User = require("../../models/userModel");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

// ------------------------------------------------------
// Signup Validator
// ------------------------------------------------------

exports.signupValidator = [
  check("name")
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 3 })
    .withMessage("Name must be at least 3 characters")
    .custom((val, { req }) => {
      req.body.slug = slugify(val);
      return true;
    }),

  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isStrongPassword()
    .withMessage(
      "Password must include uppercase, lowercase, number, symbol, and be at least 8 characters"
    )
    .custom((password, { req }) => {
      if (password !== req.body.passwordConfirm) {
        throw new Error("Password confirmation does not match");
      }
      return true;
    }),

  check("passwordConfirm")
    .notEmpty()
    .withMessage("Password confirmation is required"),

  validatorMiddleware,
];



// ------------------------------------------------------
// Login Validator
// ------------------------------------------------------
exports.loginValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  check("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  validatorMiddleware,
];

// ------------------------------------------------------
// Admin Signup Validator
// ------------------------------------------------------
exports.adminSignupValidator = [
  check("name")
    .notEmpty()
    .withMessage("Admin name is required")
    .isLength({ min: 3 })
    .withMessage("Admin name must be at least 3 characters"),

  check("email")
    .notEmpty()
    .withMessage("Admin email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .custom((val) =>
      User.findOne({ email: val }).then((user) => {
        if (user) {
          return Promise.reject(new Error("Email already in use"));
        }
      })
    ),

  check("password")
    .notEmpty()
    .withMessage("Admin password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  validatorMiddleware,
];

// ------------------------------------------------------
// Admin Login Validator
// ------------------------------------------------------
exports.adminLoginValidator = [
  check("email")
    .notEmpty()
    .withMessage("Admin email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  check("password")
    .notEmpty()
    .withMessage("Admin password is required"),

  validatorMiddleware,
];

// ------------------------------------------------------
// Forgot Password Validator
// ------------------------------------------------------
exports.forgotPasswordValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  validatorMiddleware,
];

// ------------------------------------------------------
// Verify Reset Code Validator
// ------------------------------------------------------
exports.verifyResetCodeValidator = [
  check("resetCode")
    .notEmpty()
    .withMessage("Reset code is required")
    .isLength({ min: 6, max: 6 })
    .withMessage("Reset code must be 6 digits")
    .isNumeric()
    .withMessage("Reset code must be numeric"),

  validatorMiddleware,
];

// ------------------------------------------------------
// Reset Password Validator
// ------------------------------------------------------
exports.resetPasswordValidator = [
  check("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format"),

  check("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isStrongPassword()
    .withMessage(
      "Password must include uppercase, lowercase, number, symbol, and be at least 8 characters"
    ),

  check("newPasswordConfirm")
    .notEmpty()
    .withMessage("Password confirmation is required")
    .custom((val, { req }) => {
      if (val !== req.body.newPassword) {
        throw new Error("Password confirmation does not match");
      }
      return true;
    }),

  validatorMiddleware,
];
