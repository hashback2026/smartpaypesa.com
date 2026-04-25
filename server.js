require("dotenv").config();
const express = require("express");
const axios = require("axios");
const PQueue = require("p-queue").default;
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

const queue = new PQueue({
  interval: 1000,
  intervalCap: 3
});

const API_URL = "https://api.smartpaypesa.com/v1/initiatestk";

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/send-stk", async (req, res) => {
  const { numbers, amount } = req.body;

  if (!numbers || numbers.length === 0) {
    return res.status(400).json({ error: "No numbers provided" });
  }

  let results = [];

  await Promise.all(
    numbers.map((phone) =>
      queue.add(async () => {
        try {
          const response = await axios.post(
            API_URL,
            {
              phone: phone,
              amount: amount,
              account_reference: "BulkPayment",
              transaction_desc: "Bulk STK Push"
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: process.env.SMARTPAY_API_KEY
              }
            }
          );

          results.push({
            phone,
            status: "success",
            data: response.data
          });
        } catch (error) {
          results.push({
            phone,
            status: "failed",
            error: error.response?.data || error.message
          });
        }
      })
    )
  );

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
