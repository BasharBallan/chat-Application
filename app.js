const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require("cookie-parser");

const langMiddleware = require('./middlewares/langMiddleware');
const mountRoutes = require('./routes');
const ApiError = require('./utils/apiError');
const globalError = require('./middlewares/errorMiddleware');
const helmet = require("helmet");

// Winston Logging Middlewares
const correlationId = require("./middlewares/correlationId");
const requestLogger = require("./middlewares/requestLogger");
const errorLogger = require("./middlewares/errorLogger");

const app = express();

// Enable CORS
app.use(cors());
app.options('*', cors());

// Compress responses
app.use(compression());

// helmet Security
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

// Body parser
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'uploads')));

// Cookie parser
app.use(cookieParser());

// Add Correlation ID FIRST (so كل request بياخد ID)
app.use(correlationId);

// Log every request (Winston)
app.use(requestLogger);

// Morgan (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later',
});
app.use('/api', limiter);

// Prevent HTTP Parameter Pollution
app.use(
  hpp({
    whitelist: ['price', 'sold', 'quantity', 'ratingsAverage', 'ratingsQuantity'],
  })
);

// Custom language middleware
app.use(langMiddleware);
app.use("/uploads", express.static("uploads"));

// Swagger
const { swaggerUi, swaggerSpec } = require("./swagger");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount routes
mountRoutes(app);

// Handle unknown routes
app.all('*', (req, res, next) => {
  next(new ApiError(`Can't find this route: ${req.originalUrl}`, 404));
});

// Winston Error Logger (قبل global error handler)
app.use(errorLogger);

// Global error handler
app.use(globalError);

module.exports = app;
