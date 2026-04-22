import { Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { Hitbox } from "../../hitboxes";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playBuildingHitSound, playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import _ClientComponentArray from "../ClientComponentArray";
import { TransformComponentArray } from "../server-components/TransformComponent";
import { getTransformComponentData } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerClientComponentArray } from "../component-registry";

export interface WorkerHutComponentData {}

export interface WorkerHutComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.workerHut, _WorkerHutComponentArray, WorkerHutComponentData> {}
}

class _WorkerHutComponentArray extends _ClientComponentArray<WorkerHutComponent> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      // Hut
      const hutRenderPart = new TexturedRenderPart(
         hitbox,
         2,
         0,
         0, 0,
         getTextureArrayIndex("entities/worker-hut/worker-hut.png")
      );
      renderObject.attachRenderPart(hutRenderPart);

      // Door
      const doorRenderPart = new TexturedRenderPart(
         hutRenderPart,
         1,
         0,
         0, 0,
         getTextureArrayIndex("entities/worker-hut/worker-hut-door.png")
      );
      addRenderPartTag(doorRenderPart, "hutComponent:door");
      renderObject.attachRenderPart(doorRenderPart);
   }

   public createComponent(): WorkerHutComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 2;
   }

   public onHit(entity: Entity, hitbox: Hitbox): void {
      playBuildingHitSound(entity, hitbox);
   }

   public onDie(entity: Entity): void {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("building-destroy-1.mp3", 0.4, 1, entity, hitbox, false);
   }
}

export const WorkerHutComponentArray = registerClientComponentArray(ClientComponentType.workerHut, _WorkerHutComponentArray, true);

export function createWorkerHutComponentData(): WorkerHutComponentData {
   return {};
}