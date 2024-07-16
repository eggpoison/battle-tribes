import { BuildingMaterial, BuildingMaterialComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType } from "webgl-test-shared/dist/entities";
import ServerComponent from "./ServerComponent";
import Entity from "../Entity";
import TexturedRenderPart from "../render-parts/TexturedRenderPart";

export const WALL_TEXTURE_SOURCES = ["entities/wall/wooden-wall.png", "entities/wall/stone-wall.png"];
export const DOOR_TEXTURE_SOURCES = ["entities/door/wooden-door.png", "entities/door/stone-door.png"];
export const EMBRASURE_TEXTURE_SOURCES = ["entities/embrasure/wooden-embrasure.png", "entities/embrasure/stone-embrasure.png"];
export const TUNNEL_TEXTURE_SOURCES = ["entities/tunnel/wooden-tunnel.png", "entities/tunnel/stone-tunnel.png"];
export const FLOOR_SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-floor-spikes.png", "entities/spikes/stone-floor-spikes.png"];
export const WALL_SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-wall-spikes.png", "entities/spikes/stone-wall-spikes.png"];

const getMaterialTextureSources = (entity: Entity): ReadonlyArray<string> => {
   switch (entity.type) {
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

class BuildingMaterialComponent extends ServerComponent<ServerComponentType.buildingMaterial> {
   private readonly materialRenderPart: TexturedRenderPart;
   public material: BuildingMaterial;
   
   constructor(entity: Entity, data: BuildingMaterialComponentData) {
      super(entity);

      this.material = data.material;
      this.materialRenderPart = this.entity.getRenderPart("buildingMaterialComponent:material") as TexturedRenderPart;
   }

   public updateFromData(data: BuildingMaterialComponentData): void {
      if (data.material !== this.material) {
         const textureSources = getMaterialTextureSources(this.entity);

         const textureSource = textureSources[data.material];
      this.materialRenderPart.switchTextureSource(textureSource);
      }
      
      this.material = data.material;
   }
}

export default BuildingMaterialComponent;