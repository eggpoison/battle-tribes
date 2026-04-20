import { assert, Settings } from "../../../../shared/src";

let socket: WebSocket | null = null;

export function createSocket(onPacket: (msg: MessageEvent) => void, onSuccessfulConnection: () => void, onFailedConnection: () => void): void {
   assert(socket === null);
   
   // @SQUEAM
   // socket = new WebSocket(`ws://10.0.0.23:${Settings.SERVER_PORT}`);
   // Use 127.0.0.1 instea of localhost cuz localhost sometimes breaks it for reasons
   socket = new WebSocket(`ws://127.0.0.1:${Settings.SERVER_PORT}`);
   socket.binaryType = "arraybuffer";

   socket.onopen = onSuccessfulConnection;
   socket.onclose = onFailedConnection;
   socket.onmessage = onPacket;
}

export function killSocket(): void {
   assert(socket !== null);
   socket = null;
}

export function getNetworkBufferedBytes(): number {
   return socket!.bufferedAmount || -1;
}

export function sendData(buffer: ArrayBuffer): void {
   socket!.send(buffer);
}