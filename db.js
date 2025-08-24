import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";

dotenv.config(); // Carga las variables de entorno desde .env

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Necesario para Render
  },
});

export default pool;

// Función para probar la conexión
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log("Conexión a la base de datos exitosa");
    client.release();
  } catch (error) {
    console.error("Error al conectar a la base de datos:", error.message);
  }
}

testConnection();
