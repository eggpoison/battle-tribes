import { angle, lerp } from "webgl-test-shared/dist/utils";
import { ServerComponentType, TunnelComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "webgl-test-shared/dist/packets";

const doorHalfDiagonalLength = Math.sqrt(16 * 16 + 48 * 48) / 2;
const angleToCenter = angle(16, 48);

export interface TunnelDoorInfo {
   readonly offsetX: number;
   readonly offsetY: number;
   readonly rotation: number;
}

const getTunnelDoorInfo = (doorBit: number, openProgress: number): TunnelDoorInfo => {
   const isTopDoor = doorBit === 0b01;

   const baseRotation = isTopDoor ? -Math.PI/2 : Math.PI/2;
   const rotation = baseRotation + lerp(0, Math.PI/2 - 0.1, openProgress);
   
   // Rotate around the top left corner of the door
   const offsetDirection = rotation + angleToCenter;
   const xOffset = doorHalfDiagonalLength * Math.sin(offsetDirection) - doorHalfDiagonalLength * Math.sin(baseRotation + angleToCenter);
   const yOffset = doorHalfDiagonalLength * Math.cos(offsetDirection) - doorHalfDiagonalLength * Math.cos(baseRotation + angleToCenter);

   return {
      offsetX: xOffset,
      offsetY: yOffset + (isTopDoor ? 32 : -32),
      rotation: rotation + Math.PI/2
   };
}

class TunnelComponent extends ServerComponent {
   private readonly doorRenderParts: Record<number, RenderPart> = {};
   public doorBitset: number;

   public topDoorOpenProgress: number;
   public bottomDoorOpenProgress: number;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);

      this.doorBitset = reader.readNumber();
      this.topDoorOpenProgress = reader.readNumber();
      this.bottomDoorOpenProgress = reader.readNumber();
      this.updateFromData(reader);
   }

   private addDoor(doorBit: number): void {
      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      
      const renderPart = new TexturedRenderPart(
         this.entity,
         0,
         doorBit === 0b10 ? Math.PI : 0,
         getTextureArrayIndex("entities/tunnel/tunnel-door.png")
      );
      renderPart.offset.y = doorBit === 0b10 ? -32 : 32;
      
      this.doorRenderParts[doorBit] = renderPart;
      this.entity.attachRenderPart(renderPart);

      // @Temporary
      playSound("spike-place.mp3", 0.5, 1, transformComponent.position);
   }

   private updateDoor(doorBit: number, openProgress: number): void {
      const doorInfo = getTunnelDoorInfo(doorBit, openProgress);

      const doorRenderPart = this.doorRenderParts[doorBit];
      doorRenderPart.offset.x = doorInfo.offsetX;
      doorRenderPart.offset.y = doorInfo.offsetY;
      doorRenderPart.rotation = doorInfo.rotation;
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
   }
   
   public updateFromData(reader: PacketReader): void {
      const doorBitset = reader.readNumber();
      const topDoorOpenProgress = reader.readNumber();
      const bottomDoorOpenProgress = reader.readNumber();

      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);

      if ((doorBitset & 0b01) !== (this.doorBitset & 0b01)) {
         this.addDoor(0b01);
      }
      if ((doorBitset & 0b10) !== (this.doorBitset & 0b10)) {
         this.addDoor(0b10);
      }

      // Play open/close sounds
      if ((topDoorOpenProgress > 0 && this.topDoorOpenProgress === 0) || (bottomDoorOpenProgress > 0 && this.bottomDoorOpenProgress === 0)) {
         playSound("door-open.mp3", 0.4, 1, transformComponent.position);
      }
      if ((topDoorOpenProgress < 1 && this.topDoorOpenProgress === 1) || (bottomDoorOpenProgress < 1 && this.bottomDoorOpenProgress === 1)) {
         playSound("door-close.mp3", 0.4, 1, transformComponent.position);
      }
      
      this.doorBitset = doorBitset;
      this.topDoorOpenProgress = topDoorOpenProgress;
      this.bottomDoorOpenProgress = bottomDoorOpenProgress;

      // Update the doors
      if ((this.doorBitset & 0b01) !== 0) {
         this.updateDoor(0b01, topDoorOpenProgress);
      }
      if ((this.doorBitset & 0b10) !== 0) {
         this.updateDoor(0b10, bottomDoorOpenProgress);
      }
   }

   public hasTopDoor(): boolean {
      return (this.doorBitset & 0b01) !== 0;
   }

   public hasBottomDoor(): boolean {
      return (this.doorBitset & 0b10) !== 0;
   }
}

export default TunnelComponent;