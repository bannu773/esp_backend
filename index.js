var express = require('express');
var app = express();
var WebSocketServer = require('websocket').server;
var http = require('http');
var server = http.createServer(app);
var mongoose = require('mongoose');
const cors = require('cors');

// Enable CORS
app.use(cors());
app.use(express.json());
// Load development environment.
require('dotenv').config({
    path: './dev.env'
});

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

//GET I
app.get('/api/v1/test', function (req, res) {
    console.log('GET Request');
    let results = { response: 'Hello World! Welcome to JP Learning :)' };
    return res.status(200).json(results);
});

app.post('/api/v1/test', function (req, res) {
    console.log('POST Request');
    console.log('POST req.body:', req.body);
    let results = { response: 'Successfully POST :)' };
    return res.status(201).json(results);
});

app.put('/api/v1/test/:id', function (req, res) {
    console.log('PUT Request');
    console.log('PUT req.body:', req.body);
    let results = { response: 'Successfully PUT :)', id: req.params.id };
    return res.status(200).json(results);
});

app.delete('/api/v1/test/:id', function (req, res) {
    console.log('DELETE Request');
    let results = { response: 'Successfully DELETE :)', id: req.params.id };
    return res.status(200).json(results);
});

// Status update endpoint
app.post('/update-status', async (req, res) => {
    const { status } = req.body;

    try {
        await Light.findOneAndUpdate({}, { status }, { upsert: true });

        // Notify web clients
        connectedClients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ status }));
            }
        });

        // Notify ESP8266
        if (espClient && espClient.readyState === espClient.OPEN) {
            espClient.send(JSON.stringify({ status }));
        }

        res.send('Light status updated successfully');
    } catch (err) {
        console.error('Error updating light status:', err);
        res.status(500).send('Error updating light status');
    }
});

// Update server startup
const PORT = process.env.PORT || 8080;
server.listen(PORT, function () {
    console.log(`Server listening on port ${PORT}!`);
}).on('error', function(err) {
    console.error('Server failed to start:', err);
});

// Track connected clients
const connectedClients = new Set();
let espClient = null;

// WebSocket server setup
const wsServer = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
    // TODO: Implement proper origin validation
    return true;
}

// Handle WebSocket connection requests
wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }
    
    const connection = request.accept(null, request.origin);
    console.log((new Date()) + ' Connection accepted.');
    
    // Check if the connection is from ESP8266 (you might want to add proper authentication)
    const isESP = request.httpRequest.headers['user-agent']?.includes('ESP8266');
    
    if (isESP) {
        espClient = connection;
        console.log('ESP8266 connected');
    } else {
        connectedClients.add(connection);
        console.log('Web client connected');
    }
    
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            console.log('Received Message: ' + message.utf8Data);
            // Handle the message as needed
        }
    });
    
    connection.on('close', function(reasonCode, description) {
        if (connection === espClient) {
            espClient = null;
            console.log('ESP8266 disconnected');
        } else {
            connectedClients.delete(connection);
            console.log('Web client disconnected');
        }
    });
});



