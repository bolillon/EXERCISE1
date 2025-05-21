const express = require("express");
const cors = require("cors");
//npm install express cors
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/temperatura", (req, res) => {
  res.json({ valor: `${10} "C`, timestamp: new Date().toISOString() });
});

app.get("/estesotroendpoint", (req, res) => {
  console.log("Endpoint /estesotroendpoint fue llamado");
});

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`);
});
