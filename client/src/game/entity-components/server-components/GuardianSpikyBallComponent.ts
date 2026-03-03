import { Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createGenericGemParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export interface GuardianSpikyBallComponentData {}

interface IntermediateInfo {}

export interface GuardianSpikyBallComponent {}

export const GuardianSpikyBallComponentArray = new ServerComponentArray<GuardianSpikyBallComponent, GuardianSpikyBallComponentData, IntermediateInfo>(ServerComponentType.guardianSpikyBall, true, createComponent, getMaxRenderParts, decodeData);
GuardianSpikyBallComponentArray.populateIntermediateInfo = populateIntermediateInfo;
GuardianSpikyBallComponentArray.onLoad = onLoad;
GuardianSpikyBallComponentArray.onDie = onDie;

function decodeData(): GuardianSpikyBallComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/guardian-spiky-ball/guardian-spiky-ball.png")
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
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