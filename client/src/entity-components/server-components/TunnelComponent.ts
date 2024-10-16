import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { angle, lerp } from "../../../../shared/src/utils";
import RenderPart from "../../render-parts/RenderPart";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSound } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import TransformComponent, { TransformComponentArray } from "./TransformComponent";

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

class TunnelComponent {
   public readonly doorRenderParts: Record<number, RenderPart> = {};
   public doorBitset = 0;

   public topDoorOpenProgress = 0;
   public bottomDoorOpenProgress = 0;

   public hasTopDoor(): boolean {
      return (this.doorBitset & 0b01) !== 0;
   }

   public hasBottomDoor(): boolean {
      return (this.doorBitset & 0b10) !== 0;
   }
}

export default TunnelComponent;

export const TunnelComponentArray = new ServerComponentArray<TunnelComponent>(ServerComponentType.tunnel, true, {
   padData: padData,
   updateFromData: updateFromData
});

const addDoor = (tunnelComponent: TunnelComponent, transformComponent: TransformComponent, entity: EntityID, doorBit: number): void => {
   const renderPart = new TexturedRenderPart(
      null,
      0,
      doorBit === 0b10 ? Math.PI : 0,
      getTextureArrayIndex("entities/tunnel/tunnel-door.png")
   );
   renderPart.offset.y = doorBit === 0b10 ? -32 : 32;
   
   tunnelComponent.doorRenderParts[doorBit] = renderPart;

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderThing(renderPart);

   // @Temporary
   playSound("spike-place.mp3", 0.5, 1, transformComponent.position);
}

const updateDoor = (tunnelComponent: TunnelComponent, doorBit: number, openProgress: number): void => {
   const doorInfo = getTunnelDoorInfo(doorBit, openProgress);

   const doorRenderPart = tunnelComponent.doorRenderParts[doorBit];
   doorRenderPart.offset.x = doorInfo.offsetX;
   doorRenderPart.offset.y = doorInfo.offsetY;
   doorRenderPart.rotation = doorInfo.rotation;
}

function padData(reader: PacketReader): void {
   reader.padOffset(3 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const tunnelComponent = TunnelComponentArray.getComponent(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const doorBitset = reader.readNumber();
   const topDoorOpenProgress = reader.readNumber();
   const bottomDoorOpenProgress = reader.readNumber();

   if ((doorBitset & 0b01) !== (tunnelComponent.doorBitset & 0b01)) {
      addDoor(tunnelComponent, transformComponent, entity, 0b01);
   }
   if ((doorBitset & 0b10) !== (tunnelComponent.doorBitset & 0b10)) {
      addDoor(tunnelComponent, transformComponent, entity, 0b10);
   }

   // Play open/close sounds
   if ((topDoorOpenProgress > 0 && tunnelComponent.topDoorOpenProgress === 0) || (bottomDoorOpenProgress > 0 && tunnelComponent.bottomDoorOpenProgress === 0)) {
      playSound("door-open.mp3", 0.4, 1, transformComponent.position);
   }
   if ((topDoorOpenProgress < 1 && tunnelComponent.topDoorOpenProgress === 1) || (bottomDoorOpenProgress < 1 && tunnelComponent.bottomDoorOpenProgress === 1)) {
      playSound("door-close.mp3", 0.4, 1, transformComponent.position);
   }
   
   tunnelComponent.doorBitset = doorBitset;
   tunnelComponent.topDoorOpenProgress = topDoorOpenProgress;
   tunnelComponent.bottomDoorOpenProgress = bottomDoorOpenProgress;

   // Update the doors
   if ((tunnelComponent.doorBitset & 0b01) !== 0) {
      updateDoor(tunnelComponent, 0b01, topDoorOpenProgress);
   }
   if ((tunnelComponent.doorBitset & 0b10) !== 0) {
      updateDoor(tunnelComponent, 0b10, bottomDoorOpenProgress);
   }
}