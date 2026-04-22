import { randInt, Entity, PacketReader, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface IceSpikesPlantedComponentData {
   readonly growthProgress: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface IceSpikesPlantedComponent {
   readonly renderPart: TexturedRenderPart;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.iceSpikesPlanted, _IceSpikesPlantedComponentArray, IceSpikesPlantedComponentData> {}
}

const TEXTURE_SOURCES = ["entities/plant/ice-spikes-sapling-1.png", "entities/plant/ice-spikes-sapling-2.png", "entities/plant/ice-spikes-sapling-3.png", "entities/plant/ice-spikes-sapling-4.png", "entities/plant/ice-spikes-sapling-5.png", "entities/plant/ice-spikes-sapling-6.png", "entities/plant/ice-spikes-sapling-7.png", "entities/plant/ice-spikes-sapling-8.png", "entities/plant/ice-spikes-sapling-9.png"];

class _IceSpikesPlantedComponentArray extends _ServerComponentArray<IceSpikesPlantedComponent, IceSpikesPlantedComponentData, IntermediateInfo> {
   public decodeData(reader: PacketReader): IceSpikesPlantedComponentData {
      const growthProgress = reader.readNumber();
      return {
         growthProgress: growthProgress
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const iceSpikesPlantedComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.iceSpikesPlanted);
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         // @Cleanup: why is this 9 instead of 0?
         9,
         0,
         0, 0,
         getTextureArrayIndex(getTextureSource(iceSpikesPlantedComponentData.growthProgress))
      );
      renderObject.attachRenderPart(renderPart);

      return {
         renderPart: renderPart
      };
   }

   public createComponent(_entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): IceSpikesPlantedComponent {
      return {
         renderPart: intermediateInfo.renderPart
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public updateFromData(data: IceSpikesPlantedComponentData, entity: Entity): void {
      const iceSpikesPlantedComponent = IceSpikesPlantedComponentArray.getComponent(entity);
      iceSpikesPlantedComponent.renderPart.switchTextureSource(getTextureSource(data.growthProgress));
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      // @Incomplete: particles?
      playSoundOnHitbox("ice-spikes-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      // @Incomplete: particles?
      playSoundOnHitbox("ice-spikes-destroy.mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const IceSpikesPlantedComponentArray = registerServerComponentArray(ServerComponentType.iceSpikesPlanted, _IceSpikesPlantedComponentArray, true);

const getTextureSource = (growthProgress: number): string => {
   const idx = Math.floor(growthProgress * (TEXTURE_SOURCES.length - 1))
   return TEXTURE_SOURCES[idx];
}