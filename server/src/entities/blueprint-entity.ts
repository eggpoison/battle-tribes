import { COLLISION_BITS } from "battletribes-shared/collision";
import { BlueprintType, ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType } from "battletribes-shared/entities";
import { StructureType } from "battletribes-shared/structures";
import { EntityConfig } from "../components";
import { TransformComponent } from "../components/TransformComponent";
import { HealthComponent } from "../components/HealthComponent";
import { BlueprintComponent } from "../components/BlueprintComponent";
import Tribe from "../Tribe";
import { TribeComponent } from "../components/TribeComponent";
import { createEntityHitboxes } from "battletribes-shared/boxes/entity-hitbox-creation";
import { CollisionGroup } from "battletribes-shared/collision-groups";
   
type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.health
   | ServerComponentType.blueprint
   | ServerComponentType.tribe;

// @Incomplete: Remove if the associated entity is removed

export function getBlueprintEntityType(blueprintType: BlueprintType): StructureType {
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
   }
}

export function createBlueprintEntityConfig(tribe: Tribe, blueprintType: BlueprintType, associatedEntityID: EntityID): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.none);
   transformComponent.collisionBit = COLLISION_BITS.none;
   transformComponent.collisionMask = 0;

   const entityType = getBlueprintEntityType(blueprintType);
   const hitboxes = createEntityHitboxes(entityType);
   transformComponent.addHitboxes(hitboxes, null);
   
   const healthComponent = new HealthComponent(5);
   
   const blueprintComponent = new BlueprintComponent(blueprintType, associatedEntityID);

   const tribeComponent = new TribeComponent(tribe);
   
   return {
      entityType: EntityType.blueprintEntity,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.blueprint]: blueprintComponent,
         [ServerComponentType.tribe]: tribeComponent
      }
   };
}