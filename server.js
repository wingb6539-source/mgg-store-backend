const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const orders = [];

// HOME
app.get("/", (req, res) => {
  res.json({
    store: "MGG STORE",
    status: "online",
    message: "Backend is working"
  });
});

// GET ORDERS
app.get("/api/orders", (req, res) => {
  res.json({
    success: true,
    orders: orders
  });
});

// CREATE ORDER
app.post("/api/orders", (req, res) => {

  const {
    game,
    playerId,
    package: packageName
  } = req.body;

  if (!game || !playerId || !packageName) {
    return res.status(400).json({
      success: false,
      message: "Missing order information"
    });
  }

  const order = {
    orderId:
      "MGG-" +
      crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase(),

    game: game,
    playerId: playerId,
    package: packageName,
    status: "PENDING_PAYMENT",
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  res.json({
    success: true,
    order: order
  });
});

app.listen(PORT, () => {
  console.log(
    `MGG STORE Backend running on port ${PORT}`
  );
});
