const socket = new WebSocket("ws://localhost:3002");

socket.onopen = () => {
  console.log("Kapcsolódva a WebSocket szerverhez");
};

socket.onerror = (error) => {
  console.error("WebSocket hiba:", error);
};

socket.onclose = () => {
  console.log("WebSocket kapcsolat bezárva");
};

export default socket;
