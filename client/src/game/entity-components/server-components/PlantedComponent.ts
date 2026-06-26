import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { randAngle, randFloat } from "../../../../../shared/src/utils";
import { createDirtParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { TransformComponentArray } from "./TransformComponent";
import { registerServerComponentArray } from "../component-registry";
import ServerComponentArray from "../ServerComponentArray";

export interface PlantedComponentData {}

export interface PlantedComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.planted, typeof PlantedComponentArray> {}
}

export const PlantedComponentArray = registerServerComponentArray(
   ServerComponentType.planted,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
PlantedComponentArray.onSpawn = onSpawn;

function decodeData(): PlantedComponentData {
   return {};
}

function createComponent(): PlantedComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

function onSpawn(entity: Entity): void {
   // Create dirt particles
   
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   for (let i = 0; i < 7; i++) {
      const offsetDirection = randAngle();
      const offsetMagnitude = randFloat(0, 10);
      const x = hitbox.box.posX + offsetMagnitude * Math.sin(offsetDirection);
      const y = hitbox.box.posY + offsetMagnitude * Math.cos(offsetDirection);
      createDirtParticle(x, y, ParticleRenderLayer.high);
   }
}