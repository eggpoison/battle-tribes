import { EntityConfig, getConfigTransformComponent } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../components/TransformComponent.js";
import { HealthComponent } from "../components/HealthComponent.js";
import { BlueprintComponent } from "../components/BlueprintComponent.js";
import Tribe from "../Tribe.js";
import { TribeComponent } from "../components/TribeComponent.js";
import { StructureComponent } from "../components/StructureComponent.js";
import { VirtualStructure } from "../tribesman-ai/building-plans/TribeBuildingLayer.js";
import { cloneHitbox, setHitboxCollisionType } from "../hitboxes.js";
import { createStructureConfig, StructureConnection } from "../structure-placement.js";
import { HitboxCollisionType } from "../../../shared/dist/boxes.js";
import { BlueprintType } from "../../../shared/dist/components.js";
import { EntityType, Entity } from "../../../shared/dist/entities.js";

// @Incomplete: Remove if the associated entity is removed

export function getBlueprintEntityType(blueprintType: BlueprintType): EntityType {
   switch (blueprintType) {
      case BlueprintType.woodenTunnel:
      case BlueprintType.stoneTunnel:
      case BlueprintType.stoneTunnelUpgrade: return EntityType.tunnel;
      case BlueprintType.woodenEmbrasure:
      case BlueprintType.stoneEmbrasure:
      case BlueprintType.stoneEmbrasureUpgrade: return EntityType.embrasure;
      case BlueprintType.woodenDoor:
      case BlueprintType.stoneDoor:
      case BlueprintType.stoneDoorUpgrade: return EntityType.door;
      case BlueprintType.ballista: return EntityType.ballista;
      case BlueprintType.slingTurret: return EntityType.slingTurret;
      case BlueprintType.stoneWall: return EntityType.wall;
      case BlueprintType.stoneFloorSpikes: return EntityType.floorSpikes;
      case BlueprintType.stoneWallSpikes: return EntityType.wallSpikes;
      case BlueprintType.warriorHutUpgrade: return EntityType.warriorHut;
      case BlueprintType.fenceGate: return EntityType.fenceGate;
      case BlueprintType.stoneBracings: return EntityType.bracings;
      case BlueprintType.scrappy: return EntityType.scrappy;
      case BlueprintType.cogwalker: return EntityType.cogwalker;
   }
}

export function createBlueprintEntityConfig(x: number, y: number, angle: number, tribe: Tribe, blueprintType: BlueprintType, associatedEntityID: Entity, virtualStructure: VirtualStructure | null, connections: StructureConnection[]): EntityConfig {
   let transformComponent: TransformComponent;

   if (associatedEntityID !== 0) {
      const structureTransformComponent = TransformComponentArray.getComponent(associatedEntityID);
      
      transformComponent = new TransformComponent();

      for (const structureHitbox of structureTransformComponent.hitboxes) {
         const hitbox = cloneHitbox(transformComponent, structureHitbox);
         hitbox.mass = 0;
         setHitboxCollisionType(hitbox, HitboxCollisionType.soft);
         // @Hack
         hitbox.collisionMask = 0;
         addHitboxToTransformComponent(transformComponent, hitbox);
      }
   } else {
      const entityType = getBlueprintEntityType(blueprintType);
      const entityConfig = createStructureConfig(tribe, entityType, x, y, angle, []);

      transformComponent = getConfigTransformComponent(entityConfig.components);

      for (const hitbox of transformComponent.hitboxes) {
         hitbox.mass = 0;
         setHitboxCollisionType(hitbox, HitboxCollisionType.soft);
      }
   }

   const healthComponent = new HealthComponent(5);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const blueprintComponent = new BlueprintComponent(blueprintType, associatedEntityID);

   const tribeComponent = new TribeComponent(tribe);
   
   return {
      entityType: EntityType.blueprintEntity,
      components: [
         transformComponent,
         healthComponent,
         structureComponent,
         blueprintComponent,
         tribeComponent
      ],
      lights: []
   };
}