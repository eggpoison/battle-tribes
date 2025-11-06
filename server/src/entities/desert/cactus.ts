import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { CactusFlowerSize, EntityType } from "battletribes-shared/entities";
import { randInt, randFloat, Point, polarVec2, randAngle } from "battletribes-shared/utils";
import { HealthComponent } from "../../components/HealthComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { ChildConfigAttachInfo, EntityConfig } from "../../components";
import { StatusEffect } from "battletribes-shared/status-effects";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { CactusComponent, CactusFlower } from "../../components/CactusComponent";
import { ItemType } from "../../../../shared/src/items/items";
import { LootComponent, registerEntityLootOnDeath } from "../../components/LootComponent";
import { Hitbox } from "../../hitboxes";
import { createPricklyPearConfig } from "./prickly-pear";

const RADIUS = 40;
/** Amount the hitbox is brought in. */
const HITBOX_PADDING = 3;

registerEntityLootOnDeath(EntityType.cactus, {
   itemType: ItemType.cactus_spine,
   getAmount: () => randInt(2, 5)
});

export function createCactusConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();

   // Root hitbox
   const rootHitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, RADIUS - HITBOX_PADDING), 1, HitboxCollisionType.soft, CollisionBit.cactus, DEFAULT_COLLISION_MASK, []);
   rootHitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, rootHitbox);

   const flowers = new Array<CactusFlower>();

   // Root hitbox flowers
   let numFlowers = 1;
   while (Math.random() < 0.35 && numFlowers < 5) {
      numFlowers++;
   }
   for (let i = 0; i < numFlowers; i++) {
      const flowerOffsetMagnitude = randFloat(10, 30);
      const flowerOffsetDirection = 2 * Math.PI / 8 * randInt(0, 7);

      flowers.push({
         parentHitboxLocalID: rootHitbox.localID,
         offsetX: flowerOffsetMagnitude * Math.sin(flowerOffsetDirection),
         offsetY: flowerOffsetMagnitude * Math.cos(flowerOffsetDirection),
         angle: randAngle(),
         flowerType: randInt(0, 4),
         size: randInt(0, 1),
      });
   }

   // Low chance for 0 limbs
   // High chance for 1 limb
   // Less chance for 2 limbs
   // Less chance for 3 limbs
   let numLimbs = 0;
   while (Math.random() < 4/5 - numLimbs/5 && numLimbs < 3) {
      numLimbs++;
   }
   
   // Limbs
   for (let i = 0; i < numLimbs; i++) {
      const box = new CircularBox(new Point(0, 0), polarVec2(37, randAngle()), 0, 18);
      const hitbox = new Hitbox(transformComponent, rootHitbox, true, box, 0.4, HitboxCollisionType.soft, CollisionBit.cactus, DEFAULT_COLLISION_MASK, []);
      addHitboxToTransformComponent(transformComponent, hitbox);

      if (Math.random() < 0.45) {
         const flowerOffsetMagnitude = randFloat(6, 10);
         const flowerOffsetDirection = randAngle();

         flowers.push({
            parentHitboxLocalID: hitbox.localID,
            offsetX: flowerOffsetMagnitude * Math.sin(flowerOffsetDirection),
            offsetY: flowerOffsetMagnitude * Math.cos(flowerOffsetDirection),
            angle: randAngle(),
            flowerType: randInt(0, 3),
            size: CactusFlowerSize.small
         });
      }
   }

   const healthComponent = new HealthComponent(15);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const lootComponent = new LootComponent();

   const childConfigs = new Array<ChildConfigAttachInfo>();
   if (Math.random() < 0.4) {
      const offset = polarVec2((rootHitbox.box as CircularBox).radius, randAngle());

      const x = rootHitbox.box.position.x + offset.x;
      const y = rootHitbox.box.position.y + offset.y;
      const position = new Point(x, y);
      
      const config = createPricklyPearConfig(position, offset, randAngle());
      childConfigs.push({
         entityConfig: config,
         attachedHitbox: config.components[ServerComponentType.transform]!.hitboxes[0],
         parentHitbox: rootHitbox,
         isPartOfParent: true
      });
   }
   
   const cactusComponent = new CactusComponent(flowers, childConfigs.length > 0);

   return {
      entityType: EntityType.cactus,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.loot]: lootComponent,
         [ServerComponentType.cactus]: cactusComponent
      },
      lights: [],
      childConfigs: childConfigs
   };
}