import { EntityType } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Inventory, InventoryName } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../../components/TransformComponent";
import { HealthComponent } from "../../../components/HealthComponent";
import { StatusEffectComponent } from "../../../components/StatusEffectComponent";
import { StructureComponent } from "../../../components/StructureComponent";
import Tribe from "../../../Tribe";
import { TribeComponent } from "../../../components/TribeComponent";
import { addInventoryToInventoryComponent, InventoryComponent } from "../../../components/InventoryComponent";
import { CookingComponent } from "../../../components/CookingComponent";
import { CampfireComponent } from "../../../components/CampfireComponent";
import { VirtualStructure } from "../../../tribesman-ai/building-plans/TribeBuildingLayer";
import { Point } from "../../../../../shared/src/utils";
import { HitboxCollisionType, HitboxFlag } from "../../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../../shared/src/collision";
import { Hitbox } from "../../../hitboxes";
import { StructureConnection } from "../../../structure-placement";

// @Incomplete: Destroy campfire when remaining heat reaches 0

export function createCampfireConfig(position: Point, rotation: number, tribe: Tribe, connections: Array<StructureConnection>, virtualStructure: VirtualStructure | null): EntityConfig {
   const transformComponent = new TransformComponent();

   const box = new CircularBox(position, new Point(0, 0), rotation, 52);
   const hitbox = new Hitbox(transformComponent, null, true, box, 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(25);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding);

   const structureComponent = new StructureComponent(connections, virtualStructure);

   const tribeComponent = new TribeComponent(tribe);

   const inventoryComponent = new InventoryComponent();

   // @Copynpaste @Cleanup: don't add here, add in cooking component
   
   const fuelInventory = new Inventory(1, 1, InventoryName.fuelInventory);
   addInventoryToInventoryComponent(inventoryComponent, fuelInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
   const ingredientInventory = new Inventory(1, 1, InventoryName.ingredientInventory);
   addInventoryToInventoryComponent(inventoryComponent, ingredientInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });

   const outputInventory = new Inventory(1, 1, InventoryName.outputInventory);
   addInventoryToInventoryComponent(inventoryComponent, outputInventory, { acceptsPickedUpItems: false, isDroppedOnDeath: true, isSentToEnemyPlayers: false });
   
   const cookingComponent = new CookingComponent(30);

   const campfireComponent = new CampfireComponent();
   
   return {
      entityType: EntityType.campfire,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.structure]: structureComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.cooking]: cookingComponent,
         [ServerComponentType.campfire]: campfireComponent
      },
      lights: []
   };
}