import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { boxIsCircular } from "battletribes-shared/boxes/boxes";
import { getBoxesCollidingEntities } from "battletribes-shared/hitbox-collision";
import Board from "../Board";
import { ServerBlockBox, ServerDamageBox } from "../boxes";
import { InventoryUseComponentArray, onBlockBoxCollision, onDamageBoxCollision } from "./InventoryUseComponent";
import { Settings } from "battletribes-shared/settings";

export interface DamageBoxComponentParams {}

interface DamageBoxCollisionInfo {
   readonly collidingEntity: EntityID;
   readonly collidingDamageBox: ServerDamageBox;
}

export class DamageBoxComponent implements DamageBoxComponentParams {
   public damageBoxes = new Array<ServerDamageBox>();
   public blockBoxes = new Array<ServerBlockBox>();

   public damageBoxLocalIDs = new Array<number>();
   public blockBoxLocalIDs = new Array<number>();

   public nextDamageBoxLocalID = 1;
   public nextBlockBoxLocalID = 1;

   public addDamageBox(damageBox: ServerDamageBox): void {
      this.damageBoxes.push(damageBox);
      this.damageBoxLocalIDs.push(this.nextDamageBoxLocalID);

      this.nextDamageBoxLocalID++;
   }

   public addBlockBox(blockBox: ServerBlockBox): void {
      this.blockBoxes.push(blockBox);
      this.blockBoxLocalIDs.push(this.nextBlockBoxLocalID);

      this.nextBlockBoxLocalID++;
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
const getCollidingCollisionBox = (entity: EntityID, blockBox: ServerBlockBox): DamageBoxCollisionInfo | null => {
   // @Hack
   const CHECK_PADDING = 200;
   const minChunkX = Math.max(Math.min(Math.floor((blockBox.box.position.x - CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((blockBox.box.position.x + CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((blockBox.box.position.y - CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((blockBox.box.position.y + CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const currentEntity of chunk.entities) {
            if (currentEntity === entity || !DamageBoxComponentArray.hasComponent(currentEntity)) {
               continue;
            }

            const damageBoxComponent = DamageBoxComponentArray.getComponent(currentEntity);
            for (const currentDamageBox of damageBoxComponent.damageBoxes) { 
               if (blockBox.box.isColliding(currentDamageBox.box)) {
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
   
   for (const damageBox of damageBoxComponent.damageBoxes) {
      if (!damageBox.isActive) {
         continue;
      }

      const limbInfo = inventoryUseComponent.getLimbInfo(damageBox.associatedLimbInventoryName);

      // Look for entities to damage
      const collidingEntities = getBoxesCollidingEntities(Board.getWorldInfo(), [damageBox]);
      for (let j = 0; j < collidingEntities.length; j++) {
         const collidingEntity = collidingEntities[j];
         if (collidingEntity !== entity) {
            onDamageBoxCollision(entity, collidingEntity, limbInfo);
         }
      }
   }

   for (const blockBox of damageBoxComponent.blockBoxes) {
      if (!blockBox.isActive) {
         continue;
      }

      const limbInfo = inventoryUseComponent.getLimbInfo(blockBox.associatedLimbInventoryName);

      const collisionInfo = getCollidingCollisionBox(entity, blockBox);
      if (collisionInfo !== null) {
         if (blockBox.collidingBox !== collisionInfo.collidingDamageBox) {
            onBlockBoxCollision(entity, collisionInfo.collidingEntity, limbInfo, blockBox, collisionInfo.collidingDamageBox);
         }

         blockBox.collidingBox = collisionInfo.collidingDamageBox;
      } else {
         blockBox.collidingBox = null;
      }
   }
}

function getDataLength(entity: EntityID): number {
   const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);

   let lengthBytes = 5 * Float32Array.BYTES_PER_ELEMENT;
   
   for (const damageBox of damageBoxComponent.damageBoxes) {
      if (!damageBox.isActive) {
         continue;
      }
      
      if (boxIsCircular(damageBox.box)) {
         lengthBytes += 8 * Float32Array.BYTES_PER_ELEMENT;
      } else {
         lengthBytes += 10 * Float32Array.BYTES_PER_ELEMENT;
      }
   }
   for (const blockBox of damageBoxComponent.blockBoxes) {
      if (!blockBox.isActive) {
         continue;
      }
      
      if (boxIsCircular(blockBox.box)) {
         lengthBytes += 8 * Float32Array.BYTES_PER_ELEMENT;
      } else {
         lengthBytes += 10 * Float32Array.BYTES_PER_ELEMENT;
      }
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   // @Speed: can be made faster if we pre-filter which damage boxes are circular and rectangular
   
   const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);
   
   let numCircularDamageBoxes = 0;
   let numRectangularDamageBoxes = 0;
   for (const damageBox of damageBoxComponent.damageBoxes) {
      if (!damageBox.isActive) {
         continue;
      }
      
      if (boxIsCircular(damageBox.box)) {
         numCircularDamageBoxes++;
      } else {
         numRectangularDamageBoxes++;
      }
   }
   
   let numCircularBlockBoxes = 0;
   let numRectangularBlockBoxes = 0;
   for (const blockBox of damageBoxComponent.blockBoxes) {
      if (!blockBox.isActive) {
         continue;
      }
      
      if (boxIsCircular(blockBox.box)) {
         numCircularBlockBoxes++;
      } else {
         numRectangularBlockBoxes++;
      }
   }
   
   // Circular
   packet.addNumber(numCircularDamageBoxes);
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];
      if (!damageBox.isActive) {
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
      packet.addNumber(damageBox.associatedLimbInventoryName);
   }

   // Rectangular
   packet.addNumber(numRectangularDamageBoxes);
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
      packet.addNumber(damageBox.associatedLimbInventoryName);
   }
   
   // Circular
   packet.addNumber(numCircularBlockBoxes);
   for (let i = 0; i < damageBoxComponent.blockBoxes.length; i++) {
      const blockBox = damageBoxComponent.blockBoxes[i];
      if (!blockBox.isActive) {
         continue;
      }
      
      const box = blockBox.box;
      // @Speed
      if (!boxIsCircular(box)) {
         continue;
      }

      const localID = damageBoxComponent.blockBoxLocalIDs[i];

      packet.addNumber(box.position.x);
      packet.addNumber(box.position.y);
      packet.addNumber(box.offset.x);
      packet.addNumber(box.offset.y);
      packet.addNumber(box.rotation);
      packet.addNumber(localID);
      packet.addNumber(box.radius);
      packet.addNumber(blockBox.associatedLimbInventoryName);
   }

   // Rectangular
   packet.addNumber(numRectangularBlockBoxes);
   for (let i = 0; i < damageBoxComponent.blockBoxes.length; i++) {
      const blockBox = damageBoxComponent.blockBoxes[i];
      if (!blockBox.isActive) {
         continue;
      }
      
      const box = blockBox.box;
      // @Speed
      if (boxIsCircular(box)) {
         continue;
      }

      const localID = damageBoxComponent.blockBoxLocalIDs[i];

      packet.addNumber(box.position.x);
      packet.addNumber(box.position.y);
      packet.addNumber(box.offset.x);
      packet.addNumber(box.offset.y);
      packet.addNumber(box.rotation);
      packet.addNumber(localID);
      packet.addNumber(box.width);
      packet.addNumber(box.height);
      packet.addNumber(box.relativeRotation);
      packet.addNumber(blockBox.associatedLimbInventoryName);
   }
}