import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  connectionString:
    "postgresql://root:2f5UEA6K3tp58QISmjgJ1wuCCxIY0yxD@dpg-d0vknp6mcj7s73eo1ff0-a.oregon-postgres.render.com/happychicken",
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
