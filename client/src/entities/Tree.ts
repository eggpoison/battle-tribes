import { EntityType, TreeSize } from "webgl-test-shared/dist/entities";
import { Point, angle, randFloat, randInt, randItem } from "webgl-test-shared/dist/utils";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import { HitData, HitFlags } from "webgl-test-shared/dist/client-server-types";
import RenderPart from "../render-parts/RenderPart";
import { LeafParticleSize, createLeafParticle, createLeafSpeckParticle, createWoodSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import { AudioFilePath, playSound } from "../sound";
import TreeComponent from "../entity-components/TreeComponent";
import HealthComponent from "../entity-components/HealthComponent";
import StatusEffectComponent from "../entity-components/StatusEffectComponent";
import Entity from "../Entity";

const treeTextures: { [T in TreeSize]: string } = {
   [TreeSize.small]: "entities/tree/tree-small.png",
   [TreeSize.large]: "entities/tree/tree-large.png"
}

export const TREE_HIT_SOUNDS: ReadonlyArray<AudioFilePath> = ["tree-hit-1.mp3", "tree-hit-2.mp3", "tree-hit-3.mp3", "tree-hit-4.mp3"];
export const TREE_DESTROY_SOUNDS: ReadonlyArray<AudioFilePath> = ["tree-destroy-1.mp3", "tree-destroy-2.mp3", "tree-destroy-3.mp3", "tree-destroy-4.mp3"];

const getRadius = (treeSize: TreeSize): number => {
   return 40 + treeSize * 10;
}

class Tree extends Entity {
   public static readonly LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
   public static readonly LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;
   
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.tree>) {
      super(position, id, EntityType.tree, ageTicks);

      const treeComponentData = componentsData[2];
      
      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex(treeTextures[treeComponentData.treeSize]),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.health, new HealthComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.statusEffect, new StatusEffectComponent(this, componentsData[1]));
      this.addServerComponent(ServerComponentType.tree, new TreeComponent(this, treeComponentData));
   }

   protected onHit(hitData: HitData): void {
      const treeComponent = this.getServerComponent(ServerComponentType.tree);
      const radius = getRadius(treeComponent.treeSize);

      // @Cleanup: copy and paste
      const isDamagingHit = (hitData.flags & HitFlags.NON_DAMAGING_HIT) === 0;
      
      // Create leaf particles
      {
         const moveDirection = 2 * Math.PI * Math.random();

         const spawnPositionX = this.position.x + radius * Math.sin(moveDirection);
         const spawnPositionY = this.position.y + radius * Math.cos(moveDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      const numSpecks = treeComponent.treeSize === TreeSize.small ? 4 : 7;
      for (let i = 0; i < numSpecks; i++) {
         createLeafSpeckParticle(this.position.x, this.position.y, radius, Tree.LEAF_SPECK_COLOUR_LOW, Tree.LEAF_SPECK_COLOUR_HIGH);
      }

      if (isDamagingHit) {
         // Create wood specks at the point of hit
         const spawnOffsetDirection = angle(hitData.hitPosition[0] - this.position.x, hitData.hitPosition[1] - this.position.y);
         const spawnPositionX = this.position.x + (radius + 2) * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + (radius + 2) * Math.cos(spawnOffsetDirection);
         for (let i = 0; i < 4; i++) {
            createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
         }
         
         playSound(randItem(TREE_HIT_SOUNDS), 0.4, 1, this.position.x, this.position.y);
      } else {
         // @Temporary
         playSound(("berry-bush-hit-" + randInt(1, 3) + ".mp3") as AudioFilePath, 0.4, 1, this.position.x, this.position.y);
      }
   }

   public onDie(): void {
      const treeComponent = this.getServerComponent(ServerComponentType.tree);
      const radius = getRadius(treeComponent.treeSize);

      let numLeaves: number;
      if (treeComponent.treeSize === TreeSize.small) {
         numLeaves = randInt(2, 3);
      } else {
         numLeaves = randInt(4, 5);
      }
      for (let i = 0; i < numLeaves; i++) {
         const spawnOffsetMagnitude = radius * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = this.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = this.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, Math.random(), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      const numSpecks = treeComponent.treeSize === TreeSize.small ? 4 : 7;
      for (let i = 0; i < numSpecks; i++) {
         createLeafSpeckParticle(this.position.x, this.position.y, radius, Tree.LEAF_SPECK_COLOUR_LOW, Tree.LEAF_SPECK_COLOUR_HIGH);
      }

      for (let i = 0; i < 10; i++) {
         createWoodSpeckParticle(this.position.x, this.position.y, radius * Math.random());
      }

      playSound(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, this.position.x, this.position.y);
   }
}

export default Tree;