const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Temporary order storage
const orders = [];

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

// Create Order
app.post("/api/orders", (req, res) => {

  const {
    game,
    package: diamondPackage,
    playerId,
    paymentMethod,
    transactionId
  } = req.body;

  if (!game || !diamondPackage || !playerId || !paymentMethod) {
    return res.status(400).json({
      success: false,
      message: "Missing required information."
    });
  }

  const order = {
    id: `MGG-${Date.now()}`,
    game,
    package: diamondPackage,
    playerId,
    paymentMethod,
    transactionId: transactionId || "",
    status: "pending",
    paymentStatus: "pending",
    createdAt: new Date().toISOString()
  };

  orders.push(order);

  res.status(201).json({
    success: true,
    message: "Order created successfully.",
    order
  });
});

// Get Orders
app.get("/api/orders", (req, res) => {
  res.json({
    success: true,
    orders
  });
});

// Verify Payment
app.post("/api/orders/:id/verify", (req, res) => {

  const order = orders.find(
    item => item.id === req.params.id
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found."
    });
  }

  order.paymentStatus = "verified";
  order.status = "paid";

  res.json({
    success: true,
    message: "Payment verified.",
    order
  });
});

// Reject Payment
app.post("/api/orders/:id/reject", (req, res) => {

  const order = orders.find(
    item => item.id === req.params.id
  );

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Order not found."
    });
  }

  order.paymentStatus = "rejected";
  order.status = "cancelled";

  res.json({
    success: true,
    message: "Payment rejected.",
    order
  });
});

app.listen(PORT, () => {
  console.log(
    `MGG STORE Backend running on port ${PORT}`
  );
});
