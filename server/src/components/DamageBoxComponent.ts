import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";
import { boxIsCircular } from "webgl-test-shared/dist/boxes/boxes";
import { getBoxesCollidingEntities } from "webgl-test-shared/dist/hitbox-collision";
import Board from "../Board";
import { ServerDamageBoxWrapper } from "../boxes";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { Settings } from "webgl-test-shared/dist/settings";

export interface DamageBoxComponentParams {}

interface DamageBoxCollisionInfo {
   readonly collidingEntity: EntityID;
   readonly collidingDamageBox: ServerDamageBoxWrapper;
}

export class DamageBoxComponent implements DamageBoxComponentParams {
   public damageBoxes = new Array<ServerDamageBoxWrapper>();
   public damageBoxLocalIDs = new Array<number>();
   public nextDamageBoxLocalID = 1;

   public addDamageBox(damageBox: ServerDamageBoxWrapper): void {
      this.damageBoxes.push(damageBox);
      this.damageBoxLocalIDs.push(this.nextDamageBoxLocalID);

      this.nextDamageBoxLocalID++;
   }

   public removeDamageBox(damageBox: ServerDamageBoxWrapper): void {
      const idx = this.damageBoxes.indexOf(damageBox);
      if (idx === -1) {
         // console.warn("Tried to remove a damage box which wasn't on the component.");
         return;
      }

      this.damageBoxes.splice(idx, 1);
      this.damageBoxLocalIDs.splice(idx, 1);
   }
}

export const DamageBoxComponentArray = new ComponentArray<DamageBoxComponent>(ServerComponentType.damageBox, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

// @Hack: this whole thing is cursed
const getCollidingDamageBox = (entity: EntityID, damageBox: ServerDamageBoxWrapper): DamageBoxCollisionInfo | null => {
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

function onTick(damageBoxComponent: DamageBoxComponent, entity: EntityID): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   
   // Check for removed damage boxes
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];
      if (damageBox.isRemoved) {
         damageBoxComponent.removeDamageBox(damageBox);
         i--;
      }
   }
   
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];
      if (!damageBox.isActive || damageBox.isRemoved) {
         continue;
      }
      
      const limbInfo = inventoryUseComponent.getLimbInfo(damageBox.associatedLimbInventoryName);

      // First check if it is colliding with another damage box 
      const collisionInfo = getCollidingDamageBox(entity, damageBox);
      if (collisionInfo !== null) {
         if (typeof damageBox.onCollision !== "undefined") {
            damageBox.onCollision(entity, collisionInfo.collidingEntity, limbInfo, collisionInfo.collidingDamageBox);
         }
         if (damageBox.collidingDamageBox !== collisionInfo.collidingDamageBox && typeof damageBox.onCollisionEnter !== "undefined") {
            damageBox.onCollisionEnter(entity, collisionInfo.collidingEntity, limbInfo, collisionInfo.collidingDamageBox);
         }
         damageBox.collidingDamageBox = collisionInfo.collidingDamageBox;
      } else {
         damageBox.collidingDamageBox = null;
      }

      if (typeof damageBox.onCollision !== "undefined") {
         const collidingEntities = getBoxesCollidingEntities(Board.getWorldInfo(), [damageBox]);
         for (let j = 0; j < collidingEntities.length; j++) {
            const collidingEntity = collidingEntities[j];
            if (collidingEntity !== entity) {
               damageBox.onCollision(entity, collidingEntity, limbInfo, null);
            }
         }
      }
   }
}

function getDataLength(entity: EntityID): number {
   const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);

   let lengthBytes = 3 * Float32Array.BYTES_PER_ELEMENT;
   
   for (const damageBox of damageBoxComponent.damageBoxes) {
      if (!damageBox.isActive) {
         continue;
      }
      
      if (boxIsCircular(damageBox.box)) {
         lengthBytes += 9 * Float32Array.BYTES_PER_ELEMENT;
      } else {
         lengthBytes += 11 * Float32Array.BYTES_PER_ELEMENT;
      }
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   // @Speed: can be made faster if we pre-filter which damage boxes are circular and rectangular
   
   const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);
   
   let numCircularBoxes = 0;
   let numRectangularBoxes = 0;
   for (const damageBox of damageBoxComponent.damageBoxes) {
      if (!damageBox.isActive) {
         continue;
      }
      
      if (boxIsCircular(damageBox.box)) {
         numCircularBoxes++;
      } else {
         numRectangularBoxes++;
      }
   }
   
   // Circular
   packet.addNumber(numCircularBoxes);
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];
      if (!damageBox.isActive || damageBox.isRemoved) {
         continue;
      }
      
      const box = damageBox.box;
      // @Speed
      if (!boxIsCircular(box)) {
         continue;
      }

      const localID = damageBoxComponent.damageBoxLocalIDs[i];

      packet.addNumber(box.position.x);
      packet.addNumber(box.position.y);
      packet.addNumber(box.offset.x);
      packet.addNumber(box.offset.y);
      packet.addNumber(box.rotation);
      packet.addNumber(localID);
      packet.addNumber(box.radius);
      packet.addNumber(damageBox.type);
      packet.addNumber(damageBox.associatedLimbInventoryName);
   }

   // Rectangular
   packet.addNumber(numRectangularBoxes);
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];
      if (!damageBox.isActive) {
         continue;
      }
      
      const box = damageBox.box;
      // @Speed
      if (boxIsCircular(box)) {
         continue;
      }

      const localID = damageBoxComponent.damageBoxLocalIDs[i];

      packet.addNumber(box.position.x);
      packet.addNumber(box.position.y);
      packet.addNumber(box.offset.x);
      packet.addNumber(box.offset.y);
      packet.addNumber(box.rotation);
      packet.addNumber(localID);
      packet.addNumber(box.width);
      packet.addNumber(box.height);
      packet.addNumber(box.relativeRotation);
      packet.addNumber(damageBox.type);
      packet.addNumber(damageBox.associatedLimbInventoryName);
   }
}