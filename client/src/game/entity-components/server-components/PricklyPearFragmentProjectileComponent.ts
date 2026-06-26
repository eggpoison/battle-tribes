import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { randFloat, randAngle } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { createPricklyPearParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { playSoundOnHitbox } from "../../sound";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface PricklyPearFragmentProjectileComponentData {
   readonly variant: number;
}

export interface PricklyPearFragmentProjectileComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.pricklyPearFragmentProjectile, typeof PricklyPearFragmentProjectileComponentArray> {}
}

export const PricklyPearFragmentProjectileComponentArray = registerServerComponentArray(
   ServerComponentType.pricklyPearFragmentProjectile,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
PricklyPearFragmentProjectileComponentArray.populateIntermediateInfo = populateIntermediateInfo;
PricklyPearFragmentProjectileComponentArray.onDie = onDie;

function decodeData(reader: PacketReader): PricklyPearFragmentProjectileComponentData {
   const variant = reader.readNumber();
   return {
      variant: variant
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
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
         TextureIndex.entities_pricklyPearFragmentProjectile_fragment1 + pricklyPearFragmentProjectileComponentData.variant
      )
   );
}

function createComponent(): PricklyPearFragmentProjectileComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}
   
function onDie(fragment: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(fragment);
   const hitbox = transformComponent.hitboxes[0];

   playSoundOnHitbox("prickly-pear-fragment-projectile-explode.mp3", 0.4, randFloat(0.9, 1.1), fragment, hitbox, false);
   
   for (let i = 0; i < 4; i++) {
      const offsetDirection = randAngle();
      const offsetMagnitude = randFloat(4, 8);
      const x = hitbox.box.posX + offsetMagnitude * Math.sin(offsetDirection);
      const y = hitbox.box.posY + offsetMagnitude * Math.cos(offsetDirection);
      createPricklyPearParticle(x, y, randAngle());
   }
}