import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { EntityRenderObject } from "../../EntityRenderObject";
import { createGenericGemParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface GuardianSpikyBallComponentData {}

export interface GuardianSpikyBallComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.guardianSpikyBall, typeof GuardianSpikyBallComponentArray> {}
}

export const GuardianSpikyBallComponentArray = registerServerComponentArray(
   ServerComponentType.guardianSpikyBall,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
GuardianSpikyBallComponentArray.populateIntermediateInfo = populateIntermediateInfo;
GuardianSpikyBallComponentArray.onLoad = onLoad;
GuardianSpikyBallComponentArray.onDie = onDie;

function decodeData(): GuardianSpikyBallComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      TextureIndex.entities_guardianSpikyBall_guardianSpikyBall
   );
   renderObject.attachRenderPart(renderPart);
}

function createComponent(): GuardianSpikyBallComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onLoad(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   playSoundOnHitbox("guardian-spiky-ball-spawn.mp3", 0.4, 1, entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   playSoundOnHitbox("guardian-spiky-ball-death.mp3", 0.4, 1, entity, hitbox, false);

   for (let i = 0; i < 10; i++) {
      const offsetMagnitude = 10 * Math.random();

      createGenericGemParticle(hitbox, offsetMagnitude, 0.7, 0.16, 0.7);
   }
}