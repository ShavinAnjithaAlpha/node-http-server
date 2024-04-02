import * as net from "net";

function newCon(socket) {
  console.log("new connection ", socket.remoteAddress, socket.remotePort);

  socket.on("end", () => {
    // FIN recieved from the client; collection will be closed automatically
    console.log("EOF");
  });

  socket.on("data", (data) => {
    console.log("data: ", data);
    // echo back the data again
    socket.write(data);

    // actively close the connection if the data includes letter 'q'
    if (data.includes("q")) {
      console.log("closing the connection");
      socket.end();
    }
  });
}

// create a RCP server
let server = net.createServer();
server.on("error", (err) => {
  console.log("server error: ", err);
  server.close();
});
server.on("connection", newCon);

server.listen({ host: "127.0.0.1", port: 99 });
