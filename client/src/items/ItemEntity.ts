import { Point, randFloat } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { EntityComponentsData, ServerComponentType } from "webgl-test-shared/dist/components";
import Entity from "../Entity";
import RenderPart from "../render-parts/RenderPart";
import CLIENT_ITEM_INFO_RECORD from "../client-item-info";
import Board from "../Board";
import { BloodParticleSize } from "../particles";
import Particle from "../Particle";
import { addMonocolourParticleToBufferContainer, ParticleRenderLayer } from "../rendering/particle-rendering";
import { getTextureArrayIndex } from "../texture-atlases/entity-texture-atlas";
import ItemComponent from "../entity-components/ItemComponent";
import PhysicsComponent from "../entity-components/PhysicsComponent";

const createFrozenYetiBloodParticle = (size: BloodParticleSize, spawnPositionX: number, spawnPositionY: number, moveDirection: number, moveSpeed: number, hasDrag: boolean, extraVelocityX: number, extraVelocityY: number): void => {
   const lifetime = randFloat(0.3, 0.4);
   
   const pixelSize = size === BloodParticleSize.large ? 8 : 4;

   const velocityX = moveSpeed * Math.sin(moveDirection) + extraVelocityX;
   const velocityY = moveSpeed * Math.cos(moveDirection) + extraVelocityY;

   const friction = hasDrag ? moveSpeed / lifetime / 1.2 : 0;

   const particle = new Particle(lifetime);
   particle.getOpacity = (): number => {
      return 1 - particle.age / lifetime;
   };

   let r = 90/255;
   let g = 159/255;
   let b = 205/255;
   const darkenFactor = randFloat(-0.3, 0.2);
   r -= darkenFactor;
   g -= darkenFactor;
   b -= darkenFactor;

   addMonocolourParticleToBufferContainer(
      particle,
      ParticleRenderLayer.high,
      pixelSize, pixelSize,
      spawnPositionX, spawnPositionY,
      velocityX, velocityY,
      0, 0,
      friction,
      2 * Math.PI * Math.random(),
      0,
      0,
      0,
      r, g, b
   );
   Board.highMonocolourParticles.push(particle);
}

export function createDeepFrostHeartBloodParticles(originX: number, originY: number, extraVelocityX: number, extraVelocityY: number): void {
   if (Board.tickIntervalHasPassed(0.4)) {
      for (let i = 0; i < 6; i++) {
         const spawnPositionOffsetMagnitude = 13;
         const spawnPositionOffsetDirection = 2 * Math.PI * Math.random();
         const spawnPositionX = originX + spawnPositionOffsetMagnitude * Math.sin(spawnPositionOffsetDirection);
         const spawnPositionY = originY + spawnPositionOffsetMagnitude * Math.cos(spawnPositionOffsetDirection);
         createFrozenYetiBloodParticle(BloodParticleSize.small, spawnPositionX, spawnPositionY, 2 * Math.PI * Math.random(), randFloat(40, 60), true, extraVelocityX, extraVelocityY);
      }
   }
}

class ItemEntity extends Entity {
   constructor(position: Point, id: number, ageTicks: number, componentsData: EntityComponentsData<EntityType.itemEntity>) {
      super(position, id, EntityType.itemEntity, ageTicks);
      
      const itemComponentData = componentsData[1];
      
      this.attachRenderPart(
         new RenderPart(
            this,
            getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[itemComponentData.itemType].entityTextureSource),
            0,
            0
         )
      );

      this.addServerComponent(ServerComponentType.physics, new PhysicsComponent(this, componentsData[0]));
      this.addServerComponent(ServerComponentType.item, new ItemComponent(this, itemComponentData));
   }
}

export default ItemEntity;