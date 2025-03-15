const express = require("express");
const path = require("path");
const cors = require("cors");
const readline = require("readline");

const { makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

let whatsappSocket;

async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
    whatsappSocket = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    whatsappSocket.ev.on("creds.update", saveCreds);

    console.log("WhatsApp Bot is ready!");
}

startWhatsApp();

app.post("/pair", async (req, res) => {
    if (!whatsappSocket) {
        return res.json({ error: "WhatsApp is not connected yet!" });
    }

    const { number } = req.body;
    if (!number) {
        return res.json({ error: "Phone number is required!" });
    }

    try {
        const pairingCode = await whatsappSocket.requestPairingCode(number);
        res.json({ success: `Pairing Code: ${pairingCode}` });
    } catch (error) {
        res.json({ error: "Failed to generate pairing code!" });
    }
});

app.post("/send-message", async (req, res) => {
    if (!whatsappSocket) {
        return res.json({ error: "WhatsApp is not connected yet!" });
    }

    const { targets, message, delay } = req.body;
    if (!targets || !message) {
        return res.json({ error: "Missing targets or message!" });
    }

    async function sendMessage(target) {
        try {
            await whatsappSocket.sendMessage(target, { text: message });
            console.log(`Message sent to ${target}: "${message}"`);
        } catch (error) {
            console.error(`Failed to send message to ${target}:`, error);
        }
    }

    (async () => {
        for (const target of targets) {
            await sendMessage(target);
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }
    })();

    res.json({ success: "Messages are being sent!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
