import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString:
    "postgresql://iot5_user:m9jfNI8EyfPaG1UPwpUWjV169zcZ8BKo@dpg-d29rmrjipnbc73b8j0n0-a.oregon-postgres.render.com/iot5",
  ssl: {
    rejectUnauthorized: false,
  },
});

export default pool;

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("Connected to the database successfully");
    client.release();
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
}

testConnection();
