import { angle, lerp } from "webgl-test-shared/dist/utils";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { RenderPart } from "../render-parts/render-parts";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "webgl-test-shared/dist/components";

interface DoorInfo {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
}

const doorWidth = 52;
const doorHeight = 16;

const doorHalfDiagonalLength = Math.sqrt(doorHeight * doorHeight + doorWidth * doorWidth) / 2;
const angleToCenter = angle(doorHeight, doorWidth);

const getFenceGateDoorInfo = (openProgress: number): DoorInfo => {
   const baseRotation = Math.PI/2;
   const rotation = baseRotation - lerp(0, Math.PI/2 - 0.1, openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = rotation + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(baseRotation + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(baseRotation + angleToCenter);

   return {
      offsetX: xOffset,
      offsetY: yOffset,
      rotation: rotation - Math.PI/2
   };
}

class FenceGateComponent extends ServerComponent {
   private readonly doorRenderPart: RenderPart;

   public openProgress: number;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      this.openProgress = reader.readNumber();

      this.doorRenderPart = this.entity.getRenderPart("fenceGateComponent:door");
      this.updateDoor();
   }

   private updateDoor(): void {
      const doorInfo = getFenceGateDoorInfo(this.openProgress);

      this.doorRenderPart.offset.x = doorInfo.offsetX;
      this.doorRenderPart.offset.y = doorInfo.offsetY;
      this.doorRenderPart.rotation = doorInfo.rotation;
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
      this.openProgress = reader.readNumber();
      
      this.updateDoor();
   }
}

export default FenceGateComponent;

export const FenceGateComponentArray = new ComponentArray<FenceGateComponent>(ComponentArrayType.server, ServerComponentType.fenceGate, {});