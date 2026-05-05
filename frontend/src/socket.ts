let socket: WebSocket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = new WebSocket("ws://localhost:3001");
  }
  return socket;
};
