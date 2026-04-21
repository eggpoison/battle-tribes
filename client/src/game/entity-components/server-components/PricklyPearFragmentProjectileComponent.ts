import { randAngle, randFloat, Entity, ServerComponentType, PacketReader } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { createPricklyPearParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface PricklyPearFragmentProjectileComponentData {
   readonly variant: number;
}

export interface PricklyPearFragmentProjectileComponent {}

class _PricklyPearFragmentProjectileComponentArray extends ServerComponentArray<PricklyPearFragmentProjectileComponent, PricklyPearFragmentProjectileComponentData> {
   public decodeData(reader: PacketReader): PricklyPearFragmentProjectileComponentData {
      const variant = reader.readNumber();
      return {
         variant: variant
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const pricklyPearFragmentProjectileComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.pricklyPearFragmentProjectile);

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/prickly-pear-fragment-projectile/fragment-" + (pricklyPearFragmentProjectileComponentData.variant + 1) + ".png")
         )
      );
   }

   public createComponent(): PricklyPearFragmentProjectileComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
      
   public onDie(fragment: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(fragment);
      const hitbox = transformComponent.hitboxes[0];

      playSoundOnHitbox("prickly-pear-fragment-projectile-explode.mp3", 0.4, randFloat(0.9, 1.1), fragment, hitbox, false);
      
      for (let i = 0; i < 4; i++) {
         const offsetDirection = randAngle();
         const offsetMagnitude = randFloat(4, 8);
         const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
         createPricklyPearParticle(x, y, randAngle());
      }
   }
}

export const PricklyPearFragmentProjectileComponentArray = registerServerComponentArray(ServerComponentType.pricklyPearFragmentProjectile, _PricklyPearFragmentProjectileComponentArray, true);