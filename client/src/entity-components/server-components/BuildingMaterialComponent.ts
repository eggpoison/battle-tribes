import { BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { getEntityRenderInfo, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export const WALL_TEXTURE_SOURCES = ["entities/wall/wooden-wall.png", "entities/wall/stone-wall.png"];
export const DOOR_TEXTURE_SOURCES = ["entities/door/wooden-door.png", "entities/door/stone-door.png"];
export const EMBRASURE_TEXTURE_SOURCES = ["entities/embrasure/wooden-embrasure.png", "entities/embrasure/stone-embrasure.png"];
export const TUNNEL_TEXTURE_SOURCES = ["entities/tunnel/wooden-tunnel.png", "entities/tunnel/stone-tunnel.png"];
export const FLOOR_SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-floor-spikes.png", "entities/spikes/stone-floor-spikes.png"];
export const WALL_SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-wall-spikes.png", "entities/spikes/stone-wall-spikes.png"];

const getMaterialTextureSources = (entityType: EntityType): ReadonlyArray<string> => {
   switch (entityType) {
      case EntityType.wall: return WALL_TEXTURE_SOURCES;
      case EntityType.door: return DOOR_TEXTURE_SOURCES;
      case EntityType.embrasure: return EMBRASURE_TEXTURE_SOURCES;
      case EntityType.tunnel: return TUNNEL_TEXTURE_SOURCES;
      case EntityType.floorSpikes: return FLOOR_SPIKE_TEXTURE_SOURCES;
      case EntityType.wallSpikes: return WALL_SPIKE_TEXTURE_SOURCES;
      default: {
         throw new Error();
      }
   }
}

class BuildingMaterialComponent {
   public material: BuildingMaterial = 0;
}

export default BuildingMaterialComponent;

export const BuildingMaterialComponentArray = new ServerComponentArray<BuildingMaterialComponent>(ServerComponentType.buildingMaterial, true, {
   padData: padData,
   updateFromData: updateFromData
});

function padData(reader: PacketReader): void {
   reader.padOffset(Float32Array.BYTES_PER_ELEMENT);
}

function updateFromData(reader: PacketReader, entity: EntityID): void {
   const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entity);
   
   const material = reader.readNumber();
   
   if (material !== buildingMaterialComponent.material) {
      const textureSources = getMaterialTextureSources(getEntityType(entity));

      const textureSource = textureSources[material];

      const renderInfo = getEntityRenderInfo(entity);
      const materialRenderPart = renderInfo.getRenderThing("buildingMaterialComponent:material") as TexturedRenderPart;
      materialRenderPart.switchTextureSource(textureSource);
   }
   
   buildingMaterialComponent.material = material;
}