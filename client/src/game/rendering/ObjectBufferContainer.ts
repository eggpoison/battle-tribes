import { Bytes } from "../../../../shared/src/constants";
import { gl } from "../webgl";

/** Stores a group of buffers for use in instanced rendering */
class ObjectBufferContainer {
   // @Cleanup Access buffers using a string (key) instead of a buffer index
   
   private readonly objectsPerBuffer: number;
   private readonly dataLengths: number[] = [];

   private readonly bufferArrays: WebGLBuffer[][] = [];

   private readonly emptyBufferDatas: Float32Array[] = [];

   private readonly objectEntryIndexes: Partial<Record<number, number>> = {};

   private readonly availableIndexes: number[] = [];
   
   constructor(objectsPerBuffer: number) {
      this.objectsPerBuffer = objectsPerBuffer;

      // Add initial indexes
      for (let i = 0; i < objectsPerBuffer; i++) {
         this.availableIndexes.push(i);
      }
   }

   public registerNewBufferType(dataLength: number): void {
      this.dataLengths.push(dataLength);
      this.bufferArrays.push([]);
      this.emptyBufferDatas.push(new Float32Array(dataLength));
      
      const bufferType = this.dataLengths.length - 1;
      this.createNewBuffer(bufferType);
   }

   private createNewBuffer(bufferType: number): void {
      // Make the data empty for now
      const dataLength = this.dataLengths[bufferType];
      const data = new Float32Array(this.objectsPerBuffer * dataLength);

      gl.bindVertexArray(null);
      
      // Create buffer
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

      this.bufferArrays[bufferType].push(buffer);
   }

   public registerNewObject(objectID: number): void {
      // @Incomplete - Expand the buffer
      if (this.availableIndexes.length === 0) {
         console.log(objectID);
         console.log(this.objectEntryIndexes);
         throw new Error();
      }

      // Choose an available index to add the object to
      this.objectEntryIndexes[objectID] = this.availableIndexes[0];
      this.availableIndexes.splice(0, 1);
   }

   public setData(objectID: number, bufferType: number, data: Float32Array): void {
      if (this.objectEntryIndexes[objectID] === undefined) {
         throw new Error("No index for entity with ID " + objectID + ".");
      }

      if (bufferType >= this.bufferArrays.length) {
         throw new Error("No buffer type '" + bufferType + "'.");
      }
      
      if (data.byteLength !== this.dataLengths[bufferType] * Bytes.Float32) {
         throw new Error("Object data length (" + (data.byteLength / Bytes.Float32) + ") didn't match objectSize (" + this.dataLengths[bufferType] + ").");
      }
      
      const index = this.objectEntryIndexes[objectID];
      const bufferIndex = Math.floor(index / this.objectsPerBuffer);
      const indexInBuffer = index % this.objectsPerBuffer;
      
      gl.bindVertexArray(null);
      
      const buffer = this.bufferArrays[bufferType][bufferIndex];
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, indexInBuffer * data.byteLength, data);
   }

   public removeObject(objectID: number) {
      if (this.objectEntryIndexes[objectID] === undefined) {
         throw new Error("No index for entity with ID " + objectID + ".");
      }
      
      const index = this.objectEntryIndexes[objectID];

      gl.bindVertexArray(null);

      // Remove the object from all buffer types
      const bufferIndex = Math.floor(index / this.objectsPerBuffer);
      for (let bufferType = 0; bufferType < this.bufferArrays.length; bufferType++) {
         const buffer = this.bufferArrays[bufferType][bufferIndex];

         gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
         const indexInBuffer = index % this.objectsPerBuffer;
         gl.bufferSubData(gl.ARRAY_BUFFER, indexInBuffer * this.dataLengths[bufferType] * Bytes.Float32, this.emptyBufferDatas[bufferType]);
      }

      delete this.objectEntryIndexes[objectID];
      this.availableIndexes.push(index);
   }

   public getBuffers(bufferType: number): readonly WebGLBuffer[] {
      return this.bufferArrays[bufferType];
   }

   public getNumBuffers(): number {
      return this.bufferArrays[0].length;
   }
}

export default ObjectBufferContainer;