import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { Entity, EntityType } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { Point, randAngle } from "battletribes-shared/utils";
import { ItemComponent } from "../components/ItemComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig, LightCreationInfo } from "../components";
import { Item, ItemType } from "battletribes-shared/items/items";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { addHitboxToTransformComponent, getRandomPositionInBox, getRandomWeightedHitbox, TransformComponent, TransformComponentArray } from "../components/TransformComponent";
import Layer from "../Layer";
import { getSubtileIndex } from "../../../shared/src/subtiles";
import { createEntity, getEntityLayer } from "../world";
import { Hitbox } from "../hitboxes";
import { createLight } from "../lights";
import { createItem } from "../items";

export function createItemEntityConfig(position: Point, rotation: number, item: Item, throwingEntity: Entity | null): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const itemComponent = new ItemComponent(item, throwingEntity);

   const lights = new Array<LightCreationInfo>();
   // @Hack: hardcoded!!
   if (item.type === ItemType.slurb) {
      const light = createLight(new Point(0, 0), 0.6, 0.5, 4, 1, 0.1, 1);
      const lightCreationInfo: LightCreationInfo = {
         light: light,
         attachedHitbox: hitbox
      };
      lights.push(lightCreationInfo);
   }
   
   return {
      entityType: EntityType.itemEntity,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.item]: itemComponent
      },
      lights: lights
   };
}

const generateItemEntitySpawnPosition = (entityLayer: Layer, transformComponent: TransformComponent, hitboxIdx?: number): Point | null => {
   for (let attempts = 0; attempts < 50; attempts++) {
      // @Speed: if hitboxIdx is defined, then this does the same thing every loop. also this condition is checked every time
      let hitbox: Hitbox;
      if (typeof hitboxIdx !== "undefined") {
         hitbox = transformComponent.hitboxes[hitboxIdx];
      } else {
         hitbox = getRandomWeightedHitbox(transformComponent);
      }
      
      const position = getRandomPositionInBox(hitbox.box);

      const subtileIndex = getSubtileIndex(Math.floor(position.x / Settings.SUBTILE_SIZE), Math.floor(position.y / Settings.SUBTILE_SIZE));
      // Don't spawn item entities in walls otherwise they can get stuck in the wall
      if (!entityLayer.subtileIsWall(subtileIndex)) {
         return position;
      }
   }

   return null;
}

export function createItemsOverEntity(entity: Entity, itemType: ItemType, amount: number, hitboxIdx?: number): void {
   const layer = getEntityLayer(entity);
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (let i = 0; i < amount; i++) {
      const spawnPosition = generateItemEntitySpawnPosition(layer, transformComponent, hitboxIdx);
      if (spawnPosition === null) {
         continue;
      }
      
      // Create item entity
      const config = createItemEntityConfig(spawnPosition, randAngle(), createItem(itemType, 1, "", ""), null);
      createEntity(config, getEntityLayer(entity), 0);
   }
}