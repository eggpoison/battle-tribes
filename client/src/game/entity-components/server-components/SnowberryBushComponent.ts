import { Entity, PacketReader, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface SnowberryBushComponentData {
   readonly numBerries: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface SnowberryBushComponent {
   readonly renderPart: TexturedRenderPart;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.snowberryBush, _SnowberryBushComponentArray> {}
}

class _SnowberryBushComponentArray extends _ServerComponentArray<SnowberryBushComponent, SnowberryBushComponentData, IntermediateInfo> {
   public decodeData(reader: PacketReader): SnowberryBushComponentData {
      const numBerries = reader.readNumber();
      return {
         numBerries: numBerries
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const snowberryBushComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.snowberryBush);

      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex(getTextureSource(snowberryBushComponentData.numBerries))
      )
      renderObject.attachRenderPart(renderPart);

      return {
         renderPart: renderPart
      };
   }

   public createComponent(_entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): SnowberryBushComponent {
      return {
         renderPart: intermediateInfo.renderPart
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }
      
   public updateFromData(data: SnowberryBushComponentData, snowberryBush: Entity): void {
      const snowberryBushComponent = SnowberryBushComponentArray.getComponent(snowberryBush);

      const numBerries = data.numBerries;
      snowberryBushComponent.renderPart.switchTextureSource(getTextureSource(numBerries));
   }
}

export const SnowberryBushComponentArray = registerServerComponentArray(ServerComponentType.snowberryBush, _SnowberryBushComponentArray, true);


const getTextureSource = (numBerries: number): string => {
   return "entities/snowberry-bush/stage-" + numBerries + ".png";
}