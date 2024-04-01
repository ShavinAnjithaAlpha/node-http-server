import { prototype } from "events";
import * as net from "net";

function newCon(socket) {
  console.log("new connection ", socket.remoteAddress, socket.remotePort);

  socket.on("data", (data) => {});
}

// create a RCP server
let server = net.createServer();
server.on("connection", newCon);

server.listen({ host: "127.0.0.1", prot: 99 });
