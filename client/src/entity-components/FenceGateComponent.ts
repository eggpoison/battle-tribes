import { angle, lerp } from "webgl-test-shared/dist/utils";
import { FenceGateComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import { RenderPart } from "../render-parts/render-parts";

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

class FenceGateComponent extends ServerComponent<ServerComponentType.fenceGate> {
   private readonly doorRenderPart: RenderPart;

   public openProgress: number;
   
   constructor(entity: Entity, data: FenceGateComponentData) {
      super(entity);

      this.openProgress = data.openProgress;

      this.doorRenderPart = this.entity.getRenderPart("fenceGateComponent:door");
      this.updateDoor(data.openProgress);
   }

   private updateDoor(openProgress: number): void {
      const doorInfo = getFenceGateDoorInfo(openProgress);

      this.doorRenderPart.offset.x = doorInfo.offsetX;
      this.doorRenderPart.offset.y = doorInfo.offsetY;
      this.doorRenderPart.rotation = doorInfo.rotation;
   }

   public updateFromData(data: FenceGateComponentData): void {
      this.openProgress = data.openProgress;
      
      this.updateDoor(data.openProgress);
   }
}

export default FenceGateComponent;