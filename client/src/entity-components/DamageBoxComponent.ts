import ServerComponent from "./ServerComponent";
import { PacketReader } from "webgl-test-shared/dist/packets";
import Entity from "../Entity";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { DamageBoxType, ServerComponentType } from "webgl-test-shared/dist/components";
import CircularBox from "webgl-test-shared/dist/boxes/CircularBox";
import { Point } from "webgl-test-shared/dist/utils";
import { BoxType } from "webgl-test-shared/dist/boxes/boxes";
import RectangularBox from "webgl-test-shared/dist/boxes/RectangularBox";
import { ClientDamageBoxWrapper, createDamageBox } from "../boxes";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import Board from "../Board";

interface DamageBoxCollisionInfo {
   readonly collidingEntity: EntityID;
   readonly collidingDamageBox: ClientDamageBoxWrapper;
}

// @Hack: this whole thing is cursed
const getCollidingDamageBox = (entity: EntityID, damageBox: ClientDamageBoxWrapper): DamageBoxCollisionInfo | null => {
   // @Hack
   const CHECK_PADDING = 200;
   const minChunkX = Math.max(Math.min(Math.floor((damageBox.box.position.x - CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((damageBox.box.position.x + CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((damageBox.box.position.y - CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((damageBox.box.position.y + CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const currentEntity of chunk.entities) {
            if (currentEntity === entity || !DamageBoxComponentArray.hasComponent(currentEntity)) {
               continue;
            }

            const damageBoxComponent = DamageBoxComponentArray.getComponent(currentEntity);
            for (const currentDamageBox of damageBoxComponent.damageBoxes) { 
               if (damageBox.box.isColliding(currentDamageBox.box)) {
                  return {
                     collidingEntity: currentEntity,
                     collidingDamageBox: currentDamageBox
                  };
               }
            }
         }
      }
   }

   return null;
}

class DamageBoxComponent extends ServerComponent {
   public readonly damageBoxes = new Array<ClientDamageBoxWrapper>();
   private readonly damageBoxLocalIDs = new Array<number>();
   private readonly damageBoxesRecord: Partial<Record<number, ClientDamageBoxWrapper>> = {};
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);
      
      this.readInData(reader);
   }

   public tick(): void {
      for (let i = 0; i < this.damageBoxes.length; i++) {
         const damageBox = this.damageBoxes[i];
         
         // const limbInfo = inventoryUseComponent.getLimbInfo(damageBox.associatedLimbInventoryName);

         if (damageBox.type === DamageBoxType.attacking) {
            const collisionInfo = getCollidingDamageBox(this.entity.id, damageBox);
            
            if (collisionInfo !== null && collisionInfo.collidingDamageBox.type === DamageBoxType.blocking && damageBox.collidingDamageBox !== collisionInfo.collidingDamageBox) {
               console.warn("bad");

               damageBox.collidingDamageBox = collisionInfo.collidingDamageBox;
            } else {
               damageBox.collidingDamageBox = null;
            }
            
         }
      }
   }

   public padData(reader: PacketReader): void {
      const numCircular = reader.readNumber();
      reader.padOffset(8 * Float32Array.BYTES_PER_ELEMENT * numCircular);
      const numRectangular = reader.readNumber();
      reader.padOffset(10 * Float32Array.BYTES_PER_ELEMENT * numRectangular);
   }

   private readInData(reader: PacketReader): void {
      // @Speed
      const missingLocalIDs = this.damageBoxLocalIDs.slice();
      
      const numCircular = reader.readNumber();
      for (let i = 0; i < numCircular; i++) {
         const positionX = reader.readNumber();
         const positionY = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const rotation = reader.readNumber();
         const localID = reader.readNumber();
         const radius = reader.readNumber();
         const damageBoxType = reader.readNumber() as DamageBoxType;

         let damageBox = this.damageBoxesRecord[localID] as ClientDamageBoxWrapper<BoxType.circular> | undefined;
         if (typeof damageBox === "undefined") {
            const box = new CircularBox(new Point(offsetX, offsetY), 0, radius);
            damageBox = createDamageBox(box, damageBoxType);

            this.damageBoxes.push(damageBox);
            this.damageBoxLocalIDs.push(localID);
            this.damageBoxesRecord[localID] = damageBox;
         } else {
            missingLocalIDs.splice(missingLocalIDs.indexOf(localID), 1);
         }
         
         damageBox.box.position.x = positionX;
         damageBox.box.position.y = positionY;
         damageBox.box.offset.x = offsetX;
         damageBox.box.offset.y = offsetY;
         damageBox.box.rotation = rotation;
         damageBox.box.radius = radius;
      }

      const numRectangular = reader.readNumber();
      for (let i = 0; i < numRectangular; i++) {
         const positionX = reader.readNumber();
         const positionY = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const rotation = reader.readNumber();
         const localID = reader.readNumber();
         const width = reader.readNumber();
         const height = reader.readNumber();
         const relativeRotation = reader.readNumber();
         const damageBoxType = reader.readNumber() as DamageBoxType;

         let damageBox = this.damageBoxesRecord[localID] as ClientDamageBoxWrapper<BoxType.rectangular> | undefined;
         if (typeof damageBox === "undefined") {
            const box = new RectangularBox(new Point(offsetX, offsetY), width, height, relativeRotation);
            damageBox = createDamageBox(box, damageBoxType);

            this.damageBoxes.push(damageBox);
            this.damageBoxLocalIDs.push(localID);
            this.damageBoxesRecord[localID] = damageBox;
         } else {
            missingLocalIDs.splice(missingLocalIDs.indexOf(localID), 1);
         }

         damageBox.box.position.x = positionX;
         damageBox.box.position.y = positionY;
         damageBox.box.offset.x = offsetX;
         damageBox.box.offset.y = offsetY;
         damageBox.box.rotation = rotation;
         damageBox.box.width = width;
         damageBox.box.height = height;
         damageBox.box.relativeRotation = relativeRotation;
      }

      for (const localID of missingLocalIDs) {
         const damageBox = this.damageBoxesRecord[localID]!;
         const idx = this.damageBoxes.indexOf(damageBox);

         this.damageBoxes.splice(idx, 1);
         this.damageBoxLocalIDs.splice(idx, 1);
         delete this.damageBoxesRecord[localID];
      }
   }

   public updateFromData(reader: PacketReader): void {
      this.readInData(reader);
   }

   public updatePlayerFromData(reader: PacketReader): void {
      this.updateFromData(reader);
   }
}

export default DamageBoxComponent;

export const DamageBoxComponentArray = new ComponentArray<DamageBoxComponent>(ComponentArrayType.server, ServerComponentType.damageBox, true, {});