import pool from "./db.js";
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

// Crear o verificar tablas
app.post("/create-device-tables", async (req, res) => {
  try {
    // device_logs
    const checkLogs = await pool.query(
      "SELECT to_regclass($1)::text AS exists",
      ["public.device_logs"]
    );
    if (!checkLogs.rows[0].exists) {
      await pool.query(`
        CREATE TABLE device_logs (
          id SERIAL PRIMARY KEY,
          action VARCHAR(50) NOT NULL,
          "user" TEXT NOT NULL,
          enroll_id TEXT NOT NULL,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // relay_status
    const checkRelay = await pool.query(
      "SELECT to_regclass($1)::text AS exists",
      ["public.relay_status"]
    );
    if (!checkRelay.rows[0].exists) {
      await pool.query(`
        CREATE TABLE relay_status (
          id INTEGER PRIMARY KEY,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // data
    const checkData = await pool.query(
      "SELECT to_regclass($1)::text AS exists",
      ["public.data"]
    );
    if (!checkData.rows[0].exists) {
      await pool.query(`
        CREATE TABLE data (
          id SERIAL PRIMARY KEY,
          value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    return res.status(201).json({
      message: "✅ Tablas verificadas/creadas",
      tables: {
        device_logs: checkLogs.rows[0].exists ? "ya existía" : "creada",
        relay_status: checkRelay.rows[0].exists ? "ya existía" : "creada",
        data: checkData.rows[0].exists ? "ya existía" : "creada",
      },
    });
  } catch (error) {
    console.error("❌ Error creando tablas:", error.message);
    return res.status(500).json({ error: "Error al crear/verificar tablas" });
  }
});

// Encender relé y registrar en device_logs
app.post("/turn-on", async (req, res) => {
  try {
    const { user, enrollId } = req.body; // Opcional, para logs
    await pool.query(`
      INSERT INTO relay_status (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING
    `);
    if (user && enrollId) {
      await pool.query(
        'INSERT INTO device_logs (action, "user", enroll_id) VALUES ($1, $2, $3)',
        ["turn-on", user, enrollId]
      );
    }
    return res.json({ status: { isOn: true } });
  } catch (err) {
    console.error("Error /turn-on:", err.message);
    return res.status(500).json({ error: "No se pudo encender" });
  }
});

// Apagar relé y registrar en device_logs
app.post("/turn-off", async (req, res) => {
  try {
    const { user, enrollId } = req.body; // Opcional, para logs
    await pool.query("DELETE FROM relay_status WHERE id = 1");
    if (user && enrollId) {
      await pool.query(
        'INSERT INTO device_logs (action, "user", enroll_id) VALUES ($1, $2, $3)',
        ["turn-off", user, enrollId]
      );
    }
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
  const { value, nombre, matricula } = req.body; // Acepta los campos del ESP

  if (!value) {
    return res.status(400).json({ error: "El campo 'value' es requerido" });
  }
  try {
    const result = await pool.query(
      `INSERT INTO data (value) VALUES ($1) RETURNING *`,
      [value]
    );
    return res.status(201).json({
      message: "✅ Datos guardados exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
    return res.status(500).json({ error: "Error al guardar los datos" });
  }
});

// Puerto dinámico para Render
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
