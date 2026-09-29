const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "MGG STORE Backend is running!"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "online"
  });
});

app.post("/api/orders", (req, res) => {
  const { game, package: diamondPackage, playerId, paymentMethod } = req.body;

  if (!game || !diamondPackage || !playerId || !paymentMethod) {
    return res.status(400).json({
      success: false,
      message: "Please provide game, package, playerId and paymentMethod."
    });
  }

  const order = {
    id: `MGG-${Date.now()}`,
    game,
    package: diamondPackage,
    playerId,
    paymentMethod,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  res.status(201).json({
    success: true,
    message: "Order created successfully.",
    order
  });
});

app.listen(PORT, () => {
  console.log(`MGG STORE Backend running on port ${PORT}`);
});
