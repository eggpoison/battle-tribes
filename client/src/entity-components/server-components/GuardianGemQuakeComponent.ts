import { ServerComponentType } from "../../../../shared/src/components";
import { EntityID } from "../../../../shared/src/entities";
import { PacketReader } from "../../../../shared/src/packets";
import { randItem } from "../../../../shared/src/utils";
import { createGemQuakeProjectile } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray } from "./TransformComponent";

const TEXTURE_SOURCES: ReadonlyArray<string> = [
   "entities/guardian-gem-quake/gem-1.png",
   "entities/guardian-gem-quake/gem-2.png",
   "entities/guardian-gem-quake/gem-3.png"
];

export class GuardianGemQuakeComponent {}

export const GuardianGemQuakeComponentArray = new ServerComponentArray<GuardianGemQuakeComponent>(ServerComponentType.guardianGemQuake, true, {
   onLoad: onLoad,
   padData: padData,
   updateFromData: updateFromData
});

function onLoad(_component: GuardianGemQuakeComponent, entity: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(entity);
   const hitbox = transformComponent.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(randItem(TEXTURE_SOURCES))
   );

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderThing(renderPart);

   for (let i = 0; i < 2; i++) {
      createGemQuakeProjectile(transformComponent);
   }
}

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   // @Incomplete?
   const guardianGemFragmentProjectileComponent = GuardianGemQuakeComponentArray.getComponent(entity);
   const life = reader.readNumber();
}