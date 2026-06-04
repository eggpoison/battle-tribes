import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { randInt } from "../../../../../shared/src/utils";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import { TransformComponentArray } from "./TransformComponent";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

const enum Var {
   NUM_GROWTH_STAGES = 9
}

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
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.iceSpikesPlanted, _IceSpikesPlantedComponentArray> {}
}

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
         getTextureIndex(iceSpikesPlantedComponentData.growthProgress)
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
      iceSpikesPlantedComponent.renderPart.switchTextureSource(getTextureIndex(data.growthProgress));
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

const getTextureIndex = (growthProgress: number): TextureIndex => {
   const idx = Math.floor(growthProgress * (Var.NUM_GROWTH_STAGES - 1))
   return TextureIndex.entities_plant_iceSpikesSapling1 + idx;
}