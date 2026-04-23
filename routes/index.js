
const userRoute = require("./userRoute");
const authRoute = require("./authRoute");
const healthRoute = require("./healthRoute");


const mountRoutes = (app) => {
  app.use("/api/v1/auth", authRoute);
  app.use("/api/v1/users", userRoute);
app.use("/api/v1/health", healthRoute);

};

module.exports = mountRoutes;
