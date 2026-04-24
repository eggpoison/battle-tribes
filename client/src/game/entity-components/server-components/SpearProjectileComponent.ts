import { Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface SpearProjectileComponentData {}

export interface SpearProjectileComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.spearProjectile, _SpearProjectileComponentArray> {}
}

class _SpearProjectileComponentArray extends _ServerComponentArray<SpearProjectileComponent, SpearProjectileComponentData> {
   public decodeData(): SpearProjectileComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponent.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            // @HACK
            getTextureArrayIndex("items/misc/ivory-spear.png")
         )
      );
   }

   public createComponent(): SpearProjectileComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onSpawn(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("spear-throw.mp3", 0.4, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("spear-hit.mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const SpearProjectileComponentArray = registerServerComponentArray(ServerComponentType.spearProjectile, _SpearProjectileComponentArray, true);