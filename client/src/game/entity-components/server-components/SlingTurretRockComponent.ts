import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { _point, randAngle, randFloat } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getHitboxVelocity } from "../../hitboxes";
import { createArrowDestroyParticle, createRockParticle, createRockSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface SlingTurretRockComponentData {}

export interface SlingTurretRockComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.slingTurretRock, typeof SlingTurretRockComponentArray> {}
}

export const SlingTurretRockComponentArray = registerServerComponentArray(
   ServerComponentType.slingTurretRock,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
SlingTurretRockComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SlingTurretRockComponentArray.onDie = onDie;

function decodeData(): SlingTurretRockComponentData {
   return createSlingTurretRockComponentData();
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.projectiles_slingRock
      )
   );
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
   getHitboxVelocity(hitbox);
   const velocity = _point;

   // Create arrow break particles
   for (let i = 0; i < 6; i++) {
      createArrowDestroyParticle(hitbox.box.posX, hitbox.box.posY, velocity.x, velocity.y);
   }

   for (let i = 0; i < 3; i++) {
      const spawnOffsetMagnitude = 16 * Math.random();
      const spawnOffsetDirection = randAngle();
      const spawnPositionX = hitbox.box.posX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      const spawnPositionY = hitbox.box.posY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

      createRockParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(60, 100), ParticleRenderLayer.low);
   }

   for (let i = 0; i < 5; i++) {
      createRockSpeckParticle(hitbox.box.posX, hitbox.box.posY, 16, 0, 0, ParticleRenderLayer.low);
   }
}

export function createSlingTurretRockComponentData(): SlingTurretRockComponentData {
   return {};
}