import { assert, rotateXAroundOrigin, rotateYAroundOrigin, PacketReader, Entity, EntityType, ServerComponentType } from "webgl-test-shared";
import { getHitboxVelocity, translateHitbox } from "../../hitboxes";
import { playerInstance } from "../../player";
import { playSound } from "../../sound";
import { entityExists, EntityComponentData, getEntityLayer, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

interface CarrySlot {
   occupiedEntity: Entity;
   readonly hitboxLocalID: number;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly dismountOffsetX: number;
   readonly dismountOffsetY: number;
}

export interface RideableComponentData {
   readonly carrySlots: ReadonlyArray<CarrySlot>;
}

export interface RideableComponent {
   readonly carrySlots: ReadonlyArray<CarrySlot>;
}

export const RideableComponentArray = new ServerComponentArray<RideableComponent, RideableComponentData, never>(ServerComponentType.rideable, true, createComponent, getMaxRenderParts, decodeData);
RideableComponentArray.updateFromData = updateFromData;

export function createRideableComponentData(carrySlots: ReadonlyArray<CarrySlot>): RideableComponentData {
   return {
      carrySlots: carrySlots
   };
}

function decodeData(reader: PacketReader): RideableComponentData {
   const carrySlots = new Array<CarrySlot>();
   
   const numCarrySlots = reader.readNumber();
   for (let i = 0; i < numCarrySlots; i++) {
      const occupiedEntity = reader.readNumber();

      const hitboxLocalID = reader.readNumber();

      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();

      const dismountOffsetX = reader.readNumber();
      const dismountOffsetY = reader.readNumber();

      const carrySlot: CarrySlot = {
         occupiedEntity: occupiedEntity,
         hitboxLocalID: hitboxLocalID,
         offsetX: offsetX,
         offsetY: offsetY,
         dismountOffsetX: dismountOffsetX,
         dismountOffsetY: dismountOffsetY
      };
      carrySlots.push(carrySlot);
   }
   
   return createRideableComponentData(carrySlots);
}

function createComponent(entityComponentData: EntityComponentData): RideableComponent {
   const rideableComponentData = entityComponentData.serverComponentData[ServerComponentType.rideable]!;
   return {
      carrySlots: rideableComponentData.carrySlots
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function updateFromData(data: RideableComponentData, entity: Entity): void {
   const rideableComponent = RideableComponentArray.getComponent(entity);

   for (let i = 0; i < rideableComponent.carrySlots.length; i++) {
      const carrySlot = rideableComponent.carrySlots[i];
      const carrySlotData = data.carrySlots[i];
      
      const occupiedEntity = carrySlotData.occupiedEntity;

      if (occupiedEntity !== carrySlot.occupiedEntity) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const mountHitbox = transformComponent.hitboxMap.get(carrySlot.hitboxLocalID);
         assert(typeof mountHitbox !== "undefined");
         const layer = getEntityLayer(entity);
         
         if (entityExists(occupiedEntity)) {
            // Play mount sound when entity mounts a carry slot
            switch (getEntityType(occupiedEntity)) {
               case EntityType.barrel: {
                  playSound("barrel-mount.mp3", 0.4, 1, mountHitbox.box.position.copy(), layer);
                  break;
               }
               default: {
                  playSound("mount.mp3", 0.4, 1, mountHitbox.box.position.copy(), layer);
                  break;
               }
            }
         } else {
            // Play a sound when the entity dismounts a carry slot
            playSound("dismount.mp3", 0.4, 1, mountHitbox.box.position.copy(), layer);

            if (carrySlot.occupiedEntity === playerInstance) {
               // Dismount
               
               const transformComponent = TransformComponentArray.getComponent(playerInstance);
               const playerHitbox = transformComponent.hitboxes[0];

               const tx = rotateXAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.angle);
               const ty = rotateYAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.angle);
               translateHitbox(playerHitbox, tx, ty);

               // @HACK reset acceleration because it's accumulated a bunch for some reason
               playerHitbox.acceleration.x = 0;
               playerHitbox.acceleration.y = 0;
            }
         }
      }
      
      carrySlot.occupiedEntity = occupiedEntity;
   }
}
