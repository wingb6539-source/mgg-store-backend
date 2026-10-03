const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ========================================
// KHMER TOP UP API
// ========================================
const TOPUP_API_URL = "https://khmer-topup.com/api/v1";
const TOPUP_API_KEY = process.env.TOPUP_API_KEY;

// Temporary local order storage
const orders = [];

// ========================================
// HELPER — KHMER TOP UP REQUEST
// ========================================
async function topupRequest(path, options = {}) {
  if (!TOPUP_API_KEY) {
    throw new Error("TOPUP_API_KEY is not configured");
  }

  const response = await fetch(`${TOPUP_API_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${TOPUP_API_KEY}`,
      "X-API-Key": TOPUP_API_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return {
    response,
    data
  };
}

// ========================================
// HOME
// ========================================
app.get("/", (req, res) => {
  res.json({
    success: true,
    store: "MGG STORE",
    version: "V2026",
    status: "online",
    autoTopup: TOPUP_API_KEY ? "ready" : "API_KEY_NOT_SET"
  });
});

// ========================================
// CHECK KHMER TOP UP ACCOUNT
// GET /api/topup/me
// ========================================
app.get("/api/topup/me", async (req, res) => {
  try {
    const { response, data } =
      await topupRequest("/me");

    res.status(response.status).json({
      success: response.ok,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// GET GAMES + PACKAGES
// GET /api/topup/games
// ========================================
app.get("/api/topup/games", async (req, res) => {
  try {
    const { response, data } =
      await topupRequest("/games");

    res.status(response.status).json({
      success: response.ok,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// VERIFY PLAYER
// GET /api/topup/check
//
// Example:
// /api/topup/check?slug=mobile-legends&player_id=12345678&server_id=1234
// ========================================
app.get("/api/topup/check", async (req, res) => {
  try {
    const {
      slug,
      player_id,
      server_id
    } = req.query;

    if (!slug || !player_id) {
      return res.status(400).json({
        success: false,
        error: "slug and player_id are required"
      });
    }

    const params = new URLSearchParams();

    params.set("slug", slug);
    params.set("player_id", player_id);

    if (server_id) {
      params.set("server_id", server_id);
    }

    const { response, data } =
      await topupRequest(`/check?${params.toString()}`);

    res.status(response.status).json({
      success: response.ok,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// CREATE KHMER TOP UP ORDER
// POST /api/topup/order
// ========================================
app.post("/api/topup/order", async (req, res) => {
  try {
    const {
      package_id,
      player_id,
      server_id,
      reference
    } = req.body;

    if (!package_id || !player_id) {
      return res.status(400).json({
        success: false,
        error: "package_id and player_id are required"
      });
    }

    // Always use a unique reference
    const orderReference =
      reference ||
      `MGG-${Date.now()}-${crypto.randomUUID()}`;

    const body = {
      package_id,
      player_id,
      reference: orderReference
    };

    if (server_id) {
      body.server_id = server_id;
    }

    const { response, data } =
      await topupRequest("/orders", {
        method: "POST",
        body: JSON.stringify(body)
      });

    // Save local copy
    orders.push({
      reference: orderReference,
      providerOrderCode:
        data?.order_code || null,
      package_id,
      player_id,
      server_id: server_id || null,
      status:
        data?.status || "UNKNOWN",
      createdAt:
        new Date().toISOString()
    });

    res.status(response.status).json({
      success: response.ok,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// GET KHMER TOP UP ORDER STATUS
// GET /api/topup/order/:orderCode
// ========================================
app.get("/api/topup/order/:orderCode", async (req, res) => {
  try {
    const { orderCode } = req.params;

    const { response, data } =
      await topupRequest(
        `/orders/${encodeURIComponent(orderCode)}`
      );

    res.status(response.status).json({
      success: response.ok,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// LOCAL ORDER
// ========================================
app.post("/api/orders", (req, res) => {
  try {
    const {
      game,
      package: packageName,
      price,
      playerId,
      player_id,
      serverId,
      server_id,
      customerOrderId
    } = req.body;

    const finalPlayerId =
      playerId || player_id;

    const finalServerId =
      serverId || server_id || null;

    if (!game || !packageName || !finalPlayerId) {
      return res.status(400).json({
        success: false,
        error:
          "game, package and playerId are required"
      });
    }

    const orderId =
      customerOrderId ||
      `MGG-${Date.now()}-${crypto
        .randomUUID()
        .slice(0, 8)
        .toUpperCase()}`;

    const order = {
      orderId,
      game,
      package: packageName,
      price: Number(price) || 0,
      playerId: finalPlayerId,
      serverId: finalServerId,
      status: "PAYMENT_PENDING",
      createdAt: new Date().toISOString()
    };

    orders.push(order);

    console.log("NEW LOCAL ORDER:", order);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order
    });

  } catch (error) {
    console.error(
      "CREATE ORDER ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========================================
// LOCAL ORDERS
// ========================================
app.get("/api/orders", (req, res) => {
  res.json({
    success: true,
    count: orders.length,
    orders
  });
});

// ========================================
// UPDATE LOCAL ORDER STATUS
// ========================================
app.patch(
  "/api/orders/:orderId/status",
  (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      const allowedStatuses = [
        "PAYMENT_PENDING",
        "PAID",
        "COMPLETED",
        "CANCELLED"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: "Invalid order status"
        });
      }

      const order = orders.find(
        item => item.orderId === orderId
      );

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found"
        });
      }

      order.status = status;
      order.updatedAt =
        new Date().toISOString();

      res.json({
        success: true,
        message: "Order status updated",
        order
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ========================================
// 404
// ========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

// ========================================
// START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(
    `MGG STORE Backend running on port ${PORT}`
  );
});
