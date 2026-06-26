import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { randFloat } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import { createWoodSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface TreeRootBaseComponentData {}

export interface TreeRootBaseComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.treeRootBase, typeof TreeRootBaseComponentArray> {}
}

export const TreeRootBaseComponentArray = registerServerComponentArray(
   ServerComponentType.treeRootBase,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
TreeRootBaseComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TreeRootBaseComponentArray.onHit = onHit;
TreeRootBaseComponentArray.onDie = onDie;

function decodeData(): TreeRootBaseComponentData {
   return {};
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
         TextureIndex.entities_treeRootBase_treeRootBase
      )
   );
}

function createComponent(): TreeRootBaseComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   for (let i = 0; i < 6; i++) {
      createWoodSpeckParticle(hitbox.box.posX, hitbox.box.posY, 16 * Math.random());
   }

   playSoundOnHitbox("tree-root-base-hit.mp3", randFloat(0.47, 0.53), randFloat(0.9, 1.1), entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   for (let i = 0; i < 10; i++) {
      createWoodSpeckParticle(hitbox.box.posX, hitbox.box.posY, 16 * Math.random());
   }

   playSoundOnHitbox("tree-root-base-death.mp3", 0.5, 1, entity, hitbox, false);
}