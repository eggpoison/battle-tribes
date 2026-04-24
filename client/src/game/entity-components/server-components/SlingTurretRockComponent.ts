import { randAngle, randFloat, Entity, ServerComponentType, _point } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity, Hitbox } from "../../hitboxes";
import { createArrowDestroyParticle, createRockParticle, createRockSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface SlingTurretRockComponentData {}

export interface SlingTurretRockComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.slingTurretRock, _SlingTurretRockComponentArray> {}
}

class _SlingTurretRockComponentArray extends _ServerComponentArray<SlingTurretRockComponent, SlingTurretRockComponentData> {
   public decodeData(): SlingTurretRockComponentData {
      return createSlingTurretRockComponentData();
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("projectiles/sling-rock.png")
         )
      );
   }

   public createComponent(): SlingTurretRockComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      getHitboxVelocity(hitbox);
      const velocity = _point;

      // Create arrow break particles
      for (let i = 0; i < 6; i++) {
         createArrowDestroyParticle(hitbox.box.position.x, hitbox.box.position.y, velocity.x, velocity.y);
      }

      for (let i = 0; i < 3; i++) {
         const spawnOffsetMagnitude = 16 * Math.random();
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createRockParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(60, 100), ParticleRenderLayer.low);
      }

      for (let i = 0; i < 5; i++) {
         createRockSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16, 0, 0, ParticleRenderLayer.low);
      }
   }
}

export const SlingTurretRockComponentArray = registerServerComponentArray(ServerComponentType.slingTurretRock, _SlingTurretRockComponentArray, true);

export function createSlingTurretRockComponentData(): SlingTurretRockComponentData {
   return {};
}