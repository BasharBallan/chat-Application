const fs = require("fs");
const path = require("path");
require("colors");
const dotenv = require("dotenv");
const Lecture = require("../../models/lectureModel");
const dbConnection = require("../../config/database");

dotenv.config({ path: path.join(__dirname, "../../config.env") });

// Connect DB
dbConnection();

// Read JSON file
const lectures = JSON.parse(
  fs.readFileSync(path.join(__dirname, "lectures.json"))
);

// Insert
const insertData = async () => {
  try {
    await Lecture.create(lectures);
    console.log("lectures Inserted".green.inverse);
    process.exit();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

// Delete
const destroyData = async () => {
  try {
    await Lecture.deleteMany({});
    console.log("lectures Deleted".red.inverse);
    process.exit();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
};

// Run
if (process.argv[2] === "-i") insertData();
else if (process.argv[2] === "-d") destroyData();
else {
  console.log("Use -i to insert or -d to delete".yellow);
  process.exit();
}
