import { angle, lerp } from "webgl-test-shared/dist/utils";
import { ServerComponentType, TunnelComponentData } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { playSound } from "../sound";

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

class TunnelComponent extends ServerComponent<ServerComponentType.tunnel> {
   private readonly doorRenderParts: Record<number, RenderPart> = {};
   public doorBitset: number;

   public topDoorOpenProgress: number;
   public bottomDoorOpenProgress: number;
   
   constructor(entity: Entity, data: TunnelComponentData) {
      super(entity);

      this.doorBitset = 0;
      this.topDoorOpenProgress = data.topDoorOpenProgress;
      this.bottomDoorOpenProgress = data.bottomDoorOpenProgress;
      this.updateFromData(data);
   }

   private addDoor(doorBit: number): void {
      const renderPart = new RenderPart(
         this.entity,
         getTextureArrayIndex("entities/tunnel/tunnel-door.png"),
         0,
         doorBit === 0b10 ? Math.PI : 0
      );
      renderPart.offset.y = doorBit === 0b10 ? -32 : 32;
      
      this.doorRenderParts[doorBit] = renderPart;
      this.entity.attachRenderPart(renderPart);

      // @Temporary
      playSound("spike-place.mp3", 0.5, 1, this.entity.position.x, this.entity.position.y);
   }

   private updateDoor(doorBit: number, openProgress: number): void {
      const doorInfo = getTunnelDoorInfo(doorBit, openProgress);

      const doorRenderPart = this.doorRenderParts[doorBit];
      doorRenderPart.offset.x = doorInfo.offsetX;
      doorRenderPart.offset.y = doorInfo.offsetY;
      doorRenderPart.rotation = doorInfo.rotation;
   }

   public updateFromData(data: TunnelComponentData): void {
      if ((data.doorBitset & 0b01) !== (this.doorBitset & 0b01)) {
         this.addDoor(0b01);
      }
      if ((data.doorBitset & 0b10) !== (this.doorBitset & 0b10)) {
         this.addDoor(0b10);
      }

      // Play open/close sounds
      if ((data.topDoorOpenProgress > 0 && this.topDoorOpenProgress === 0) || (data.bottomDoorOpenProgress > 0 && this.bottomDoorOpenProgress === 0)) {
         playSound("door-open.mp3", 0.4, 1, this.entity.position.x, this.entity.position.y);
      }
      if ((data.topDoorOpenProgress < 1 && this.topDoorOpenProgress === 1) || (data.bottomDoorOpenProgress < 1 && this.bottomDoorOpenProgress === 1)) {
         playSound("door-close.mp3", 0.4, 1, this.entity.position.x, this.entity.position.y);
      }
      
      this.doorBitset = data.doorBitset;
      this.topDoorOpenProgress = data.topDoorOpenProgress;
      this.bottomDoorOpenProgress = data.bottomDoorOpenProgress;

      // Update the doors
      if ((this.doorBitset & 0b01) !== 0) {
         this.updateDoor(0b01, data.topDoorOpenProgress);
      }
      if ((this.doorBitset & 0b10) !== 0) {
         this.updateDoor(0b10, data.bottomDoorOpenProgress);
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