import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import 'dotenv/config'; // Loads your .env variables automatically

const app = express();
app.use(express.json());
app.use(express.static('.')); // Serves your index.html file

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
const base = "https://paypal.com"

// Step 1: Authenticate with PayPal
async function getAccessToken() {
    const resp = await fetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        body: "grant_type=client_credentials",
        headers: { 
            Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")}` 
        }
    });
    const data = await resp.json();
    return data.access_token;
}

// Step 2: Handle the Withdrawal Endpoint
app.post("/api/withdraw", async (req, res) => {
    const { email, amount } = req.body;

    try {
        const accessToken = await getAccessToken();
        
        // Generate a unique sender batch ID using the current time
        const senderBatchId = `Withdraw_${Date.now()}`;

        const response = await fetch(`${base}/v1/payments/payouts`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json", 
                Authorization: `Bearer ${accessToken}` 
            },
            body: JSON.stringify({
                sender_batch_header: {
                    sender_batch_id: senderBatchId,
                    email_subject: "You have a withdrawal from our platform!",
                    recipient_type: "EMAIL"
                },
                items: [
                    {
                        recipient_type: "EMAIL",
                        amount: {
                            value: parseFloat(amount).toFixed(2),
                            currency: "USD"
                        },
                        receiver: email,
                        note: "Thank you for using our platform."
                    }
                ]
            })
        });

        const payoutResult = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(payoutResult);
        }

        res.json(payoutResult);
    } catch (error) {
        res.status(500).json({ message: "Internal server error occurred." });
    }
});

app.listen(8080, () => console.log("Server running on http://localhost:8080"));
