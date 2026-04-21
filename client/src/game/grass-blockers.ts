import { Box, PacketReader } from "webgl-test-shared";
import { currentSnapshot } from "./networking/snapshots";
import Layer from "./Layer";
import { readBoxFromData } from "./networking/packet-hitboxes";
import { calculateGrassBlockerVertexData } from "./rendering/webgl/grass-blocker-rendering";
import { gl } from "./webgl";
import { layers } from "./world";

export interface GrassBlocker {
   readonly box: Box;
   /** Amount of grass that the blocker blocks (from 0 -> 1) */
   blockAmount: number;
   // @Bandwidth: unnecessary
   readonly maxBlockAmount: number;
   lastUpdateTicks: number;

   readonly vao: WebGLVertexArrayObject;
   readonly vertexBuffer: WebGLBuffer;
   // @Cleanup: should be readonly
   vertexDataLength: number;
}

export interface GrassBlockerData {
   readonly id: number;
   readonly box: Box;
   readonly layer: Layer;
   readonly blockAmount: number;
   readonly maxBlockAmount: number;
}

const grassBlockers = new Map<number, GrassBlocker>();

export function getGrassBlockers(): ReadonlyMap<number, Readonly<GrassBlocker>> {
   return grassBlockers;
}

const createGrassBlockerFromData = (data: GrassBlockerData): GrassBlocker => {
   const vao = gl.createVertexArray();
   const vertexBuffer = gl.createBuffer();

   const blocker: GrassBlocker = {
      box: data.box,
      blockAmount: data.blockAmount,
      maxBlockAmount: data.maxBlockAmount,
      lastUpdateTicks: currentSnapshot.tick,
      vao: vao,
      vertexBuffer: vertexBuffer,
      vertexDataLength: 0
   };

   gl.bindVertexArray(vao);

   const vertexData = calculateGrassBlockerVertexData(blocker);
   blocker.vertexDataLength = vertexData.length;
   
   gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
   gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 3 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

   gl.enableVertexAttribArray(0);
   gl.enableVertexAttribArray(1);

   // @Speed
   gl.bindVertexArray(null);

   return blocker;
}

const updateGrassBlockerVertices = (blocker: GrassBlocker): void => {
   gl.bindVertexArray(blocker.vao);

   const newVertexData = calculateGrassBlockerVertexData(blocker);
   
   gl.bindBuffer(gl.ARRAY_BUFFER, blocker.vertexBuffer);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, newVertexData);
   
   gl.bindVertexArray(null);
}

export function readGrassBlockers(reader: PacketReader): ReadonlyArray<GrassBlockerData> {
   const grassBlockerData: Array<GrassBlockerData> = [];
   const numBlockers = reader.readNumber();
   for (let i = 0; i < numBlockers; i++) {
      const id = reader.readNumber();
      
      const layerIdx = reader.readNumber();
      const layer = layers[layerIdx];
      
      const box = readBoxFromData(reader);
      const blockAmount = reader.readNumber();
      const maxBlockAmount = reader.readNumber();
      
      const data: GrassBlockerData = {
         id: id,
         box: box,
         layer: layer,
         blockAmount: blockAmount,
         maxBlockAmount: maxBlockAmount
      };
      grassBlockerData.push(data);
   }
   return grassBlockerData;
}

export function updateGrassBlockersFromData(grassBlockerData: ReadonlyArray<GrassBlockerData>): void {
   for (const data of grassBlockerData) {
      const existingGrassBlocker = grassBlockers.get(data.id);
      if (existingGrassBlocker !== undefined) {
         // Update grass blocker
         existingGrassBlocker.blockAmount = data.blockAmount;
         updateGrassBlockerVertices(existingGrassBlocker);
         existingGrassBlocker.lastUpdateTicks = currentSnapshot.tick;
      } else {
         const grassBlocker = createGrassBlockerFromData(data);
         grassBlockers.set(data.id, grassBlocker);
      }
   }

   // Check for removed blockers
   for (const pair of grassBlockers) {
      const blocker = pair[1];
      if (blocker.lastUpdateTicks !== currentSnapshot.tick) {
         const id = pair[0];
         grassBlockers.delete(id);
      }
   }
}