import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randInt } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { ZombieComponent, ZombieComponentArray } from "../../components/ZombieComponent";
import { addInventoryToInventoryComponent, InventoryComponent } from "../../components/InventoryComponent";
import { Inventory, InventoryName, ItemType } from "battletribes-shared/items/items";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import WanderAI from "../../ai/WanderAI";
import { AIHelperComponent, AIType } from "../../components/AIHelperComponent";
import { Biome } from "battletribes-shared/biomes";
import Layer from "../../Layer";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { InventoryUseComponent } from "../../components/InventoryUseComponent";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { Hitbox } from "../../hitboxes";

export const enum ZombieVars {
   CHASE_PURSUE_TIME_TICKS = 5 * Settings.TICK_RATE,
   VISION_RANGE = 375
}

registerEntityLootOnDeath(EntityType.zombie, {
   itemType: ItemType.eyeball,
   getAmount: () => Math.random() < 0.1 ? 1 : 0
});

function positionIsValidCallback(_entity: Entity, layer: Layer, x: number, y: number): boolean {
   return layer.getBiomeAtPosition(x, y) === Biome.grasslands;
}

const moveFunc = () => {
   throw new Error();
}

const turnFunc = () => {
   throw new Error();
}

export function createZombieConfig(position: Point, rotation: number, isGolden: boolean, tombstone: Entity): EntityConfig {
   const zombieType = isGolden ? 3 : randInt(0, 2);

   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 32), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(20);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const zombieComponent = new ZombieComponent(zombieType, tombstone);

   const aiHelperComponent = new AIHelperComponent(hitbox, ZombieVars.VISION_RANGE, moveFunc, turnFunc);
   aiHelperComponent.ais[AIType.wander] = new WanderAI(150, Math.PI * 3, 1, 0.4, positionIsValidCallback);
   
   const inventoryComponent = new InventoryComponent();
   const inventoryUseComponent = new InventoryUseComponent();
   
   const handSlot = new Inventory(1, 1, InventoryName.handSlot);
   addInventoryToInventoryComponent(inventoryComponent, handSlot, { acceptsPickedUpItems: true, isDroppedOnDeath: true });
   inventoryUseComponent.associatedInventoryNames.push(handSlot.name);

   // @IncompletE: chance to not have man hand instead of offhand
   // @HACK @TEMPORARY: Since currently this will put the limb at the front of the zombie, instead of at its side...
   // if (Math.random() < 0.7) {
   if (true) {
      const offhand = new Inventory(0, 0, InventoryName.offhand);
      addInventoryToInventoryComponent(inventoryComponent, offhand, { acceptsPickedUpItems: true, isDroppedOnDeath: true });
      inventoryUseComponent.associatedInventoryNames.push(offhand.name);
   }

   const lootComponent = new LootComponent();
   
   return {
      entityType: EntityType.zombie,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.zombie]: zombieComponent,
         [ServerComponentType.aiHelper]: aiHelperComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent,
         [ServerComponentType.loot]: lootComponent
      },
      lights: []
   };
}

export function onZombieVisibleEntityHurt(zombie: Entity, hurtEntity: Entity): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie);

   zombieComponent.visibleHurtEntityID = hurtEntity;
   zombieComponent.visibleHurtEntityTicks = 0;
}