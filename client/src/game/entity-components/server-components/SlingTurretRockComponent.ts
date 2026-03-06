import { randAngle, randFloat, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getHitboxVelocity, Hitbox } from "../../hitboxes";
import { createArrowDestroyParticle, createRockParticle, createRockSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../../networking/packet-snapshots";

export interface SlingTurretRockComponentData {}

interface IntermediateInfo {}

export interface SlingTurretRockComponent {}

export const SlingTurretRockComponentArray = new ServerComponentArray<SlingTurretRockComponent, SlingTurretRockComponentData, IntermediateInfo>(ServerComponentType.slingTurretRock, true, createComponent, getMaxRenderParts, decodeData);
SlingTurretRockComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SlingTurretRockComponentArray.onDie = onDie;

export function createSlingTurretRockComponentData(): SlingTurretRockComponentData {
   return {};
}

function decodeData(): SlingTurretRockComponentData {
   return createSlingTurretRockComponentData();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("projectiles/sling-rock.png")
      )
   );

   return {};
}

function createComponent(): SlingTurretRockComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   const velocity = getHitboxVelocity(hitbox);

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