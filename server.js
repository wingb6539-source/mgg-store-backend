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

// Temporary order storage
const orders = [];

// -------------------------
// HOME
// -------------------------
app.get("/", (req, res) => {
  res.json({
    store: "MGG STORE",
    status: "online",
    autoTopup: TOPUP_API_KEY ? "ready" : "API_KEY_NOT_SET"
  });
});

// -------------------------
// CHECK API CONNECTION
// -------------------------
app.get("/api/topup/profile", async (req, res) => {
  try {
    if (!TOPUP_API_KEY) {
      return res.status(500).json({
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

// -------------------------
// VERIFY PLAYER
// -------------------------
app.post("/api/topup/verify-player", async (req, res) => {
  try {
    if (!TOPUP_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "TOPUP_API_KEY is not configured"
      });
    }

    const {
      providerCategoryId,
      player_id,
      server_id
    } = req.body;

    if (!providerCategoryId || !player_id) {
      return res.status(400).json({
        success: false,
        error: "providerCategoryId and player_id are required"
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
          providerCategoryId,
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

// -------------------------
// AUTO TOP UP
// -------------------------
app.post("/api/topup/order", async (req, res) => {
  try {
    if (!TOPUP_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "TOPUP_API_KEY is not configured"
      });
    }

    const {
      packageId,
      providerCategoryId,
      player_id,
      server_id,
      customerOrderId
    } = req.body;

    if (!packageId || !providerCategoryId || !player_id) {
      return res.status(400).json({
        success: false,
        error: "packageId, providerCategoryId and player_id are required"
      });
    }

    // Unique key prevents accidental duplicate top-up
    const idempotencyKey =
      customerOrderId ||
      crypto.randomUUID();

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

    // Save local order
    orders.push({
      customerOrderId,
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

// -------------------------
// LOCAL ORDERS
// -------------------------
app.get("/api/orders", (req, res) => {
  res.json({
    success: true,
    orders
  });
});

// -------------------------
// START SERVER
// -------------------------
app.listen(PORT, () => {
  console.log(`MGG STORE Backend running on port ${PORT}`);
});
