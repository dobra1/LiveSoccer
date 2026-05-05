const WebSocket = require("ws");
const { handleConnection } = require("./game/GameLoop");

const wss = new WebSocket.Server({ port: 3001 });

wss.on("connection", handleConnection);

console.log("WebSocket szerver fut: ws://localhost:3001");
