import { Light, removeLight } from "../../lights";
import { Entity, ServerComponentType, PacketReader } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";
import { tickIntervalHasPassed } from "../../game";

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

export const CookingComponentArray = new ServerComponentArray<CookingComponent, CookingComponentData, never>(ServerComponentType.cooking, true, createComponent, getMaxRenderParts, decodeData);
CookingComponentArray.onLoad = onLoad;
CookingComponentArray.onTick = onTick;
CookingComponentArray.updateFromData = updateFromData;

export function createCookingComponentData(): CookingComponentData {
   return {
      heatingProgress: 0,
      isCooking: false
   };
}

function decodeData(reader: PacketReader): CookingComponentData {
   const heatingProgress = reader.readNumber();
   const isCooking = reader.readBool();
   return {
      heatingProgress: heatingProgress,
      isCooking: isCooking
   };
}

function createComponent(entityComponentData: EntityComponentData): CookingComponent {
   const cookingComponentData = entityComponentData.serverComponentData.get(ServerComponentType.cooking)!;
   
   return {
      heatingProgress: cookingComponentData.heatingProgress,
      isCooking: cookingComponentData.isCooking,
      light: null
   };
}

function getMaxRenderParts(): number {
   return 0;
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
         // const renderInfo = getEntityRenderInfo(entity);
         // attachLightToRenderPart(cookingComponent.light, renderInfo.renderPartsByZIndex[0], entity);
      }

      if (tickIntervalHasPassed(0.15)) {
         // cookingComponent.light.radius = 40 + randFloat(-7, 7);
      }
   } else if (cookingComponent.light !== null) {
      removeLight(cookingComponent.light);
      cookingComponent.light = null;
   }
}

function onLoad(entity: Entity): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   updateLight(cookingComponent, entity);
}

function onTick(entity: Entity): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   updateLight(cookingComponent, entity);
}

function updateFromData(data: CookingComponentData, entity: Entity): void {
   const cookingComponent = CookingComponentArray.getComponent(entity);
   cookingComponent.heatingProgress = data.heatingProgress;
   cookingComponent.isCooking = data.isCooking;
}