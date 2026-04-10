import { TribeType, Settings, assert } from "../../../../shared/src";

let socket: WebSocket | null = null;

export function getNetworkBufferedBytes(): number {
   return socket?.bufferedAmount || -1;
}

export function killSocket(): void {
   assert(socket !== null);
   socket = null;
}

export function establishNewNetworkConnection(username: string, tribeType: TribeType, isSpectating: boolean, onSuccessfulConnection: (username: string, tribeType: TribeType, isSpectating: boolean) => void, onFailedConnection: () => void, onPacket: (msg: MessageEvent) => void): void {
   assert(socket === null);
   
   // @SQUEAM
   // socket = new WebSocket(`ws://10.0.0.10:${Settings.SERVER_PORT}`);
   // Use 127.0.0.1 instea of localhost cuz localhost sometimes breaks it for reasons
   socket = new WebSocket(`ws://127.0.0.1:${Settings.SERVER_PORT}`);
   socket.binaryType = "arraybuffer";

   socket.onopen = (): void => { onSuccessfulConnection(username, tribeType, isSpectating); };
   socket.onclose = onFailedConnection;
   socket.onmessage = onPacket;
}

export function sendData(buffer: ArrayBufferLike): void {
   socket?.send(buffer);
}