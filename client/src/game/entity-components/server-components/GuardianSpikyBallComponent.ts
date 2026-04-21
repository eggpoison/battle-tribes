import { Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { createGenericGemParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface GuardianSpikyBallComponentData {}

export interface GuardianSpikyBallComponent {}

class _GuardianSpikyBallComponentArray extends ServerComponentArray<GuardianSpikyBallComponent, GuardianSpikyBallComponentData> {
   public decodeData(): GuardianSpikyBallComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/guardian-spiky-ball/guardian-spiky-ball.png")
      );
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): GuardianSpikyBallComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onLoad(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("guardian-spiky-ball-spawn.mp3", 0.4, 1, entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      playSoundOnHitbox("guardian-spiky-ball-death.mp3", 0.4, 1, entity, hitbox, false);

      for (let i = 0; i < 10; i++) {
         const offsetMagnitude = 10 * Math.random();

         createGenericGemParticle(hitbox, offsetMagnitude, 0.7, 0.16, 0.7);
      }
   }
}

export const GuardianSpikyBallComponentArray = registerServerComponentArray(ServerComponentType.guardianSpikyBall, _GuardianSpikyBallComponentArray, true);