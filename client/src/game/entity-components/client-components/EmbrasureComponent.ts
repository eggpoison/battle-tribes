import { Point, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import { createLightWoodSpeckParticle, createWoodShardParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { EMBRASURE_TEXTURE_SOURCES } from "../server-components/BuildingMaterialComponent";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerClientComponentArray } from "../component-registry";

export interface EmbrasureComponentData {}

export interface EmbrasureComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.embrasure, _EmbrasureComponentArray, EmbrasureComponentData> {}
}

class _EmbrasureComponentArray extends _ClientComponentArray<EmbrasureComponent> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const buildingMaterialComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.buildingMaterial);

      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex(EMBRASURE_TEXTURE_SOURCES[buildingMaterialComponentData.material])
      );
      addRenderPartTag(renderPart, "buildingMaterialComponent:material");

      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): EmbrasureComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point): void {
      playSoundOnHitbox("wooden-wall-hit.mp3", 0.3, 1, entity, hitbox, false);

      for (let i = 0; i < 4; i++) {
         createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 20);
      }

      for (let i = 0; i < 7; i++) {
         let offsetDirection = hitbox.box.position.angleTo(hitPosition);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = hitbox.box.position.x + 20 * Math.sin(offsetDirection);
         const spawnPositionY = hitbox.box.position.y + 20 * Math.cos(offsetDirection);
         createLightWoodSpeckParticle(spawnPositionX, spawnPositionY, 5);
      }
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      playSoundOnHitbox("wooden-wall-break.mp3", 0.4, 1, entity, hitbox, false);

      for (let i = 0; i < 7; i++) {
         createLightWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 32 * Math.random());
      }

      for (let i = 0; i < 3; i++) {
         createWoodShardParticle(hitbox.box.position.x, hitbox.box.position.y, 32);
      }
   }
}

export const EmbrasureComponentArray = registerClientComponentArray(ClientComponentType.embrasure, _EmbrasureComponentArray, true);

export function createEmbrasureComponentData(): EmbrasureComponentData {
   return {};
}