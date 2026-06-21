import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity, EntityType } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { assert, rotatePointAroundOrigin, _point } from "../../../../../shared/src/utils";
import { Hitbox, translateHitbox } from "../../hitboxes";
import { playerInstance } from "../../player";
import { playSound } from "../../sound";
import { entityExists, EntityComponentData, getEntityLayer, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

interface CarrySlot {
   occupiedEntity: Entity;
   readonly hitboxLocalID: number;
   readonly offsetX: number;
   readonly offsetY: number;
   readonly dismountOffsetX: number;
   readonly dismountOffsetY: number;
}

export interface RideableComponentData {
   readonly carrySlots: readonly CarrySlot[];
}

export interface RideableComponent {
   readonly carrySlots: readonly CarrySlot[];
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.rideable, _RideableComponentArray> {}
}

class _RideableComponentArray extends ServerComponentArray<RideableComponent, RideableComponentData> {
   public decodeData(reader: PacketReader): RideableComponentData {
      const carrySlotsData: CarrySlot[] = [];
      
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
         carrySlotsData.push(carrySlot);
      }
      
      return createRideableComponentData(carrySlotsData);
   }

   public createComponent(entityComponentData: EntityComponentData): RideableComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const rideableComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.rideable);
      return {
         carrySlots: rideableComponentData.carrySlots
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public updateFromData(data: RideableComponentData, entity: Entity): void {
      const rideableComponent = RideableComponentArray.getComponent(entity);

      for (let i = 0; i < rideableComponent.carrySlots.length; i++) {
         const carrySlot = rideableComponent.carrySlots[i];
         const carrySlotData = data.carrySlots[i];
         
         const occupiedEntity = carrySlotData.occupiedEntity;

         if (occupiedEntity !== carrySlot.occupiedEntity) {
            const transformComponent = TransformComponentArray.getComponent(entity);
            const mountHitbox = transformComponent.hitboxMap.get(carrySlot.hitboxLocalID);
            assert(mountHitbox !== undefined);
            const layer = getEntityLayer(entity);
            
            if (entityExists(occupiedEntity)) {
               // Play mount sound when entity mounts a carry slot
               switch (getEntityType(occupiedEntity)) {
                  case EntityType.barrel: {
                     playSound("barrel-mount.mp3", 0.4, 1, mountHitbox.box.posX, mountHitbox.box.posY, layer);
                     break;
                  }
                  default: {
                     playSound("mount.mp3", 0.4, 1, mountHitbox.box.posX, mountHitbox.box.posY, layer);
                     break;
                  }
               }
            } else {
               // Play a sound when the entity dismounts a carry slot
               playSound("dismount.mp3", 0.4, 1, mountHitbox.box.posX, mountHitbox.box.posY, layer);

               if (carrySlot.occupiedEntity === playerInstance) {
                  // Dismount
                  
                  const transformComponent = TransformComponentArray.getComponent(playerInstance);
                  const playerHitbox = transformComponent.hitboxes[0];

                  rotatePointAroundOrigin(carrySlot.offsetX + carrySlot.dismountOffsetX, carrySlot.offsetY + carrySlot.dismountOffsetY, mountHitbox.box.angle);
                  translateHitbox(playerHitbox, _point.x, _point.y);

                  // @HACK reset acceleration because it's accumulated a bunch for some reason
                  playerHitbox.accelX = 0;
                  playerHitbox.accelY = 0;
               }
            }
         }
         
         carrySlot.occupiedEntity = occupiedEntity;
      }
   }
}

export const RideableComponentArray = registerServerComponentArray(ServerComponentType.rideable, _RideableComponentArray, true);

export function createRideableComponentData(carrySlots: readonly CarrySlot[]): RideableComponentData {
   return {
      carrySlots: carrySlots
   };
}