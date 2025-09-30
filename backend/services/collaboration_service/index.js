import express from "express";

const port = process.env.COLLABORATIONSERVICEPORT || 4004;

const app = express();

app.get("/status", (req, res) => {
  res.send("Collaboration service is up and running!");
});

app.listen(port, () => {
  console.log(`Collaboration service is running on port ${port}`);
});
