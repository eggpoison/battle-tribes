import { randFloat, PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import { createWoodSpeckParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface TreeRootSegmentComponentData {
   readonly variant: number;
}

export interface TreeRootSegmentComponent {
   readonly variant: number;
}

class _TreeRootSegmentComponentArray extends ServerComponentArray<TreeRootSegmentComponent, TreeRootSegmentComponentData> {
   public decodeData(reader: PacketReader): TreeRootSegmentComponentData {
      const variant = reader.readNumber();
      return {
         variant: variant
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const treeRootSegmentComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.treeRootSegment);
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/tree-root-segment/tree-root-segment-" + (treeRootSegmentComponentData.variant + 1) + ".png")
      );
      if (Math.random() < 0.5) {
         renderPart.setFlipX(true);
      }
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(entityComponentData: EntityComponentData): TreeRootSegmentComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const treeRootSegmentComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.treeRootSegment);
      return {
         variant: treeRootSegmentComponentData.variant
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      for (let i = 0; i < 6; i++) {
         createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16 * Math.random());
      }

      playSoundOnHitbox("tree-root-segment-hit.mp3", randFloat(0.47, 0.53), randFloat(0.9, 1.1), entity, hitbox, false);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];

      for (let i = 0; i < 10; i++) {
         createWoodSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, 16 * Math.random());
      }

      const treeRootSegmentComponent = TreeRootSegmentComponentArray.getComponent(entity);
      playSoundOnHitbox("tree-root-segment-death-" + (treeRootSegmentComponent.variant % 3 + 1) + ".mp3", 0.5, 1, entity, hitbox, false);
   }
}

export const TreeRootSegmentComponentArray = registerServerComponentArray(ServerComponentType.treeRootSegment, _TreeRootSegmentComponentArray, true);