// server.js (CommonJS version)
const express = require("express");
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const cors = require("cors");
const { Pool } = require("pg");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // serve frontend files from 'public' folder

// PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Root
app.get("/", (req, res) => {
  res.send("LJ Foods API is running ✅");
});

// Create order
app.post("/create_order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, items, customer } = req.body;
    const order = await razorpay.orders.create({ amount, currency, receipt });

    // Save to DB - using razorpay_order_id as reference
    const insertOrder = `
      INSERT INTO orders (razorpay_order_id, amount, currency, status)
      VALUES ($1, $2, $3, $4) RETURNING id
    `;
    const orderResult = await pool.query(insertOrder, [
      order.id,
      order.amount,
      order.currency,
      order.status,
    ]);

    const orderId = orderResult.rows[0].id;

    // Insert items if provided
    if (items && items.length > 0) {
      for (let item of items) {
        await pool.query(
          `INSERT INTO order_items (order_id, product_sku, product_name, price, qty) VALUES ($1,$2,$3,$4,$5)`,
          [orderId, item.sku || null, item.name || null, item.price || 0, item.qty || 1]
        );
      }
    }

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("create_order error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Payment callback/verify
app.post("/payment_callback", async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // find our internal order id (optional)
    const r = await pool.query(
      "SELECT id FROM orders WHERE razorpay_order_id = $1 LIMIT 1",
      [razorpay_order_id]
    );
    const order_id = r.rows.length ? r.rows[0].id : null;

    // store payment audit
    await pool.query(
      `INSERT INTO payments (order_id, razorpay_payment_id, status, raw_response)
       VALUES ($1,$2,$3,$4)`,
      [order_id, razorpay_payment_id, "paid", JSON.stringify(req.body)]
    );

    // update orders table status
    if (order_id) {
      await pool.query(
        `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
        ["paid", order_id]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("payment_callback error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
