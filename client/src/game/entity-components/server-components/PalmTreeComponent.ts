import { CircularBox } from "../../../../../shared/src/boxes";
import { HitFlags } from "../../../../../shared/src/client-server-types";
import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { Point, randAngle, randFloat, angle, randItem, randInt } from "../../../../../shared/src/utils";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH, createWoodSpeckParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { TransformComponentArray } from "./TransformComponent";
import { TREE_HIT_SOUNDS, TREE_DESTROY_SOUNDS } from "./TreeComponent";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface PalmTreeComponentData {}

export interface PalmTreeComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.palmTree, _PalmTreeComponentArray> {}
}

class _PalmTreeComponentArray extends _ServerComponentArray<PalmTreeComponent, PalmTreeComponentData> {
   public decodeData(): PalmTreeComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            TextureIndex.entities_palmTree_palmTree
         )
      );
   }

   public createComponent(): PalmTreeComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
      
   public onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point, hitFlags: number): void {
      const radius = (hitbox.box as CircularBox).radius;
   
      // @Cleanup: copy and paste
      const isDamagingHit = (hitFlags & HitFlags.NON_DAMAGING_HIT) === 0;
      
      // Create leaf particles
      {
         const moveDirection = randAngle();
   
         const spawnPositionX = hitbox.box.posX + radius * Math.sin(moveDirection);
         const spawnPositionY = hitbox.box.posY + radius * Math.cos(moveDirection);
   
         createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      const numSpecks = 7;
      for (let i = 0; i < numSpecks; i++) {
         createLeafSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
      }
   
      if (isDamagingHit) {
         // Create wood specks at the point of hit
         const spawnOffsetDirection = angle(hitPosition.x - hitbox.box.posX, hitPosition.y - hitbox.box.posY);
         const spawnPositionX = hitbox.box.posX + (radius + 2) * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.posY + (radius + 2) * Math.cos(spawnOffsetDirection);
         for (let i = 0; i < 4; i++) {
            createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
         }
         
         playSoundOnHitbox(randItem(TREE_HIT_SOUNDS), 0.4, 1, entity, hitbox, false);
      } else {
         // @Temporary
         playSoundOnHitbox("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, entity, hitbox, false);
      }
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
   
      const radius = (hitbox.box as CircularBox).radius;
   
      const numLeaves = randInt(4, 5);
      for (let i = 0; i < numLeaves; i++) {
         const spawnOffsetMagnitude = radius * Math.random();
         const spawnOffsetDirection = randAngle();
         const spawnPositionX = hitbox.box.posX + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = hitbox.box.posY + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
   
         createLeafParticle(spawnPositionX, spawnPositionY, Math.random(), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      const numSpecks = 7;
      for (let i = 0; i < numSpecks; i++) {
         createLeafSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
      }
   
      for (let i = 0; i < 10; i++) {
         createWoodSpeckParticle(hitbox.box.posX, hitbox.box.posY, radius * Math.random());
      }
   
      playSoundOnHitbox(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, entity, hitbox, false);
   }
}

export const PalmTreeComponentArray = registerServerComponentArray(ServerComponentType.palmTree, _PalmTreeComponentArray, true);