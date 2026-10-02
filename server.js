const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const TOPUP_API_URL =
  "https://reseller-api.kasplay.kascambodia.com/api/v1/reseller/v1";

const TOPUP_API_KEY = process.env.TOPUP_API_KEY;

// Temporary local order storage
const orders = [];

// =========================
// HOME
// =========================
app.get("/", (req, res) => {
  res.json({
    success: true,
    store: "MGG STORE",
    version: "V2026",
    status: "online",
    autoTopup: TOPUP_API_KEY ? "ready" : "API_KEY_NOT_SET"
  });
});

// =========================
// CHECK KAS PLAY PROFILE
// =========================
app.get("/api/topup/profile", async (req, res) => {
  try {
    if (!TOPUP_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "TOPUP_API_KEY is not configured"
      });
    }

    const response = await fetch(
      `${TOPUP_API_URL}/profile`,
      {
        headers: {
          "X-API-Key": TOPUP_API_KEY
        }
      }
    );

    const data = await response.json();

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================
// GET GAMES
// =========================
app.get("/api/topup/games", async (req, res) => {
  try {
    if (!TOPUP_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "TOPUP_API_KEY is not configured"
      });
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 50;

    const response = await fetch(
      `${TOPUP_API_URL}/games?page=${page}&limit=${limit}`,
      {
        headers: {
          "X-API-Key": TOPUP_API_KEY
        }
      }
    );

    const data = await response.json();

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================
// GET GAME PACKAGES
// =========================
app.get("/api/topup/games/:slug/packages", async (req, res) => {
  try {
    if (!TOPUP_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "TOPUP_API_KEY is not configured"
      });
    }

    const { slug } = req.params;

    const response = await fetch(
      `${TOPUP_API_URL}/games/${encodeURIComponent(slug)}/packages`,
      {
        headers: {
          "X-API-Key": TOPUP_API_KEY
        }
      }
    );

    const data = await response.json();

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================
// VERIFY PLAYER
// =========================
app.post("/api/topup/verify-player", async (req, res) => {
  try {
    if (!TOPUP_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "TOPUP_API_KEY is not configured"
      });
    }

    const {
      slug,
      player_id,
      server_id
    } = req.body;

    if (!slug || !player_id) {
      return res.status(400).json({
        success: false,
        error: "slug and player_id are required"
      });
    }

    const fields = {
      player_id
    };

    if (server_id) {
      fields.server_id = server_id;
    }

    const response = await fetch(
      `${TOPUP_API_URL}/validate-player`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": TOPUP_API_KEY
        },
        body: JSON.stringify({
          slug,
          fields
        })
      }
    );

    const data = await response.json();

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// =========================
// AUTO TOP UP ORDER
// =========================
app.post("/api/topup/order", async (req, res) => {
  try {
    if (!TOPUP_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "TOPUP_API_KEY is not configured"
      });
    }

    const {
      packageId,
      player_id,
      server_id,
      customerOrderId
    } = req.body;

    if (!packageId || !player_id) {
      return res.status(400).json({
        success: false,
        error: "packageId and player_id are required"
      });
    }

    const idempotencyKey =
      customerOrderId || crypto.randomUUID();

    const fields = {
      player_id
    };

    if (server_id) {
      fields.server_id = server_id;
    }

    const response = await fetch(
      `${TOPUP_API_URL}/order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": TOPUP_API_KEY
        },
        body: JSON.stringify({
          packageId,
          fields,
          idempotencyKey
        })
      }
    );

    const data = await response.json();

    orders.push({
      customerOrderId: customerOrderId || null,
      providerOrderId: data?.data?.orderId || null,
      packageId,
      player_id,
      server_id: server_id || null,
      status: data?.data?.status || "UNKNOWN",
      createdAt: new Date().toISOString()
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

// =========================
// CREATE LOCAL ORDER
// =========================

app.post("/api/orders", (req, res) => {
  try {

    const {
      game,
      package: packageName,
      price,

      // Accept both names
      playerId,
      player_id,

      customerOrderId
    } = req.body;

    const finalPlayerId =
      playerId || player_id;

    if (!game || !packageName || !finalPlayerId) {
      return res.status(400).json({
        success: false,
        error: "game, package and playerId are required"
      });
    }

    const orderId =
      customerOrderId ||
      "MGG-" +
      Date.now() +
      "-" +
      crypto.randomUUID()
        .slice(0, 8)
        .toUpperCase();

    const order = {

      orderId,

      game,

      package: packageName,

      price: Number(price) || 0,

      playerId: finalPlayerId,

      player_id: finalPlayerId,

      status: "PAYMENT_PENDING",

      createdAt: new Date().toISOString()

    };

    orders.push(order);

    console.log("NEW ORDER:", order);

    res.status(201).json({

      success: true,

      message: "Order created successfully",

      order

    });

  } catch (error) {

    console.error("CREATE ORDER ERROR:", error);

    res.status(500).json({

      success: false,

      error: error.message

    });

  
  }
});

// =========================
// LOCAL ORDERS
// =========================
app.get("/api/orders", (req, res) => {
  res.json({
    success: true,
    count: orders.length,
    orders
  });
});
/* =========================
UPDATE ORDER STATUS
========================= */

app.patch("/api/orders/:orderId/status", (req, res) => {
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
order.updatedAt = new Date().toISOString();

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
});
// =========================
// 404
// =========================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found"
  });
});

// =========================
// START SERVER
// =========================
app.listen(PORT, () => {
  console.log(
    `MGG STORE Backend running on port ${PORT}`
  );
});
      
