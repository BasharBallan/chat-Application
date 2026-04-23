const dotenv = require('dotenv');

// Load environment variables
if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: "config.env.test" });
  logger.transports.forEach((t) => (t.silent = true));
} else {
  dotenv.config({ path: "config.env" });
}

const mongoose = require('mongoose');
const app = require('./app');

// Connect with DB
mongoose.connect(process.env.DB_URI)
  .then(() => console.log("DB connected"))
  .catch(err => {
    console.error("DB connection error:", err);
    process.exit(1);
  });

// Start server
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`UnhandledRejection Error: ${err.name} | ${err.message}`);
  server.close(() => {
    console.error('Shutting down server...');
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`Uncaught Exception: ${err.name} | ${err.message}`);
  server.close(() => {
    console.error('Shutting down due to uncaught exception...');
    process.exit(1);
  });
});
