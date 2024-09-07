import { EntityType } from "webgl-test-shared/dist/entities";
import { Point, lerp } from "webgl-test-shared/dist/utils";
import { Settings } from "webgl-test-shared/dist/settings";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import Board from "../Board";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import { RenderPart } from "../render-parts/render-parts";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { PacketReader } from "webgl-test-shared/dist/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";

export const WORKER_HUT_SIZE = 88;
export const WARRIOR_HUT_SIZE = 104;

const DOOR_OPEN_TICKS = Math.floor(0.15 * Settings.TPS);
const DOOR_REMAIN_TICKS = Math.floor(0.175 * Settings.TPS);
const DOOR_CLOSE_TICKS = Math.floor(0.175 * Settings.TPS);

const calculateDoorSwingAmount = (lastDoorSwingTicks: number): number => {
   const ticksSinceLastSwing = Board.serverTicks - lastDoorSwingTicks;
   if (ticksSinceLastSwing <= DOOR_OPEN_TICKS) {
      return lerp(0, 1, ticksSinceLastSwing / DOOR_OPEN_TICKS);
   } else if (ticksSinceLastSwing <= DOOR_OPEN_TICKS + DOOR_REMAIN_TICKS) {
      return 1;
   } else if (ticksSinceLastSwing <= DOOR_OPEN_TICKS + DOOR_REMAIN_TICKS + DOOR_CLOSE_TICKS) {
      return lerp(1, 0, (ticksSinceLastSwing - DOOR_OPEN_TICKS - DOOR_REMAIN_TICKS) / DOOR_CLOSE_TICKS);
   } else {
      return 0;
   }
}

type HutType = EntityType.workerHut | EntityType.warriorHut;

const getHutSize = (hutType: HutType): number => {
   switch (hutType) {
      case EntityType.workerHut: return WORKER_HUT_SIZE;
      case EntityType.warriorHut: return WARRIOR_HUT_SIZE;
   }
}

const getHutDoorHeight = (hutType: HutType): number => {
   switch (hutType) {
      case EntityType.workerHut: return 48;
      case EntityType.warriorHut: return 44;
   }
}

const getDoorXOffset = (hutType: HutType, i: number): number => {
   switch (hutType) {
      case EntityType.workerHut: return -getHutDoorHeight(hutType) / 2;
      case EntityType.warriorHut: return -40 * (i === 0 ? 1 : -1);
   }
}

class HutComponent extends ServerComponent {
   private readonly doorRenderParts: ReadonlyArray<RenderPart>;
   
   // @Memory: Don't need to store
   /** Amount the door should swing outwards from 0 to 1 */
   private doorSwingAmount: number;
   public isRecalling: boolean;

   private recallMarker: RenderPart | null = null;

   constructor(entity: Entity, reader: PacketReader) {
      super(entity);
      
      this.doorSwingAmount = calculateDoorSwingAmount(reader.readNumber());
      this.isRecalling = reader.readBoolean();
      reader.padOffset(3);
      
      this.doorRenderParts = this.entity.getRenderThings("hutComponent:door") as Array<RenderPart>;

      this.updateDoors();
   }

   private updateDoors(): void {
      for (let i = 0; i < this.doorRenderParts.length; i++) {
         const renderPart = this.doorRenderParts[i];
         
         const hutType = this.entity.type as HutType;
         const hutSize = getHutSize(hutType);
         const doorHeight = getHutDoorHeight(hutType);
         const doorXOffset = getDoorXOffset(hutType, i);
         
         // @Speed: Garbage collection
         
         const offset = new Point(doorXOffset, hutSize/2);
   
         const doorRotation = lerp(Math.PI/2, 0, this.doorSwingAmount) * (i === 0 ? 1 : -1);
         const rotationOffset = new Point(0, doorHeight / 2 - 2).convertToVector();
         rotationOffset.direction = doorRotation;
         offset.add(rotationOffset.convertToPoint());
   
         renderPart.offset.x = offset.x;
         renderPart.offset.y = offset.y;
   
         renderPart.rotation = lerp(Math.PI/2, 0, this.doorSwingAmount) * (i === 0 ? 1 : -1);
      }
   }

   public padData(reader: PacketReader): void {
      reader.padOffset(2 * Float32Array.BYTES_PER_ELEMENT);
   }

   public updateFromData(reader: PacketReader): void {
      const lastDoorSwingTicks = reader.readNumber();
      const isRecalling = reader.readBoolean();
      reader.padOffset(3);

      const transformComponent = this.entity.getServerComponent(ServerComponentType.transform);
      
      // @Incomplete: What if this packet is skipped?
      if (lastDoorSwingTicks === Board.serverTicks) {
         playSound("door-open.mp3", 0.4, 1, transformComponent.position);
      }
      
      this.isRecalling = isRecalling;
      this.doorSwingAmount = calculateDoorSwingAmount(lastDoorSwingTicks);
      this.updateDoors();

      if (this.isRecalling) {
         if (this.recallMarker === null) {
            this.recallMarker = new TexturedRenderPart(
               null,
               9,
               0,
               getTextureArrayIndex("entities/recall-marker.png")
            );
            this.recallMarker.inheritParentRotation = false;
            this.entity.attachRenderThing(this.recallMarker);
         }

         let opacity = Math.sin(transformComponent.ageTicks / Settings.TPS * 5) * 0.5 + 0.5;
         opacity = lerp(0.3, 1, opacity);
         this.recallMarker.opacity = lerp(0.3, 0.8, opacity);
      } else {
         if (this.recallMarker !== null) {
            this.entity.removeRenderPart(this.recallMarker);
            this.recallMarker = null;
         }
      }
   }
}

export default HutComponent;

export const HutComponentArray = new ComponentArray<HutComponent>(ComponentArrayType.server, ServerComponentType.hut, true, {});