import { Settings, Entity, randAngle, randFloat, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { TransformComponentArray } from "./TransformComponent";
import { createSlurbParticle } from "../../particles";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

const enum Var {
   MIN_PARTICLE_CREATION_INTERVAL_SECONDS = 0.45,
   MAX_PARTICLE_CREATION_INTERVAL_SECONDS = 1.55
}

export interface SlurbTorchComponentData {}

export interface SlurbTorchComponent {
   particleCreationTimer: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.slurbTorch, _SlurbTorchComponentArray, SlurbTorchComponentData> {}
}

class _SlurbTorchComponentArray extends _ServerComponentArray<SlurbTorchComponent, SlurbTorchComponentData> {
   public decodeData(): SlurbTorchComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/slurb-torch/slurb-torch.png")
      );
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): SlurbTorchComponent {
      return {
         particleCreationTimer: randFloat(Var.MIN_PARTICLE_CREATION_INTERVAL_SECONDS, Var.MAX_PARTICLE_CREATION_INTERVAL_SECONDS)
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onTick(entity: Entity): void {
      // @Copynpaste: all of these effects from InventoryUseComponent
      
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      
      // Slurb particles
      const slurbTorchComponent = SlurbTorchComponentArray.getComponent(entity);
      slurbTorchComponent.particleCreationTimer -= Settings.DT_S;
      if (slurbTorchComponent.particleCreationTimer <= 0) {
         slurbTorchComponent.particleCreationTimer += randFloat(Var.MIN_PARTICLE_CREATION_INTERVAL_SECONDS, Var.MAX_PARTICLE_CREATION_INTERVAL_SECONDS);

         let spawnPositionX = hitbox.box.position.x;
         let spawnPositionY = hitbox.box.position.y;

         const spawnOffsetMagnitude = 7 * Math.random();
         const spawnOffsetDirection = randAngle();
         spawnPositionX += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         spawnPositionY += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);

         createSlurbParticle(spawnPositionX, spawnPositionY, randAngle(), randFloat(80, 120), 0, 0);
      }
   }
}

export const SlurbTorchComponentArray = registerServerComponentArray(ServerComponentType.slurbTorch, _SlurbTorchComponentArray, true);

export function createSlurbTorchComponentData(): SlurbTorchComponentData {
   return {};
}