import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID, LimbAction } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { boxIsCircular } from "battletribes-shared/boxes/boxes";
import { getBoxesCollidingEntities } from "battletribes-shared/hitbox-collision";
import { ServerBlockBox, ServerDamageBox } from "../boxes";
import { InventoryUseComponentArray, onBlockBoxCollisionWithDamageBox, onBlockBoxCollisionWithProjectile, onDamageBoxCollision } from "./InventoryUseComponent";
import { Settings } from "battletribes-shared/settings";
import { ProjectileComponentArray } from "./ProjectileComponent";
import { getEntityLayer } from "../world";

interface DamageBoxCollisionInfo {
   readonly collidingEntity: EntityID;
   readonly collidingDamageBox: ServerDamageBox;
}

export class DamageBoxComponent {
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
   const layer = getEntityLayer(entity);
   
   // @Hack
   const CHECK_PADDING = 200;
   const minChunkX = Math.max(Math.min(Math.floor((blockBox.box.position.x - CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((blockBox.box.position.x + CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((blockBox.box.position.y - CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((blockBox.box.position.y + CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const currentEntity of chunk.entities) {
            if (currentEntity === entity || !DamageBoxComponentArray.hasComponent(currentEntity)) {
               continue;
            }

            const damageBoxComponent = DamageBoxComponentArray.getComponent(currentEntity);
            for (const currentDamageBox of damageBoxComponent.damageBoxes) { 
               if (currentDamageBox.isActive && blockBox.box.isColliding(currentDamageBox.box)) {
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
   const layer = getEntityLayer(entity);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   
   for (const damageBox of damageBoxComponent.damageBoxes) {
      if (!damageBox.isActive) {
         continue;
      }

      const limbInfo = inventoryUseComponent.getLimbInfo(damageBox.associatedLimbInventoryName);
      if (limbInfo.action === LimbAction.none) {
         // There shouldn't be any active damage boxes if the limb is doing nothing!
         // @Temporary
         console.warn("BAD!1");
         // throw new Error();
      }

      // Look for entities to damage
      const collidingEntities = getBoxesCollidingEntities(layer.getWorldInfo(), [damageBox]);
      for (let j = 0; j < collidingEntities.length; j++) {
         const collidingEntity = collidingEntities[j];
         if (collidingEntity !== entity) {
            onDamageBoxCollision(entity, collidingEntity, limbInfo);
         }
      }
   }

   // For each block box, look for damage boxes or projectiles to block
   for (const blockBox of damageBoxComponent.blockBoxes) {
      if (!blockBox.isActive) {
         continue;
      }

      const limbInfo = inventoryUseComponent.getLimbInfo(blockBox.associatedLimbInventoryName);
      if (limbInfo.action !== LimbAction.block && limbInfo.action !== LimbAction.windShieldBash) {
         // There shouldn't be any active block boxes if the limb isn't blocking!
         // @Temporary
         console.warn("BAD!2");
         // throw new Error();
      }

      const collisionInfo = getCollidingCollisionBox(entity, blockBox);
      if (collisionInfo !== null) {
         if (blockBox.collidingBox !== collisionInfo.collidingDamageBox) {
            onBlockBoxCollisionWithDamageBox(collisionInfo.collidingEntity, entity, limbInfo, blockBox, collisionInfo.collidingDamageBox);
         }

         blockBox.collidingBox = collisionInfo.collidingDamageBox;
      } else {
         blockBox.collidingBox = null;
      }

      // Look for projectiles to block
      const collidingEntities = getBoxesCollidingEntities(layer.getWorldInfo(), [blockBox]);
      let hasBlockedProjectile = false;
      for (let i = 0; i < collidingEntities.length; i++) {
         const collidingEntity = collidingEntities[i];
         if (!ProjectileComponentArray.hasComponent(collidingEntity)) {
            continue;
         }
         
         if (collidingEntity !== blockBox.collidingEntity) {
            onBlockBoxCollisionWithProjectile(entity, collidingEntity, limbInfo, blockBox);
         }
         blockBox.collidingEntity = collidingEntity;
         hasBlockedProjectile = true;
      }

      if (!hasBlockedProjectile) {
         blockBox.collidingEntity = null;
      }
   }
}

function getDataLength(entity: EntityID): number {
   const damageBoxComponent = DamageBoxComponentArray.getComponent(entity);

   let lengthBytes = 5 * Float32Array.BYTES_PER_ELEMENT;
   
   for (const damageBox of damageBoxComponent.damageBoxes) {
      if (boxIsCircular(damageBox.box)) {
         lengthBytes += 10 * Float32Array.BYTES_PER_ELEMENT;
      } else {
         lengthBytes += 12 * Float32Array.BYTES_PER_ELEMENT;
      }
   }
   for (const blockBox of damageBoxComponent.blockBoxes) {
      if (boxIsCircular(blockBox.box)) {
         lengthBytes += 10 * Float32Array.BYTES_PER_ELEMENT;
      } else {
         lengthBytes += 12 * Float32Array.BYTES_PER_ELEMENT;
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
      if (boxIsCircular(damageBox.box)) {
         numCircularDamageBoxes++;
      } else {
         numRectangularDamageBoxes++;
      }
   }
   
   let numCircularBlockBoxes = 0;
   let numRectangularBlockBoxes = 0;
   for (const blockBox of damageBoxComponent.blockBoxes) {
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
      packet.addNumber(box.scale);
      packet.addNumber(box.rotation);
      packet.addNumber(localID);
      packet.addNumber(box.radius);
      packet.addNumber(damageBox.associatedLimbInventoryName);
      packet.addBoolean(damageBox.isActive);
      packet.padOffset(3);
   }

   // Rectangular
   packet.addNumber(numRectangularDamageBoxes);
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];
      
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
      packet.addNumber(box.scale);
      packet.addNumber(box.rotation);
      packet.addNumber(localID);
      packet.addNumber(box.width);
      packet.addNumber(box.height);
      packet.addNumber(box.relativeRotation);
      packet.addNumber(damageBox.associatedLimbInventoryName);
      packet.addBoolean(damageBox.isActive);
      packet.padOffset(3);
   }
   
   // Circular
   packet.addNumber(numCircularBlockBoxes);
   for (let i = 0; i < damageBoxComponent.blockBoxes.length; i++) {
      const blockBox = damageBoxComponent.blockBoxes[i];
      
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
      packet.addNumber(box.scale);
      packet.addNumber(box.rotation);
      packet.addNumber(localID);
      packet.addNumber(box.radius);
      packet.addNumber(blockBox.associatedLimbInventoryName);
      packet.addBoolean(blockBox.isActive);
      packet.padOffset(3);
   }

   // Rectangular
   packet.addNumber(numRectangularBlockBoxes);
   for (let i = 0; i < damageBoxComponent.blockBoxes.length; i++) {
      const blockBox = damageBoxComponent.blockBoxes[i];
      
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
      packet.addNumber(box.scale);
      packet.addNumber(box.rotation);
      packet.addNumber(localID);
      packet.addNumber(box.width);
      packet.addNumber(box.height);
      packet.addNumber(box.relativeRotation);
      packet.addNumber(blockBox.associatedLimbInventoryName);
      packet.addBoolean(blockBox.isActive);
      packet.padOffset(3);
   }
}