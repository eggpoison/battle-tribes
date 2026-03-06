import { randFloat, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import { createWoodSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getTransformComponentData } from "../../networking/packet-snapshots";

export interface TreeRootBaseComponentData {}

interface IntermediateInfo {}

export interface TreeRootBaseComponent {}

export const TreeRootBaseComponentArray = new ServerComponentArray<TreeRootBaseComponent, TreeRootBaseComponentData, IntermediateInfo>(ServerComponentType.treeRootBase, true, createComponent, getMaxRenderParts, decodeData);
TreeRootBaseComponentArray.populateIntermediateInfo = populateIntermediateInfo;
TreeRootBaseComponentArray.onHit = onHit;
TreeRootBaseComponentArray.onDie = onDie;

function decodeData(): TreeRootBaseComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/tree-root-base/tree-root-base.png")
      )
   );

   return {};
}

function createComponent(): TreeRootBaseComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

function onHit(entity: Entity, hitbox: Hitbox): void {
   for (let i = 0; i < 6; i++) {
      createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16 * Math.random());
   }

   playSoundOnHitbox("tree-root-base-hit.mp3", randFloat(0.47, 0.53), randFloat(0.9, 1.1), entity, hitbox, false);
}

function onDie(entity: Entity): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];

   for (let i = 0; i < 10; i++) {
      createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16 * Math.random());
   }

   playSoundOnHitbox("tree-root-base-death.mp3", 0.5, 1, entity, hitbox, false);
}