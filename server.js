const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;
const API_SECRET = process.env.API_SECRET || "change-this-secret";

app.use(cors());
app.use(express.json());

const orders = [];

// =========================
// HOME
// =========================
app.get("/", (req, res) => {
  res.json({
    success: true,
    store: "MGG STORE",
    status: "online",
    version: "V2026"
  });
});

// =========================
// GAMES
// =========================
app.get("/api/games", (req, res) => {
  res.json({
    success: true,
    games: [
      {
        id: "free-fire",
        name: "Free Fire",
        currency: "Diamonds"
      },
      {
        id: "mobile-legends",
        name: "Mobile Legends",
        currency: "Diamonds"
      },
      {
        id: "pubg",
        name: "PUBG Mobile",
        currency: "UC"
      },
      {
        id: "roblox",
        name: "Roblox",
        currency: "Robux"
      },
      {
        id: "blood-strike",
        name: "Blood Strike",
        currency: "Gold"
      },
      {
        id: "honor-of-kings",
        name: "Honor of Kings",
        currency: "Tokens"
      }
    ]
  });
});

// =========================
// VERIFY PLAYER
// =========================
app.post("/api/verify-player", (req, res) => {
  const { game, playerId, serverId } = req.body;

  if (!game || !playerId) {
    return res.status(400).json({
      success: false,
      message: "Game and Player ID are required"
    });
  }

  // Temporary verification.
  // Real verification will be connected to the provider API later.
  res.json({
    success: true,
    verified: true,
    game,
    playerId,
    serverId: serverId || null,
    message: "Player ID format is valid"
  });
});

// =========================
// CREATE ORDER
// =========================
app.post("/api/create-order", (req, res) => {
  const {
    game,
    playerId,
    serverId,
    packageId,
    packageName,
    amount,
    price
  } = req.body;

  if (!game || !playerId || !packageId || !price) {
    return res.status(400).json({
      success: false,
      message: "Missing required order information"
    });
  }

  const order = {
    orderId: `MGG-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
    game,
    playerId,
    serverId: serverId || null,
    packageId,
    packageName: packageName || "",
    amount: amount || 0,
    price: Number(price),
    currency: "USD",
    status: "PENDING_PAYMENT",
    topupStatus: "WAITING",
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  res.status(201).json({
    success: true,
    message: "Order created successfully",
    order
  });
});

// =========================
// GET ALL ORDERS
// =========================
app.get("/api/orders", (req, res) => {
  res.json({
    success: true,
    count: orders.length,
    orders
  });
});

// =========================
// GET SINGLE ORDER
// =========================
app.get("/api/orders/:orderId", (req, res) => {
  const order = orders.find(
    item => item.orderId === req.params.orderId
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found"
    });
  }

  res.json({
    success: true,
    order
  });
});

// =========================
// PAYMENT WEBHOOK
// =========================
app.post("/api/payment/webhook", (req, res) => {
  const webhookSecret = req.headers["x-api-secret"];

  if (webhookSecret !== API_SECRET) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  const { orderId, paymentStatus, transactionId } = req.body;

  const order = orders.find(item => item.orderId === orderId);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found"
    });
  }

  if (paymentStatus === "PAID") {
    order.status = "PAID";
    order.paymentStatus = "PAID";
    order.transactionId = transactionId || null;

    // IMPORTANT:
    // Real top-up provider API will be called here later.
    order.topupStatus = "WAITING_PROVIDER";
  }

  res.json({
    success: true,
    message: "Payment status updated",
    order
  });
});

// =========================
// ADMIN / TEST TOP-UP STATUS
// =========================
app.post("/api/orders/:orderId/topup-status", (req, res) => {
  const { status } = req.body;

  const allowed = [
    "WAITING",
    "PROCESSING",
    "SUCCESS",
    "FAILED"
  ];

  if (!allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid top-up status"
    });
  }

  const order = orders.find(
    item => item.orderId === req.params.orderId
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found"
    });
  }

  order.topupStatus = status;

  if (status === "SUCCESS") {
    order.status = "COMPLETED";
  }

  if (status === "FAILED") {
    order.status = "TOPUP_FAILED";
  }

  res.json({
    success: true,
    order
  });
});

// =========================
// 404
// =========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found"
  });
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(`MGG STORE Backend running on port ${PORT}`);
});
