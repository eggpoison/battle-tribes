import { ScarInfo } from "webgl-test-shared/src/components";
import { PacketReader } from "webgl-test-shared/src/packets";
import { ServerComponentType } from "webgl-test-shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { Entity } from "../../../../../shared/src/entities";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface TribeWarriorComponentData {
   readonly scars: Array<ScarInfo>;
}

interface IntermediateInfo {}

export interface TribeWarriorComponent {
   readonly scars: Array<ScarInfo>;
}

export const TribeWarriorComponentArray = new ServerComponentArray<TribeWarriorComponent, TribeWarriorComponentData, IntermediateInfo>(ServerComponentType.tribeWarrior, true, createComponent, getMaxRenderParts, decodeData);
TribeWarriorComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TribeWarriorComponentArray.updateFromData = updateFromData;

function decodeData(reader: PacketReader): TribeWarriorComponentData {
   const scars = new Array<ScarInfo>();
   const numScars = reader.readNumber();
   for (let i = 0; i < numScars; i++) {
      const offsetX = reader.readNumber();
      const offsetY = reader.readNumber();
      const rotation = reader.readNumber();
      const type = reader.readNumber();

      scars.push({
         offsetX: offsetX,
         offsetY: offsetY,
         rotation: rotation,
         type: type
      });
   }

   return {
      scars: scars
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const tribeWarriorComponentData = entityComponentData.serverComponentData[ServerComponentType.tribeWarrior]!;
   for (let i = 0; i < tribeWarriorComponentData.scars.length; i++) {
      const scarInfo = tribeWarriorComponentData.scars[i];

      const renderPart = new TexturedRenderPart(
         hitbox,
         2.5,
         scarInfo.rotation,
         getTextureArrayIndex("scars/scar-" + (scarInfo.type + 1) + ".png")
      );
      renderPart.offset.x = scarInfo.offsetX;
      renderPart.offset.y = scarInfo.offsetY;

      renderInfo.attachRenderPart(renderPart);
   }

   return {};
}

function createComponent(entityComponentData: EntityComponentData): TribeWarriorComponent {
   return {
      scars: entityComponentData.serverComponentData[ServerComponentType.tribeWarrior]!.scars
   };
}

function getMaxRenderParts(entityComponentData: EntityComponentData): number {
   const tribeWarriorComponentData = entityComponentData.serverComponentData[ServerComponentType.tribeWarrior]!;
   return tribeWarriorComponentData.scars.length;
}

function updateFromData(data: TribeWarriorComponentData, entity: Entity): void {
   const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entity);
   for (let i = tribeWarriorComponent.scars.length; i < data.scars.length; i++) {
      tribeWarriorComponent.scars.push(data.scars[i]);
   }
}