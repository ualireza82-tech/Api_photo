import express from "express";
import cors from "cors";
import helmet from "helmet";
import apiRoutes from "./routes/api.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.send("Football Highlights API Running");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});