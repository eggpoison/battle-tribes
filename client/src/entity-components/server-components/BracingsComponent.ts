import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

export class BracingsComponent {}

export const BracingsComponentArray = new ServerComponentArray<BracingsComponent>(ServerComponentType.bracings, true, {
   onLoad: onLoad,
   padData: padData,
   updateFromData: updateFromData
});

function onLoad(_bracingsComponent: BracingsComponent, entity: EntityID): void {
   const renderInfo = getEntityRenderInfo(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (const hitbox of transformComponent.hitboxes) {
      const renderPart = new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/bracings/vertical-post.png")
      );

      renderInfo.attachRenderThing(renderPart);
   }
}

function padData(): void {}

function updateFromData(): void {}