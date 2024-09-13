import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import Entity from "../Entity";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { Point } from "battletribes-shared/utils";
import { BoxType, updateVertexPositionsAndSideAxes } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { ClientBlockBox, ClientDamageBox } from "../boxes";
import { EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import Board from "../Board";
import { InventoryName } from "battletribes-shared/items/items";
import Player from "../entities/Player";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { discombobulate } from "../components/game/GameInteractableLayer";

interface DamageBoxCollisionInfo {
   readonly collidingEntity: EntityID;
   readonly collidingBox: ClientDamageBox | ClientBlockBox;
}

// @Hack: this whole thing is cursed
const getCollidingBox = (entity: EntityID, damageBox: ClientDamageBox): DamageBoxCollisionInfo | null => {
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
                     collidingBox: currentDamageBox
                  };
               }
            }
            for (const currentBlockBox of damageBoxComponent.blockBoxes) {
               if (damageBox.box.isColliding(currentBlockBox.box)) {
                  return {
                     collidingEntity: currentEntity,
                     collidingBox: currentBlockBox
                  };
               }
            }
         }
      }
   }

   return null;
}

class DamageBoxComponent extends ServerComponent {
   public damageBoxes = new Array<ClientDamageBox>();
   public blockBoxes = new Array<ClientBlockBox>();
   private readonly damageBoxesRecord: Partial<Record<number, ClientDamageBox>> = {};
   private readonly blockBoxesRecord: Partial<Record<number, ClientBlockBox>> = {};

   public damageBoxLocalIDs = new Array<number>();
   public blockBoxLocalIDs = new Array<number>();

   public nextDamageBoxLocalID = 1;
   public nextBlockBoxLocalID = 1;
   
   constructor(entity: Entity, reader: PacketReader) {
      super(entity);
      
      this.readInData(reader);
   }

   public padData(reader: PacketReader): void {
      const numCircular = reader.readNumber();
      reader.padOffset(8 * Float32Array.BYTES_PER_ELEMENT * numCircular);
      const numRectangular = reader.readNumber();
      reader.padOffset(10 * Float32Array.BYTES_PER_ELEMENT * numRectangular);
   }

   private readInData(reader: PacketReader): void {
      // @Speed
      const missingDamageBoxLocalIDs = this.damageBoxLocalIDs.slice();
      
      const numCircularDamageBoxes = reader.readNumber();
      for (let i = 0; i < numCircularDamageBoxes; i++) {
         const positionX = reader.readNumber();
         const positionY = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const rotation = reader.readNumber();
         const localID = reader.readNumber();
         const radius = reader.readNumber();
         const associatedLimbInventoryName = reader.readNumber() as InventoryName;

         let damageBox = this.damageBoxesRecord[localID] as ClientDamageBox<BoxType.circular> | undefined;
         if (typeof damageBox === "undefined") {
            const box = new CircularBox(new Point(offsetX, offsetY), 0, radius);
            damageBox = new ClientDamageBox(box, associatedLimbInventoryName);

            this.damageBoxes.push(damageBox);
            this.damageBoxLocalIDs.push(localID);
            this.damageBoxesRecord[localID] = damageBox;
         } else {
            missingDamageBoxLocalIDs.splice(missingDamageBoxLocalIDs.indexOf(localID), 1);
         }
         
         damageBox.box.position.x = positionX;
         damageBox.box.position.y = positionY;
         damageBox.box.offset.x = offsetX;
         damageBox.box.offset.y = offsetY;
         damageBox.box.rotation = rotation;
         damageBox.box.radius = radius;
      }

      const numRectangularDamageBoxes = reader.readNumber();
      for (let i = 0; i < numRectangularDamageBoxes; i++) {
         const positionX = reader.readNumber();
         const positionY = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const rotation = reader.readNumber();
         const localID = reader.readNumber();
         const width = reader.readNumber();
         const height = reader.readNumber();
         const relativeRotation = reader.readNumber();
         const associatedLimbInventoryName = reader.readNumber() as InventoryName;

         let damageBox = this.damageBoxesRecord[localID] as ClientDamageBox<BoxType.rectangular> | undefined;
         if (typeof damageBox === "undefined") {
            const box = new RectangularBox(new Point(offsetX, offsetY), width, height, relativeRotation);
            damageBox = new ClientDamageBox(box, associatedLimbInventoryName);

            this.damageBoxes.push(damageBox);
            this.damageBoxLocalIDs.push(localID);
            this.damageBoxesRecord[localID] = damageBox;
         } else {
            missingDamageBoxLocalIDs.splice(missingDamageBoxLocalIDs.indexOf(localID), 1);
         }

         damageBox.box.position.x = positionX;
         damageBox.box.position.y = positionY;
         damageBox.box.offset.x = offsetX;
         damageBox.box.offset.y = offsetY;
         damageBox.box.rotation = rotation;
         damageBox.box.width = width;
         damageBox.box.height = height;
         damageBox.box.relativeRotation = relativeRotation;
         updateVertexPositionsAndSideAxes(damageBox.box);
      }
      // @Speed
      const missingBlockBoxLocalIDs = this.blockBoxLocalIDs.slice();
      
      const numCircularBlockBoxes = reader.readNumber();
      for (let i = 0; i < numCircularBlockBoxes; i++) {
         const positionX = reader.readNumber();
         const positionY = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const rotation = reader.readNumber();
         const localID = reader.readNumber();
         const radius = reader.readNumber();
         const associatedLimbInventoryName = reader.readNumber() as InventoryName;

         let blockBox = this.blockBoxesRecord[localID] as ClientBlockBox<BoxType.circular> | undefined;
         if (typeof blockBox === "undefined") {
            const box = new CircularBox(new Point(offsetX, offsetY), 0, radius);
            blockBox = new ClientBlockBox(box, associatedLimbInventoryName);

            this.blockBoxes.push(blockBox);
            this.blockBoxLocalIDs.push(localID);
            this.blockBoxesRecord[localID] = blockBox;
         } else {
            missingBlockBoxLocalIDs.splice(missingBlockBoxLocalIDs.indexOf(localID), 1);
         }
         
         blockBox.box.position.x = positionX;
         blockBox.box.position.y = positionY;
         blockBox.box.offset.x = offsetX;
         blockBox.box.offset.y = offsetY;
         blockBox.box.rotation = rotation;
         blockBox.box.radius = radius;
      }

      const numRectangularBlockBoxes = reader.readNumber();
      for (let i = 0; i < numRectangularBlockBoxes; i++) {
         const positionX = reader.readNumber();
         const positionY = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const rotation = reader.readNumber();
         const localID = reader.readNumber();
         const width = reader.readNumber();
         const height = reader.readNumber();
         const relativeRotation = reader.readNumber();
         const associatedLimbInventoryName = reader.readNumber() as InventoryName;

         let blockBox = this.blockBoxesRecord[localID] as ClientBlockBox<BoxType.rectangular> | undefined;
         if (typeof blockBox === "undefined") {
            const box = new RectangularBox(new Point(offsetX, offsetY), width, height, relativeRotation);
            blockBox = new ClientBlockBox(box, associatedLimbInventoryName);

            this.blockBoxes.push(blockBox);
            this.blockBoxLocalIDs.push(localID);
            this.blockBoxesRecord[localID] = blockBox;
         } else {
            missingBlockBoxLocalIDs.splice(missingBlockBoxLocalIDs.indexOf(localID), 1);
         }

         blockBox.box.position.x = positionX;
         blockBox.box.position.y = positionY;
         blockBox.box.offset.x = offsetX;
         blockBox.box.offset.y = offsetY;
         blockBox.box.rotation = rotation;
         blockBox.box.width = width;
         blockBox.box.height = height;
         blockBox.box.relativeRotation = relativeRotation;
         updateVertexPositionsAndSideAxes(blockBox.box);
      }

      for (const localID of missingDamageBoxLocalIDs) {
         const damageBox = this.damageBoxesRecord[localID]!;
         const idx = this.damageBoxes.indexOf(damageBox);

         this.damageBoxes.splice(idx, 1);
         this.damageBoxLocalIDs.splice(idx, 1);
         delete this.damageBoxesRecord[localID];
      }

      for (const localID of missingBlockBoxLocalIDs) {
         const blockBox = this.blockBoxesRecord[localID]!;
         const idx = this.blockBoxes.indexOf(blockBox);

         this.blockBoxes.splice(idx, 1);
         this.blockBoxLocalIDs.splice(idx, 1);
         delete this.blockBoxesRecord[localID];
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

export const DamageBoxComponentArray = new ComponentArray<DamageBoxComponent>(ComponentArrayType.server, ServerComponentType.damageBox, true, {
   onTick: onTick
});

const blockAttack = (damageBox: ClientDamageBox): void => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
   const limb = inventoryUseComponent.getLimbInfoByInventoryName(damageBox.associatedLimbInventoryName);
   
   // Pause the attack for a brief period
   limb.currentActionPauseTicksRemaining = Math.floor(Settings.TPS / 15);
   limb.currentActionRate = 0.4;

   discombobulate(0.2);
}

function onTick(damageBoxComponent: DamageBoxComponent, entity: EntityID): void {
   if (Player.instance === null || entity !== Player.instance.id) {
      return;
   }
   
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];
      
      // Check if the attacking hitbox is blocked
      const collisionInfo = getCollidingBox(entity, damageBox);
      if (collisionInfo !== null && collisionInfo.collidingBox instanceof ClientBlockBox) {
         if (damageBox.collidingBox !== collisionInfo.collidingBox) {
            blockAttack(damageBox);
         }
         damageBox.collidingBox = collisionInfo.collidingBox;
      } else {
         damageBox.collidingBox = null;
      }
   }
   
   for (let i = 0; i < damageBoxComponent.blockBoxes.length; i++) {
      const blockBox = damageBoxComponent.blockBoxes[i];
      
      // Check for blocks
      const collisionInfo = getCollidingBox(entity, blockBox);
      if (collisionInfo !== null && collisionInfo.collidingBox instanceof ClientDamageBox) {
         if (blockBox.collidingBox !== collisionInfo.collidingBox) {
            blockBox.hasBlocked = true;
         }
         blockBox.collidingBox = collisionInfo.collidingBox;
      } else {
         blockBox.collidingBox = null;
      }
   }
}