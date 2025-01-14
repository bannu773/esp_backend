const express = require('express');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb+srv://bandihemanth7731:bandi824@esp.zrwur.mongodb.net/?retryWrites=true&w=majority&appName=ESP', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// MongoDB Schema and Model
const LightSchema = new mongoose.Schema({
    status: { type: String, required: true }
});
const Light = mongoose.model('Light', LightSchema);

// WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });
let connectedClients = [];

wss.on('connection', (ws) => {
    console.log('Client connected');
    connectedClients.push(ws);

    ws.on('close', () => {
        console.log('Client disconnected');
        connectedClients = connectedClients.filter((client) => client !== ws);
    });
});

// REST API to Update Light Status
app.post('/update-status', async (req, res) => {
    const { status } = req.body;

    try {
        // Find and update the existing record, or create if none exists
        await Light.findOneAndUpdate(
            {}, // empty filter to match any document
            { status },
            { upsert: true } // create if doesn't exist
        );

        // Notify WebSocket clients
        connectedClients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ status }));
            }
        });

        res.send('Light status updated successfully');
    } catch (err) {
        console.error('Error updating light status:', err);
        res.status(500).send('Error updating light status');
    }
});

// Start the Express server
app.listen(5000, () => {
    console.log('Server running on http://localhost:5000');
});
