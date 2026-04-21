import { randFloat, randItem, randInt, Point, randAngle, HitFlags, Entity, PacketReader, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { createLeafParticle, LeafParticleSize, createLeafSpeckParticle, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH, createWoodSpeckParticle } from "../../particles";
import { playSoundOnHitbox } from "../../sound";
import { TREE_HIT_SOUNDS, TREE_DESTROY_SOUNDS } from "./TreeComponent";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface TreePlantedComponentData {
   readonly growthProgress: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface TreePlantedComponent {
   growthProgress: number;
   readonly renderPart: TexturedRenderPart;
}

const TEXTURE_SOURCES = ["entities/plant/tree-sapling-1.png", "entities/plant/tree-sapling-2.png", "entities/plant/tree-sapling-3.png", "entities/plant/tree-sapling-4.png", "entities/plant/tree-sapling-5.png", "entities/plant/tree-sapling-6.png", "entities/plant/tree-sapling-7.png", "entities/plant/tree-sapling-8.png", "entities/plant/tree-sapling-9.png", "entities/plant/tree-sapling-10.png", "entities/plant/tree-sapling-11.png"];

class _TreePlantedComponentArray extends ServerComponentArray<TreePlantedComponent, TreePlantedComponentData, IntermediateInfo> {
   public decodeData(reader: PacketReader): TreePlantedComponentData {
      const growthProgress = reader.readNumber();
      return {
         growthProgress: growthProgress
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
      const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponent.hitboxes[0];

      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const growthProgress = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.treePlanted).growthProgress;
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         9,
         0,
         0, 0,
         getTextureArrayIndex(getTextureSource(growthProgress))
      );
      renderObject.attachRenderPart(renderPart);

      return {
         renderPart: renderPart
      };
   }

   public createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): TreePlantedComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const growthProgress = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.treePlanted).growthProgress;
      return {
         growthProgress: growthProgress,
         renderPart: intermediateInfo.renderPart
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public updateFromData(data: TreePlantedComponentData, entity: Entity): void {
      const treePlantedComponent = TreePlantedComponentArray.getComponent(entity);
      treePlantedComponent.growthProgress = data.growthProgress;
      treePlantedComponent.renderPart.switchTextureSource(getTextureSource(treePlantedComponent.growthProgress));
   }

   public onHit(entity: Entity, hitbox: Hitbox, hitPosition: Point, hitFlags: number): void {
      const treePlantedComponent = TreePlantedComponentArray.getComponent(entity);
      
      const radius = Math.floor(treePlantedComponent.growthProgress * 10);

      // @Cleanup: copy and paste
      const isDamagingHit = (hitFlags & HitFlags.NON_DAMAGING_HIT) === 0;
      
      // Create leaf particles
      {
         const moveDirection = randAngle();

         const spawnPositionX = hitbox.box.position.x + radius * Math.sin(moveDirection);
         const spawnPositionY = hitbox.box.position.y + radius * Math.cos(moveDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      const numSpecks = Math.floor(treePlantedComponent.growthProgress * 7) + 2;
      for (let i = 0; i < numSpecks; i++) {
         createLeafSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius, LEAF_SPECK_COLOUR_LOW, LEAF_SPECK_COLOUR_HIGH);
      }

      if (isDamagingHit) {
         // Create wood specks at the point of hit

         let offsetDirection = hitbox.box.position.angleTo(hitPosition);
         offsetDirection += 0.2 * Math.PI * (Math.random() - 0.5);

         const spawnPositionX = hitbox.box.position.x + (radius + 2) * Math.sin(offsetDirection);
         const spawnPositionY = hitbox.box.position.y + (radius + 2) * Math.cos(offsetDirection);
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
      playSoundOnHitbox(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, entity, hitbox, false);
   }
}

export const TreePlantedComponentArray = registerServerComponentArray(ServerComponentType.treePlanted, _TreePlantedComponentArray, true);

const getTextureSource = (growthProgress: number): string => {
   const idx = Math.floor(growthProgress * (TEXTURE_SOURCES.length - 1))
   return TEXTURE_SOURCES[idx];
}