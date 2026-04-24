import { Entity, PacketReader, randAngle, randFloat, ServerComponentType, TribeType } from "webgl-test-shared";
import { playSoundOnHitbox } from "../../sound";
import { getHumanoidRadius, TribesmanComponentArray } from "./TribesmanComponent";
import { createConversionParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import _ServerComponentArray from "../ServerComponentArray";
import { Tribe, tribeExists } from "../../tribes";
import { playerInstance } from "../../player";
import { EntityComponentData } from "../../world";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface TribeComponentData {
   readonly tribeID: number;
   readonly tribeType: TribeType;
}

export interface TribeComponent {
   tribeID: number;
   tribeType: TribeType;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tribe, _TribeComponentArray> {}
}

class _TribeComponentArray extends _ServerComponentArray<TribeComponent, TribeComponentData> {
   public decodeData(reader: PacketReader): TribeComponentData {
      const tribeID = reader.readNumber();
      const tribeType = reader.readNumber() as TribeType;
      
      return {
         tribeID: tribeID,
         tribeType: tribeType
      };
   }

   public createComponent(entityComponentData: EntityComponentData): TribeComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tribeComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribe);

      if (!tribeExists(tribeComponentData.tribeID)) {
         console.warn("In creating tribe component from data, no tribe with id '" + tribeComponentData.tribeID + "' exists!");
      }

      return {
         tribeID: tribeComponentData.tribeID,
         tribeType: tribeComponentData.tribeType
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public updateFromData(data: TribeComponentData, entity: Entity): void {
      const tribeComponent = TribeComponentArray.getComponent(entity);
      
      const tribeID = data.tribeID;
      const tribeType = data.tribeType;
      
      // Tribesman conversion
      if (tribeID !== tribeComponent.tribeID && TribesmanComponentArray.hasComponent(entity)) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];

         playSoundOnHitbox("conversion.mp3", 0.4, 1, entity, hitbox, false);

         const radius = getHumanoidRadius(entity);
         for (let i = 0; i < 10; i++) {
            const offsetDirection = randAngle();
            const offsetMagnitude = radius + randFloat(0, 4);
            const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
            const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);

            const velocityDirection = offsetDirection + randFloat(-0.5, 0.5);
            const velocityMagnitude = randFloat(55, 110);
            const velocityX = velocityMagnitude * Math.sin(velocityDirection);
            const velocityY = velocityMagnitude * Math.cos(velocityDirection);
            
            createConversionParticle(x, y, velocityX, velocityY);
         }
      }
      
      tribeComponent.tribeID = tribeID;
      tribeComponent.tribeType = tribeType;
   }

   public updatePlayerFromData(data: TribeComponentData): void {
      this.updateFromData(data, playerInstance!);
   }
}

export const TribeComponentArray = registerServerComponentArray(ServerComponentType.tribe, _TribeComponentArray, true);

export function createTribeComponentData(tribe: Tribe): TribeComponentData {
   return {
      tribeID: tribe.id,
      tribeType: tribe.tribeType
   };
}