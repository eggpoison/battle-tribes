import { TreeSize } from "battletribes-shared/entities";
import { angle, randFloat, randInt, randItem } from "battletribes-shared/utils";
import { HitData, HitFlags } from "battletribes-shared/client-server-types";
import { LeafParticleSize, createLeafParticle, createLeafSpeckParticle, createWoodSpeckParticle } from "../particles";
import { getTextureArrayIndex } from "../texture-atlases/texture-atlases";
import { playSound } from "../sound";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";
import { getEntityRenderInfo } from "../world";
import { TreeComponentArray } from "../entity-components/TreeComponent";
import { TransformComponentArray } from "../entity-components/TransformComponent";

const treeTextures: { [T in TreeSize]: string } = {
   [TreeSize.small]: "entities/tree/tree-small.png",
   [TreeSize.large]: "entities/tree/tree-large.png"
};

export const TREE_HIT_SOUNDS: ReadonlyArray<string> = ["tree-hit-1.mp3", "tree-hit-2.mp3", "tree-hit-3.mp3", "tree-hit-4.mp3"];
export const TREE_DESTROY_SOUNDS: ReadonlyArray<string> = ["tree-destroy-1.mp3", "tree-destroy-2.mp3", "tree-destroy-3.mp3", "tree-destroy-4.mp3"];

const getRadius = (treeSize: TreeSize): number => {
   return 40 + treeSize * 10;
}

class Tree extends Entity {
   public static readonly LEAF_SPECK_COLOUR_LOW = [63/255, 204/255, 91/255] as const;
   public static readonly LEAF_SPECK_COLOUR_HIGH = [35/255, 158/255, 88/255] as const;
   
   constructor(id: number) {
      super(id);
   }

   public onLoad(): void {
      const treeComponent = TreeComponentArray.getComponent(this.id);
      
      const renderInfo = getEntityRenderInfo(this.id);
      renderInfo.attachRenderThing(
         new TexturedRenderPart(
            null,
            0,
            0,
            getTextureArrayIndex(treeTextures[treeComponent.treeSize])
         )
      );
   }

   protected onHit(hitData: HitData): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const treeComponent = TreeComponentArray.getComponent(this.id);

      const radius = getRadius(treeComponent.treeSize);

      // @Cleanup: copy and paste
      const isDamagingHit = (hitData.flags & HitFlags.NON_DAMAGING_HIT) === 0;
      
      // Create leaf particles
      {
         const moveDirection = 2 * Math.PI * Math.random();

         const spawnPositionX = transformComponent.position.x + radius * Math.sin(moveDirection);
         const spawnPositionY = transformComponent.position.y + radius * Math.cos(moveDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, moveDirection + randFloat(-1, 1), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      const numSpecks = treeComponent.treeSize === TreeSize.small ? 4 : 7;
      for (let i = 0; i < numSpecks; i++) {
         createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, radius, Tree.LEAF_SPECK_COLOUR_LOW, Tree.LEAF_SPECK_COLOUR_HIGH);
      }

      if (isDamagingHit) {
         // Create wood specks at the point of hit
         const spawnOffsetDirection = angle(hitData.hitPosition[0] - transformComponent.position.x, hitData.hitPosition[1] - transformComponent.position.y);
         const spawnPositionX = transformComponent.position.x + (radius + 2) * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + (radius + 2) * Math.cos(spawnOffsetDirection);
         for (let i = 0; i < 4; i++) {
            createWoodSpeckParticle(spawnPositionX, spawnPositionY, 3);
         }
         
         playSound(randItem(TREE_HIT_SOUNDS), 0.4, 1, transformComponent.position);
      } else {
         // @Temporary
         playSound("berry-bush-hit-" + randInt(1, 3) + ".mp3", 0.4, 1, transformComponent.position);
      }
   }

   public onDie(): void {
      const transformComponent = TransformComponentArray.getComponent(this.id);
      const treeComponent = TreeComponentArray.getComponent(this.id);

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
         const spawnPositionX = transformComponent.position.x + spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         const spawnPositionY = transformComponent.position.y + spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createLeafParticle(spawnPositionX, spawnPositionY, Math.random(), Math.random() < 0.5 ? LeafParticleSize.large : LeafParticleSize.small);
      }
      
      // Create leaf specks
      const numSpecks = treeComponent.treeSize === TreeSize.small ? 4 : 7;
      for (let i = 0; i < numSpecks; i++) {
         createLeafSpeckParticle(transformComponent.position.x, transformComponent.position.y, radius, Tree.LEAF_SPECK_COLOUR_LOW, Tree.LEAF_SPECK_COLOUR_HIGH);
      }

      for (let i = 0; i < 10; i++) {
         createWoodSpeckParticle(transformComponent.position.x, transformComponent.position.y, radius * Math.random());
      }

      playSound(randItem(TREE_DESTROY_SOUNDS), 0.5, 1, transformComponent.position);
   }
}

export default Tree;