import { CircularBox, Entity, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { createSlimePoolParticle, createSlimeSpeckParticle } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import { EntityComponentData } from "../../world";
import { Hitbox } from "../../hitboxes";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface SlimewispComponentData {}

export interface SlimewispComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.slimewisp, _SlimewispComponentArray, SlimewispComponentData> {}
}

class _SlimewispComponentArray extends _ServerComponentArray<SlimewispComponent, SlimewispComponentData> {
   public decodeData(): SlimewispComponentData {
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
         getTextureArrayIndex(`entities/slimewisp/slimewisp.png`)
      );
      renderPart.opacity = 0.8;
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): SlimewispComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public updateFromData(): void {}

   public onHit(_entity: Entity, hitbox: Hitbox): void {
      const radius = (hitbox.box as CircularBox).radius;
      
      createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, radius);

      for (let i = 0; i < 2; i++) {
         createSlimeSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius * Math.random());
      }
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      const radius = (hitbox.box as CircularBox).radius;

      createSlimePoolParticle(hitbox.box.position.x, hitbox.box.position.y, radius);

      for (let i = 0; i < 3; i++) {
         createSlimeSpeckParticle(hitbox.box.position.x, hitbox.box.position.y, radius * Math.random());
      }
   }
}

export const SlimewispComponentArray = registerServerComponentArray(ServerComponentType.slimewisp, _SlimewispComponentArray, true);