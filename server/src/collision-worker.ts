import { parentPort } from "worker_threads";
// import Board from "./Board";

// @Incomplete
parentPort!.on("message", (startingChunkIndex: number, numChunks: number) => {
   // for (let i = startingChunkIndex; i < startingChunkIndex + numChunks; i++) {
   //    const chunk = Board.chunks[i];
   // }
});