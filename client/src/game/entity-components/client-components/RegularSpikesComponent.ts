import { Entity, EntityType, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { WALL_SPIKE_TEXTURE_SOURCES, FLOOR_SPIKE_TEXTURE_SOURCES } from "../server-components/BuildingMaterialComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerClientComponentArray } from "../component-register";

export interface RegularSpikesComponentData {}

export interface RegularSpikesComponent {}

class _RegularSpikesComponentArray extends ClientComponentArray<RegularSpikesComponent> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const materialComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.buildingMaterial);

      const isAttachedToWall = entityComponentData.entityType === EntityType.wallSpikes;
      let textureArrayIndex: number;
      if (isAttachedToWall) {
         textureArrayIndex = getTextureArrayIndex(WALL_SPIKE_TEXTURE_SOURCES[materialComponentData.material]);
      } else {
         textureArrayIndex = getTextureArrayIndex(FLOOR_SPIKE_TEXTURE_SOURCES[materialComponentData.material]);
      }

      const mainRenderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         textureArrayIndex
      )
      addRenderPartTag(mainRenderPart, "buildingMaterialComponent:material");

      renderObject.attachRenderPart(mainRenderPart);
   }

   public createComponent(): RegularSpikesComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      playSoundOnHitbox("wooden-spikes-hit.mp3", 0.2, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("wooden-spikes-destroy.mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const RegularSpikesComponentArray = registerClientComponentArray(ClientComponentType.regularSpikes, _RegularSpikesComponentArray, true);

export function createRegularSpikesComponentData(): RegularSpikesComponentData {
   return {};
}