import { BlueprintType, ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType } from "battletribes-shared/entities";
import { EntityConfig } from "../components";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import { HealthComponent } from "../components/HealthComponent";
import { BlueprintComponent } from "../components/BlueprintComponent";
import Tribe from "../Tribe";
import { TribeComponent } from "../components/TribeComponent";
import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import { StructureComponent } from "../components/StructureComponent";
import { VirtualStructure } from "../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../shared/src/utils";
import { cloneHitbox } from "../hitboxes";
import { createStructureConfig, StructureConnection } from "../structure-placement";

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

export function createBlueprintEntityConfig(position: Point, rotation: number, tribe: Tribe, blueprintType: BlueprintType, associatedEntityID: Entity, virtualStructure: VirtualStructure | null, connections: Array<StructureConnection>): EntityConfig {
   let transformComponent: TransformComponent;

   if (associatedEntityID !== 0) {
      const structureTransformComponent = TransformComponentArray.getComponent(associatedEntityID);
      
      transformComponent = new TransformComponent();

      for (const structureHitbox of structureTransformComponent.hitboxes) {
         const hitbox = cloneHitbox(transformComponent, structureHitbox);
         hitbox.mass = 0;
         hitbox.collisionType = HitboxCollisionType.soft;
         // @Hack
         hitbox.collisionMask = 0;
         addHitboxToTransformComponent(transformComponent, hitbox);
      }
   } else {
      const entityType = getBlueprintEntityType(blueprintType);
      const entityConfig = createStructureConfig(tribe, entityType, position, rotation, []);

      transformComponent = entityConfig.components[ServerComponentType.transform]!;

      for (const hitbox of transformComponent.hitboxes) {
         hitbox.mass = 0;
         hitbox.collisionType = HitboxCollisionType.soft;
      }
   }

   const healthComponent = new HealthComponent(5);
   
   const structureComponent = new StructureComponent(connections, virtualStructure);
   
   const blueprintComponent = new BlueprintComponent(blueprintType, associatedEntityID);

   const tribeComponent = new TribeComponent(tribe);
   
   return {
      entityType: EntityType.blueprintEntity,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.blueprint]: blueprintComponent,
         [ServerComponentType.tribe]: tribeComponent
      },
      lights: []
   };
}