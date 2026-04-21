import { randAngle, randFloat, Entity, ServerComponentType } from "webgl-test-shared";
import { createDirtParticle } from "../../particles";
import { ParticleRenderLayer } from "../../rendering/webgl/particle-rendering";
import { TransformComponentArray } from "./TransformComponent";
import { registerServerComponentArray } from "../component-register";
import ServerComponentArray from "../ServerComponentArray";

export interface PlantedComponentData {}

export interface PlantedComponent {}

class _PlantedComponentArray extends ServerComponentArray<PlantedComponent, PlantedComponentData> {
   public decodeData(): PlantedComponentData {
      return {};
   }

   public createComponent(): PlantedComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public onSpawn(entity: Entity): void {
      // Create dirt particles
      
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      for (let i = 0; i < 7; i++) {
         const offsetDirection = randAngle();
         const offsetMagnitude = randFloat(0, 10);
         const x = hitbox.box.position.x + offsetMagnitude * Math.sin(offsetDirection);
         const y = hitbox.box.position.y + offsetMagnitude * Math.cos(offsetDirection);
         createDirtParticle(x, y, ParticleRenderLayer.high);
      }
   }
}

export const PlantedComponentArray = registerServerComponentArray(ServerComponentType.planted, _PlantedComponentArray, true);