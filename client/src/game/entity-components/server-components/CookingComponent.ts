import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { Settings } from "../../../../../shared/src/settings";
import { Light, removeLight } from "../../lights";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";
import { tickIntervalHasPassed } from "../../networking/snapshots";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface CookingComponentData {
   readonly heatingProgress: number;
   readonly isCooking: boolean;
}

export interface CookingComponent {
   heatingProgress: number;
   isCooking: boolean;

   // @Polymorphism
   light: Light | null;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.cooking, CookingComponentArray> {}
}

class CookingComponentArray extends ServerComponentArray<CookingComponent, CookingComponentData> {
   public decodeData(reader: PacketReader): CookingComponentData {
      const heatingProgress = reader.readNumber();
      const isCooking = reader.readBool();
      return {
         heatingProgress: heatingProgress,
         isCooking: isCooking
      };
   }

   public createComponent(entityComponentData: EntityComponentData): CookingComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const cookingComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.cooking);
      
      return {
         heatingProgress: cookingComponentData.heatingProgress,
         isCooking: cookingComponentData.isCooking,
         light: null
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public onLoad(entity: Entity): void {
      const cookingComponent = cookingComponentArray.getComponent(entity);
      updateLight(cookingComponent, entity);
   }

   public onTick(entity: Entity): void {
      const cookingComponent = cookingComponentArray.getComponent(entity);
      updateLight(cookingComponent, entity);
   }

   public updateFromData(data: CookingComponentData, entity: Entity): void {
      const cookingComponent = cookingComponentArray.getComponent(entity);
      cookingComponent.heatingProgress = data.heatingProgress;
      cookingComponent.isCooking = data.isCooking;
   }
}

export const cookingComponentArray = registerServerComponentArray(ServerComponentType.cooking, CookingComponentArray, true);

export function createCookingComponentData(): CookingComponentData {
   return {
      heatingProgress: 0,
      isCooking: false
   };
}

const updateLight = (cookingComponent: CookingComponent, entity: Entity): void => {
   if (cookingComponent.isCooking) {
      if (cookingComponent.light === null) {
         // @INCOMPLETE
         
         // cookingComponent.light = createLight(
         //    new Point(0, 0),
         //    1,
         //    1.5,
         //    40,
         //    1,
         //    0.6,
         //    0.35
         // );

         // // @Hack
         // const renderObject = getEntityRenderObject(entity);
         // attachLightToRenderPart(cookingComponent.light, renderObject.renderPartsByZIndex[0], entity);
      }

      if (tickIntervalHasPassed(0.15 * Settings.TICK_RATE)) {
         // cookingComponent.light.radius = 40 + randFloat(-7, 7);
      }
   } else if (cookingComponent.light !== null) {
      removeLight(cookingComponent.light);
      cookingComponent.light = null;
   }
}