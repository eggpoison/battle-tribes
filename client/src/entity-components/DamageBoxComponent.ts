import ServerComponent from "./ServerComponent";
import { PacketReader } from "battletribes-shared/packets";
import { ComponentArray, ComponentArrayType } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { angle, Point, randFloat, randInt } from "battletribes-shared/utils";
import { Box, BoxType, updateBox, updateVertexPositionsAndSideAxes } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { ClientBlockBox, ClientDamageBox } from "../boxes";
import { EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { InventoryName } from "battletribes-shared/items/items";
import Player from "../entities/Player";
import { InventoryUseComponentArray, LimbInfo } from "./InventoryUseComponent";
import { cancelAttack, discombobulate, GameInteractableLayer_setItemRestTime } from "../components/game/GameInteractableLayer";
import { AttackVars } from "../../../shared/src/attack-patterns";
import { getEntityLayer } from "../world";
import Layer, { getSubtileIndex, getSubtileX, getSubtileY } from "../Layer";
import { createSparkParticle } from "../particles";
import { playSound } from "../sound";
import { TransformComponentArray } from "./TransformComponent";
import Particle from "../Particle";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../rendering/webgl/particle-rendering";
import Board from "../Board";

interface DamageBoxCollisionInfo {
   readonly collidingEntity: EntityID;
   readonly collidingBox: ClientDamageBox | ClientBlockBox;
}

// @Hack: this whole thing is cursed
const getCollidingBox = (entity: EntityID, box: Box): DamageBoxCollisionInfo | null => {
   const layer = getEntityLayer(entity);
   
   // @Hack
   const CHECK_PADDING = 200;
   const minChunkX = Math.max(Math.min(Math.floor((box.position.x - CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkX = Math.max(Math.min(Math.floor((box.position.x + CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const minChunkY = Math.max(Math.min(Math.floor((box.position.y - CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);
   const maxChunkY = Math.max(Math.min(Math.floor((box.position.y + CHECK_PADDING) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1), 0);

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = layer.getChunk(chunkX, chunkY);
         for (const currentEntity of chunk.entities) {
            if (currentEntity === entity || !DamageBoxComponentArray.hasComponent(currentEntity)) {
               continue;
            }

            const damageBoxComponent = DamageBoxComponentArray.getComponent(currentEntity);
            for (const currentDamageBox of damageBoxComponent.damageBoxes) { 
               if (box.isColliding(currentDamageBox.box)) {
                  return {
                     collidingEntity: currentEntity,
                     collidingBox: currentDamageBox
                  };
               }
            }
            for (const currentBlockBox of damageBoxComponent.blockBoxes) {
               if (box.isColliding(currentBlockBox.box)) {
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

   public padData(reader: PacketReader): void {
      const numCircularDamageBoxes = reader.readNumber();
      reader.padOffset(12 * Float32Array.BYTES_PER_ELEMENT * numCircularDamageBoxes);
      const numRectangularDamageBoxes = reader.readNumber();
      reader.padOffset(14 * Float32Array.BYTES_PER_ELEMENT * numRectangularDamageBoxes);
      const numCircularBlockBoxes = reader.readNumber();
      reader.padOffset(10 * Float32Array.BYTES_PER_ELEMENT * numCircularBlockBoxes);
      const numRectangularBlockBoxes = reader.readNumber();
      reader.padOffset(12 * Float32Array.BYTES_PER_ELEMENT * numRectangularBlockBoxes);
   }

   public updateFromData(reader: PacketReader): void {
      // @Speed @Garbage
      const missingDamageBoxLocalIDs = this.damageBoxLocalIDs.slice();
      
      const numCircularDamageBoxes = reader.readNumber();
      for (let i = 0; i < numCircularDamageBoxes; i++) {
         const positionX = reader.readNumber();
         const positionY = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const scale = reader.readNumber();
         const rotation = reader.readNumber();
         const localID = reader.readNumber();
         const radius = reader.readNumber();
         const associatedLimbInventoryName = reader.readNumber() as InventoryName;
         const isActive = reader.readBoolean();
         reader.padOffset(3);
         const isBlockedByWall = reader.readBoolean();
         reader.padOffset(3);
         const blockingSubtileIndex = reader.readNumber();

         let damageBox = this.damageBoxesRecord[localID] as ClientDamageBox<BoxType.circular> | undefined;
         if (typeof damageBox === "undefined") {
            const box = new CircularBox(new Point(offsetX, offsetY), 0, radius);
            damageBox = new ClientDamageBox(box, associatedLimbInventoryName, isActive);

            this.damageBoxes.push(damageBox);
            this.damageBoxLocalIDs.push(localID);
            this.damageBoxesRecord[localID] = damageBox;
         } else {
            missingDamageBoxLocalIDs.splice(missingDamageBoxLocalIDs.indexOf(localID), 1);

            damageBox.isActive = isActive;

            damageBox.isBlockedByWall = isBlockedByWall;
         }
         
         damageBox.box.position.x = positionX;
         damageBox.box.position.y = positionY;
         damageBox.box.offset.x = offsetX;
         damageBox.box.offset.y = offsetY;
         damageBox.box.scale = scale;
         damageBox.box.rotation = rotation;
         damageBox.box.radius = radius;
      }

      const numRectangularDamageBoxes = reader.readNumber();
      for (let i = 0; i < numRectangularDamageBoxes; i++) {
         const positionX = reader.readNumber();
         const positionY = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const scale = reader.readNumber();
         const rotation = reader.readNumber();
         const localID = reader.readNumber();
         const width = reader.readNumber();
         const height = reader.readNumber();
         const relativeRotation = reader.readNumber();
         const associatedLimbInventoryName = reader.readNumber() as InventoryName;
         const isActive = reader.readBoolean();
         reader.padOffset(3);
         const isBlockedByWall = reader.readBoolean();
         reader.padOffset(3);
         const blockingSubtileIndex = reader.readNumber();

         let damageBox = this.damageBoxesRecord[localID] as ClientDamageBox<BoxType.rectangular> | undefined;
         if (typeof damageBox === "undefined") {
            const box = new RectangularBox(new Point(offsetX, offsetY), width, height, relativeRotation);
            damageBox = new ClientDamageBox(box, associatedLimbInventoryName, isActive);

            this.damageBoxes.push(damageBox);
            this.damageBoxLocalIDs.push(localID);
            this.damageBoxesRecord[localID] = damageBox;
         } else {
            missingDamageBoxLocalIDs.splice(missingDamageBoxLocalIDs.indexOf(localID), 1);

            damageBox.isActive = isActive;

            if (isBlockedByWall && !damageBox.isBlockedByWall) {
               wallBlockPlayerAttack(damageBox, blockingSubtileIndex);
            }
            damageBox.isBlockedByWall = isBlockedByWall;
         }

         damageBox.box.position.x = positionX;
         damageBox.box.position.y = positionY;
         damageBox.box.offset.x = offsetX;
         damageBox.box.offset.y = offsetY;
         damageBox.box.scale = scale;
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
         const scale = reader.readNumber();
         const rotation = reader.readNumber();
         const localID = reader.readNumber();
         const radius = reader.readNumber();
         const associatedLimbInventoryName = reader.readNumber() as InventoryName;
         const isActive = reader.readBoolean();
         reader.padOffset(3);

         let blockBox = this.blockBoxesRecord[localID] as ClientBlockBox<BoxType.circular> | undefined;
         if (typeof blockBox === "undefined") {
            const box = new CircularBox(new Point(offsetX, offsetY), 0, radius);
            blockBox = new ClientBlockBox(box, associatedLimbInventoryName, isActive);

            this.blockBoxes.push(blockBox);
            this.blockBoxLocalIDs.push(localID);
            this.blockBoxesRecord[localID] = blockBox;
         } else {
            missingBlockBoxLocalIDs.splice(missingBlockBoxLocalIDs.indexOf(localID), 1);

            blockBox.isActive = isActive;
         }
         
         blockBox.box.position.x = positionX;
         blockBox.box.position.y = positionY;
         blockBox.box.offset.x = offsetX;
         blockBox.box.offset.y = offsetY;
         blockBox.box.scale = scale;
         blockBox.box.rotation = rotation;
         blockBox.box.radius = radius;
      }

      const numRectangularBlockBoxes = reader.readNumber();
      for (let i = 0; i < numRectangularBlockBoxes; i++) {
         const positionX = reader.readNumber();
         const positionY = reader.readNumber();
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const scale = reader.readNumber();
         const rotation = reader.readNumber();
         const localID = reader.readNumber();
         const width = reader.readNumber();
         const height = reader.readNumber();
         const relativeRotation = reader.readNumber();
         const associatedLimbInventoryName = reader.readNumber() as InventoryName;
         const isActive = reader.readBoolean();
         reader.padOffset(3);

         let blockBox = this.blockBoxesRecord[localID] as ClientBlockBox<BoxType.rectangular> | undefined;
         if (typeof blockBox === "undefined") {
            const box = new RectangularBox(new Point(offsetX, offsetY), width, height, relativeRotation);
            blockBox = new ClientBlockBox(box, associatedLimbInventoryName, isActive);

            this.blockBoxes.push(blockBox);
            this.blockBoxLocalIDs.push(localID);
            this.blockBoxesRecord[localID] = blockBox;
         } else {
            missingBlockBoxLocalIDs.splice(missingBlockBoxLocalIDs.indexOf(localID), 1);

            blockBox.isActive = isActive;
         }

         blockBox.box.position.x = positionX;
         blockBox.box.position.y = positionY;
         blockBox.box.offset.x = offsetX;
         blockBox.box.offset.y = offsetY;
         blockBox.box.scale = scale;
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

   public updatePlayerFromData(reader: PacketReader): void {
      this.updateFromData(reader);
   }
}

export default DamageBoxComponent;

export const DamageBoxComponentArray = new ComponentArray<DamageBoxComponent>(ComponentArrayType.server, ServerComponentType.damageBox, true, {
   onTick: onTick
});

const blockPlayerAttack = (damageBox: ClientDamageBox): void => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(Player.instance!.id);
   const limb = inventoryUseComponent.getLimbInfoByInventoryName(damageBox.associatedLimbInventoryName);
   
   // Pause the attack for a brief period
   limb.currentActionPauseTicksRemaining = Math.floor(Settings.TPS / 15);
   limb.currentActionRate = 0.4;

   discombobulate(0.2);
}

const wallBlockPlayerAttack = (damageBox: ClientDamageBox, blockingSubtileIndex: number): void => {
   const subtileX = getSubtileX(blockingSubtileIndex);
   const subtileY = getSubtileY(blockingSubtileIndex);

   const originX = (subtileX + 0.5) * Settings.SUBTILE_SIZE;
   const originY = (subtileY + 0.5) * Settings.SUBTILE_SIZE;

   for (let i = 0; i < 5; i++) {
      createSparkParticle(originX, originY);
   }

   playSound("stone-mine-" + randInt(1, 4) + ".mp3", 0.85, 1, new Point(originX, originY));

   // Create rock debris particles moving towards the player on hit
   const playerTransformComponent = TransformComponentArray.getComponent(Player.instance!.id);
   const angleToPlayer = angle(playerTransformComponent.position.x - originX, playerTransformComponent.position.y - originY);
   for (let i = 0; i < 7; i++) {
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      const spawnPositionX = originX + 12 * Math.sin(spawnOffsetDirection);
      const spawnPositionY = originY + 12 * Math.cos(spawnOffsetDirection);
   
      const velocityMagnitude = randFloat(50, 70);
      const velocityDirection = angleToPlayer + randFloat(1, -1);
      const velocityX = velocityMagnitude * Math.sin(velocityDirection);
      const velocityY = velocityMagnitude * Math.cos(velocityDirection);
   
      const lifetime = randFloat(0.9, 1.5);
      
      const particle = new Particle(lifetime);
      particle.getOpacity = (): number => {
         return Math.pow(1 - particle.age / lifetime, 0.3);
      }
      
      const angularVelocity = randFloat(-Math.PI, Math.PI) * 2;
      
      const colour = randFloat(0.5, 0.75);
      const scale = randFloat(1, 1.35);
   
      const baseSize = Math.random() < 0.6 ? 4 : 6;
   
      addMonocolourParticleToBufferContainer(
         particle,
         ParticleRenderLayer.low,
         baseSize * scale, baseSize * scale,
         spawnPositionX, spawnPositionY,
         velocityX, velocityY,
         0, 0,
         velocityMagnitude / lifetime / 0.7,
         2 * Math.PI * Math.random(),
         angularVelocity,
         0,
         Math.abs(angularVelocity) / lifetime / 1.5,
         colour, colour, colour
      );
      Board.lowMonocolourParticles.push(particle);
   }
 }

const onPlayerBlock = (limb: LimbInfo): void => {
   GameInteractableLayer_setItemRestTime(limb.inventoryName, limb.selectedItemSlot, AttackVars.SHIELD_BLOCK_REST_TIME_TICKS);
}

function onTick(damageBoxComponent: DamageBoxComponent, entity: EntityID): void {
   if (Player.instance === null || entity !== Player.instance.id) {
      return;
   }
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   
   for (let i = 0; i < damageBoxComponent.damageBoxes.length; i++) {
      const damageBox = damageBoxComponent.damageBoxes[i];
      if (!damageBox.isActive) {
         continue;
      }
      
      // Check if the attacking hitbox is blocked
      const collisionInfo = getCollidingBox(entity, damageBox.box);
      if (collisionInfo !== null && collisionInfo.collidingBox instanceof ClientBlockBox) {
         if (damageBox.collidingBox !== collisionInfo.collidingBox) {
            blockPlayerAttack(damageBox);
         }
         damageBox.collidingBox = collisionInfo.collidingBox;
      } else {
         damageBox.collidingBox = null;
      }
   }
   
   for (let i = 0; i < damageBoxComponent.blockBoxes.length; i++) {
      const blockBox = damageBoxComponent.blockBoxes[i];
      if (!blockBox.isActive) {
         continue;
      }
      
      // Check for blocks
      const collisionInfo = getCollidingBox(entity, blockBox.box);
      if (collisionInfo !== null && collisionInfo.collidingBox instanceof ClientDamageBox) {
         if (blockBox.collidingBox !== collisionInfo.collidingBox) {
            blockBox.hasBlocked = true;

            const limb = inventoryUseComponent.getLimbInfoByInventoryName(blockBox.associatedLimbInventoryName);
            onPlayerBlock(limb);
         }
         blockBox.collidingBox = collisionInfo.collidingBox;
      } else {
         blockBox.collidingBox = null;
      }
   }
}