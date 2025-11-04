import { BuildingMaterial, ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { PacketReader } from "battletribes-shared/packets";
import { EntityComponentData, getEntityRenderInfo, getEntityType } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface BuildingMaterialComponentData {
   readonly material: BuildingMaterial;
}

export interface BuildingMaterialComponent {
   material: BuildingMaterial;
}

export const WALL_TEXTURE_SOURCES = ["entities/wall/wooden-wall.png", "entities/wall/stone-wall.png"];
export const DOOR_TEXTURE_SOURCES = ["entities/door/wooden-door.png", "entities/door/stone-door.png"];
export const EMBRASURE_TEXTURE_SOURCES = ["entities/embrasure/wooden-embrasure.png", "entities/embrasure/stone-embrasure.png"];
export const TUNNEL_TEXTURE_SOURCES = ["entities/tunnel/wooden-tunnel.png", "entities/tunnel/stone-tunnel.png"];
export const FLOOR_SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-floor-spikes.png", "entities/spikes/stone-floor-spikes.png"];
export const WALL_SPIKE_TEXTURE_SOURCES = ["entities/spikes/wooden-wall-spikes.png", "entities/spikes/stone-wall-spikes.png"];

const getMaterialTextureSources = (entityType: EntityType): ReadonlyArray<string> => {
   // @Robustness
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

export const BuildingMaterialComponentArray = new ServerComponentArray<BuildingMaterialComponent, BuildingMaterialComponentData, never>(ServerComponentType.buildingMaterial, true, createComponent, getMaxRenderParts, decodeData);
BuildingMaterialComponentArray.updateFromData = updateFromData;

export function createBuildingMaterialComponentData(material: BuildingMaterial): BuildingMaterialComponentData {
   return {
      material: material
   };
}

function decodeData(reader: PacketReader): BuildingMaterialComponentData {
   const material = reader.readNumber();
   return {
      material: material
   };
}

function createComponent(entityComponentData: EntityComponentData): BuildingMaterialComponent {
   return {
      material: entityComponentData.serverComponentData[ServerComponentType.buildingMaterial]!.material
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function updateFromData(data: BuildingMaterialComponentData, entity: Entity): void {
   const buildingMaterialComponent = BuildingMaterialComponentArray.getComponent(entity);
   
   const material = data.material;
   
   if (material !== buildingMaterialComponent.material) {
      const renderInfo = getEntityRenderInfo(entity);

      // @Hack: this fucking sucks. Instead each entity which uses the building material component should define its own function to do this
      const entityType = getEntityType(entity);
      if (entityType !== EntityType.bracings) {
         const textureSources = getMaterialTextureSources(entityType);
   
         const textureSource = textureSources[material];
   
         const materialRenderPart = renderInfo.getRenderThing("buildingMaterialComponent:material") as TexturedRenderPart;
         materialRenderPart.switchTextureSource(textureSource);
      } else {
         const verticals = renderInfo.getRenderThings("bracingsComponent:vertical", 2) as Array<TexturedRenderPart>;
         for (const renderPart of verticals) {
            renderPart.switchTextureSource("entities/bracings/stone-vertical-post.png");
         }

         const horizontal = renderInfo.getRenderThing("bracingsComponent:horizontal") as TexturedRenderPart;
         horizontal.switchTextureSource("entities/bracings/stone-horizontal-post.png");
      }
   }
   
   buildingMaterialComponent.material = material;
}