import { angle, lerp } from "battletribes-shared/utils";
import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityID } from "../../../../shared/src/entities";
import { getEntityRenderInfo } from "../../world";
import RenderPart from "../../render-parts/RenderPart";
import ServerComponentArray from "../ServerComponentArray";

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

class FenceGateComponent {
   public readonly doorRenderPart: RenderPart;

   public openProgress = 0;
   
   constructor(entity: EntityID) {
      const renderInfo = getEntityRenderInfo(entity);
      this.doorRenderPart = renderInfo.getRenderThing("fenceGateComponent:door") as RenderPart;
   }
}

export default FenceGateComponent;

export const FenceGateComponentArray = new ServerComponentArray<FenceGateComponent>(ServerComponentType.fenceGate, true, {
   padData: padData,
   updateFromData: updateFromData
});

const updateDoor = (fenceGateComponent: FenceGateComponent): void => {
   const doorInfo = getFenceGateDoorInfo(fenceGateComponent.openProgress);

   fenceGateComponent.doorRenderPart.offset.x = doorInfo.offsetX;
   fenceGateComponent.doorRenderPart.offset.y = doorInfo.offsetY;
   fenceGateComponent.doorRenderPart.rotation = doorInfo.rotation;
}

function padData(reader: PacketReader): void {
   reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const fenceGateComponent = FenceGateComponentArray.getComponent(entity);
   
   // @Incomplete?
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
   fenceGateComponent.openProgress = reader.readNumber();
   
   updateDoor(fenceGateComponent);
}