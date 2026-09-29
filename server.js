const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Orders storage
const orders = [];

// ==============================
// HOME
// ==============================
app.get("/", (req, res) => {
  res.json({
    success: true,
    store: "MGG STORE",
    version: "V2026",
    status: "online"
  });
});

// ==============================
// HEALTH CHECK
// ==============================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "online"
  });
});

// ==============================
// GET ALL ORDERS
// ==============================
app.get("/api/orders", (req, res) => {
  res.json({
    success: true,
    orders: orders
  });
});

// ==============================
// CREATE ORDER
// ==============================
app.post("/api/orders", (req, res) => {
  const {
    game,
    playerId,
    package: packageName
  } = req.body;

  if (!game || !playerId || !packageName) {
    return res.status(400).json({
      success: false,
      message: "game, playerId and package are required"
    });
  }

  const order = {
    orderId:
      "MGG-" +
      crypto.randomBytes(4).toString("hex").toUpperCase(),

    game: game,
    playerId: playerId,
    package: packageName,

    status: "PENDING_PAYMENT",

    createdAt: new Date().toISOString()
  };

  orders.push(order);

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    order: order
  });
});

// ==============================
// GET ONE ORDER
// ==============================
app.get("/api/orders/:orderId", (req, res) => {
  const order = orders.find(
    (item) => item.orderId === req.params.orderId
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found"
    });
  }

  res.json({
    success: true,
    order: order
  });
});

// ==============================
// START SERVER
// ==============================
app.listen(PORT, () => {
  console.log(
    `MGG STORE Backend running on port ${PORT}`
  );
});
