import app from "./app.js";
import { pool } from "./config/db.js";

const port = Number(process.env.PORT || 4000);

async function start() {
  try {
    await pool.getConnection();
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
