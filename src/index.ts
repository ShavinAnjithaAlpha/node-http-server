import * as net from "net";

// create a TCPConn object type to represent a TCP connection and store the promise's resolve and reject functions
type TCPConn = {
  // the JS socket object
  socket: net.Socket;

  // from the 'error' event
  err: null | Error;
  // EOF from the 'end' event
  ended: boolean;
  // the callback functions to resolve or reject the promise
  reader: null | {
    resolve: (value: Buffer) => void;
    reject: (reason: Error) => void;
  }
}

function soInit(socket: net.Socket): TCPConn {
  const conn: TCPConn = {
    socket: socket, reader: null, err: null, ended: false
  };

  socket.on("data", (data: Buffer) => {
    console.assert(conn.reader);
    // puase the 'data' event until next read
    conn.socket.pause();

    // fullfill the promise of the current read
    conn.reader!.resolve(data);
    conn.reader = null;
  });

  socket.on("end", () => {
    // fullfill the current read
    conn.ended = true;
    if (conn.reader) {
      conn.reader.resolve(Buffer.from(""));
      conn.reader = null;
    }
  })

  socket.on("error", (err: Error) => {
    // errors are also deleivered to the current read
    conn.err = err;
    if (conn.reader) {
      conn.reader.reject(err);
      conn.reader = null;
    }
  })

  return conn;
}

function soRead(conn: TCPConn): Promise<Buffer> {
  console.assert(!conn.reader); // no concurrent calls

  return new Promise((resolve, reject) => {
    if (conn.err) {
      reject(conn.err);
      return;
    }

    if (conn.ended) {
      resolve(Buffer.from("")); // EOF
      return;
    }
    // save the promise callbacks
    conn.reader = { resolve: resolve, reject: reject };
    // and resume the 'data' event to fullfill  the promise later
    conn.socket.resume();
  })
}

function soWrite(conn: TCPConn, data: Buffer): Promise<void> {
  console.assert(data.length > 0);

  return new Promise((resolve, reject) => {

    if (conn.err) {
      reject(conn.err);
      return;
    }
    conn.socket.write(data, (err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  })
}

async function newCon(socket: net.Socket): Promise<void> {
  console.log("new connection ", socket.remoteAddress, socket.remotePort);

  try {
    await serverClient(socket);
  } catch (exc) {
    console.error("client error: ", exc);
  } finally {
    socket.destroy();
  }
}

// echo server
async function serverClient(socket: net.Socket): Promise<void> {
  const conn: TCPConn = soInit(socket);

  while (true) {
    const data = await soRead(conn);
    if (data.length === 0) {
      console.log('end connection');
      break;
    }

    console.log("data: ", data);
    await soWrite(conn, data);
  }
}

// create a RCP server
let server = net.createServer({
  pauseOnConnect: true,
});
server.on("error", (err: Error) => {
  console.log("server error: ", err);
  server.close();
});
server.on("connection", newCon);

server.listen({ host: "127.0.0.1", port: 99 });
