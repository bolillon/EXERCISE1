import express from "express";
import cors from "cors";
import pool from "./db.js";
import dotenv from "dotenv";

dotenv.config(); // Carga las variables de entorno desde .env

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Puerto dinámico para Render o local
const PORT = process.env.PORT || 3002;

// Crear o verificar tablas
app.post("/create-device-tables", async (req, res) => {
  try {
    const tables = ["device_logs", "relay_status", "data"];
    const results = {};

    for (const table of tables) {
      const check = await pool.query("SELECT to_regclass($1)::text AS exists", [
        `public.${table}`,
      ]);
      results[table] = check.rows[0].exists ? "ya existía" : "creada";

      if (!check.rows[0].exists) {
        const queries = {
          device_logs: `
            CREATE TABLE device_logs (
              id SERIAL PRIMARY KEY,
              action VARCHAR(50) NOT NULL,
              "user" TEXT NOT NULL,
              enroll_id TEXT NOT NULL,
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `,
          relay_status: `
            CREATE TABLE relay_status (
              id INTEGER PRIMARY KEY,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `,
          data: `
            CREATE TABLE data (
              id SERIAL PRIMARY KEY,
              value TEXT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `,
        };
        await pool.query(queries[table]);
      }
    }

    return res.status(201).json({
      message: "✅ Tablas verificadas/creadas",
      tables: results,
    });
  } catch (error) {
    console.error("❌ Error creando tablas:", error.message);
    return res.status(500).json({ error: "Error al crear/verificar tablas" });
  }
});

// Encender relé y registrar en device_logs
app.post("/turn-on", async (req, res) => {
  try {
    const { user, enrollId } = req.body || {};
    if (!user || !enrollId) {
      return res
        .status(400)
        .json({ error: "Faltan campos requeridos: user y enrollId" });
    }

    await pool.query(
      `INSERT INTO relay_status (id) VALUES (1) ON CONFLICT (id) DO NOTHING`
    );
    await pool.query(
      'INSERT INTO device_logs (action, "user", enroll_id) VALUES ($1, $2, $3)',
      ["turn-on", user, enrollId]
    );

    return res.json({ status: { isOn: true } });
  } catch (err) {
    console.error("Error /turn-on:", err.message);
    return res.status(500).json({ error: "No se pudo encender" });
  }
});

// Apagar relé y registrar en device_logs
app.post("/turn-off", async (req, res) => {
  try {
    const { user, enrollId } = req.body || {};
    if (!user || !enrollId) {
      return res
        .status(400)
        .json({ error: "Faltan campos requeridos: user y enrollId" });
    }

    await pool.query("DELETE FROM relay_status WHERE id = 1");
    await pool.query(
      'INSERT INTO device_logs (action, "user", enroll_id) VALUES ($1, $2, $3)',
      ["turn-off", user, enrollId]
    );

    return res.json({ status: { isOn: false } });
  } catch (err) {
    console.error("Error /turn-off:", err.message);
    return res.status(500).json({ error: "No se pudo apagar" });
  }
});

// Obtener estado del relé
app.get("/status", async (req, res) => {
  try {
    const result = await pool.query("SELECT 1 FROM relay_status WHERE id = 1");
    const isOn = result.rowCount > 0;
    return res.json({ status: { isOn } });
  } catch (err) {
    console.error("Error /status:", err.message);
    return res.status(500).json({ error: "No se pudo leer estado" });
  }
});

// Guardar datos enviados por el ESP
app.post("/save-data", async (req, res) => {
  try {
    const { value } = req.body;

    if (!value) {
      return res.status(400).json({ error: "El campo 'value' es requerido" });
    }

    const result = await pool.query(
      `INSERT INTO data (value) VALUES ($1) RETURNING *`,
      [value]
    );

    return res.status(201).json({
      message: "✅ Datos guardados exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error al guardar datos:", error.message);
    return res.status(500).json({ error: "Error al guardar los datos" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
