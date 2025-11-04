import { Settings } from "battletribes-shared/settings";
import { Point, customTickIntervalHasPassed, lerp, randAngle, randFloat, randInt, randItem, rotateXAroundOrigin, rotateYAroundOrigin, secondsToTicks } from "battletribes-shared/utils";
import { Entity, LimbAction } from "battletribes-shared/entities";
import { InventoryUseComponentArray, LimbInfo } from "./entity-components/server-components/InventoryUseComponent";
import { getTextureArrayIndex } from "./texture-atlases/texture-atlases";
import CLIENT_ITEM_INFO_RECORD from "./client-item-info";
import { ParticleColour } from "./rendering/webgl/particle-rendering";
import { createColouredParticle, createSawdustCloud } from "./particles";
import Board from "./Board";
import { getItemRecipe } from "battletribes-shared/items/crafting-recipes";
import { ItemType, ITEM_INFO_RECORD, ConsumableItemInfo } from "battletribes-shared/items/items";
import TexturedRenderPart from "./render-parts/TexturedRenderPart";
import { VisualRenderPart } from "./render-parts/render-parts";
import { TribesmanAIComponentArray } from "./entity-components/server-components/TribesmanAIComponent";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { getEntityAgeTicks, getEntityRenderInfo } from "./world";
import { Hitbox } from "./hitboxes";
import { currentSnapshot } from "./client";

enum CustomItemState {
   usingMedicine,
   crafting
}

const MIN_LIMB_DIRECTION = 0.2;
const MAX_LIMB_DIRECTION = 0.9;

const MIN_LIMB_MOVE_INTERVAL = secondsToTicks(0.2);
const MAX_LIMB_MOVE_INTERVAL = secondsToTicks(0.4);

const BANDAGE_LIFETIME_TICKS = secondsToTicks(1.25);

// @Incomplete: Investigate using slices of the actual item images instead of hardcoded pixel colours
const INGREDIENT_PARTICLE_COLOURS: Partial<Record<ItemType, ReadonlyArray<ParticleColour>>> = {
   [ItemType.wood]: [[114/255, 49/255, 0], [135/255, 74/255, 0], [153/255, 92/255, 6/255]]
};

const MEDICINE_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [[217/255, 26/255, 20/255], [63/255, 204/255, 91/255]];

export function generateRandomLimbPosition(): Point {
   const offsetDirection = randAngle();
   const offsetMagnitude = 8 * Math.random();

   const x = offsetMagnitude * Math.sin(offsetDirection);
   const y = 4 + offsetMagnitude * Math.cos(offsetDirection);
   return new Point(x, y);
}

export function createCraftingAnimationParticles(entity: Entity, limbIdx: number): void {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity)!;
   
   const recipe = getItemRecipe(tribesmanComponent.craftingItemType);
   if (recipe === null) {
      // @Temporary
      // console.warn("No recipe");
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(entity)!;
   // @Hack
   const hitbox = transformComponent.hitboxes[0];

   for (const itemTypeString of Object.keys(recipe.ingredients)) {
      const ingredientType = Number(itemTypeString) as ItemType;

      if (ingredientType === ItemType.wood && Math.random() < 1 * Settings.DT_S) {
         const pos = generateRandomLimbPosition();

         const x = hitbox.box.position.x + rotateXAroundOrigin(pos.x, pos.y, hitbox.box.angle);
         const y = hitbox.box.position.y + rotateYAroundOrigin(pos.x, pos.y, hitbox.box.angle);

         createSawdustCloud(x, y);
      }
      
      if (Math.random() >= 2.5 * Settings.DT_S) {
         continue;
      }
      
      const particleColours = INGREDIENT_PARTICLE_COLOURS[ingredientType];
      if (typeof particleColours !== "undefined") {
         const colour = randItem(particleColours);
         const pos = generateRandomLimbPosition();

         const x = hitbox.box.position.x + rotateXAroundOrigin(pos.x, pos.y, hitbox.box.angle);
         const y = hitbox.box.position.y + rotateYAroundOrigin(pos.x, pos.y, hitbox.box.angle);

         createColouredParticle(x, y, randFloat(30, 50), colour[0], colour[1], colour[2]);
      }
   }
}

const createBandageRenderPart = (entity: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(entity)!;
   const hitbox = transformComponent.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      6,
      randAngle(),
      getTextureArrayIndex("entities/miscellaneous/bandage.png")
   );

   const offsetMagnitude = 32 * Math.random();
   const offsetDirection = randAngle();
   renderPart.offset.x = offsetMagnitude * Math.sin(offsetDirection);
   renderPart.offset.y = offsetMagnitude * Math.cos(offsetDirection);

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderPart(renderPart);

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity)!;
   inventoryUseComponent.bandageRenderParts.push(renderPart);
}

export function updateBandageRenderPart(entity: Entity, renderPart: VisualRenderPart): void {
   const renderPartAge = renderPart.getAge();
   
   if (renderPartAge >= BANDAGE_LIFETIME_TICKS) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(renderPart);

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity)!;
      const idx = inventoryUseComponent.bandageRenderParts.indexOf(renderPart);
      if (idx !== -1) {
         inventoryUseComponent.bandageRenderParts.splice(idx, 1);
      }
      return;
   }

   const progress = renderPartAge / BANDAGE_LIFETIME_TICKS;
   renderPart.opacity = 1 - progress * progress;
}

export function createMedicineAnimationParticles(entity: Entity, limbIdx: number): void {
   if (Math.random() < 5 * Settings.DT_S) {
      const transformComponent = TransformComponentArray.getComponent(entity)!;
      const hitbox = transformComponent.hitboxes[0];

      const colour = randItem(MEDICINE_PARTICLE_COLOURS);
      const pos = generateRandomLimbPosition();
      
      const x = hitbox.box.position.x + rotateXAroundOrigin(pos.x, pos.y, hitbox.box.angle);
      const y = hitbox.box.position.y + rotateYAroundOrigin(pos.x, pos.y, hitbox.box.angle);
      
      createColouredParticle(x, y, randFloat(20, 35), colour[0], colour[1], colour[2]);
   }

   // @Hack: limbIdx
   // Bandages
   if (limbIdx === 0 && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.4)) {
      createBandageRenderPart(entity);
   }
}

const getCustomItemRenderPartTextureSource = (entity: Entity, state: CustomItemState): string => {
   switch (state) {
      case CustomItemState.usingMedicine: {
         return CLIENT_ITEM_INFO_RECORD[ItemType.herbal_medicine].entityTextureSource;
      }
      case CustomItemState.crafting: {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity)!;
         return CLIENT_ITEM_INFO_RECORD[tribesmanComponent.craftingItemType].entityTextureSource;
      }
   }
}

const getCustomItemRenderPartOpacity = (entity: Entity, state: CustomItemState): number => {
   switch (state) {
      case CustomItemState.usingMedicine: {
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity)!;

         // @Hack
         let lastEatTicks: number | undefined;
         for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
            const limbInfo = inventoryUseComponent.limbInfos[i];
            
            if (limbInfo.action === LimbAction.useMedicine) {
               lastEatTicks = limbInfo.lastEatTicks;
            }
         }
         if (typeof lastEatTicks === "undefined") {
            throw new Error();
         }
         
         const useInfo = ITEM_INFO_RECORD[ItemType.herbal_medicine] as ConsumableItemInfo;

         const ticksSpentUsingMedicine = currentSnapshot.tick - lastEatTicks;
         const useProgress = ticksSpentUsingMedicine / secondsToTicks(useInfo.consumeTime);
         return 1 - useProgress;
      }
      case CustomItemState.crafting: {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity)!;
         return tribesmanComponent.craftingProgress * 0.8;
      }
   }
}

const getCustomItemRenderPartState = (entity: Entity): CustomItemState | null => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity)!;
   
   for (let i = 0; i < inventoryUseComponent.limbInfos.length; i++) {
      const limbInfo = inventoryUseComponent.limbInfos[i];
      
      if (limbInfo.action === LimbAction.craft) {
         return CustomItemState.crafting;
      } else if (limbInfo.action === LimbAction.useMedicine) {
         return CustomItemState.usingMedicine;
      }
   }

   return null;
}

export function updateCustomItemRenderPart(entity: Entity): void {
   const customItemState = getCustomItemRenderPartState(entity);
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity)!;
   if (customItemState !== null) {
      if (inventoryUseComponent.customItemRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(entity)!;
         const hitbox = transformComponent.hitboxes[0];
         
         inventoryUseComponent.customItemRenderPart = new TexturedRenderPart(
            hitbox,
            getTextureArrayIndex(getCustomItemRenderPartTextureSource(entity, customItemState)),
            9,
            0
         );
         inventoryUseComponent.customItemRenderPart.offset.y = 38;

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(inventoryUseComponent.customItemRenderPart);
      } else {
         inventoryUseComponent.customItemRenderPart.switchTextureSource(getCustomItemRenderPartTextureSource(entity, customItemState));
      }
      
      inventoryUseComponent.customItemRenderPart.opacity = getCustomItemRenderPartOpacity(entity, customItemState);
   } else {
      if (inventoryUseComponent.customItemRenderPart !== null) {
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.removeRenderPart(inventoryUseComponent.customItemRenderPart);
         inventoryUseComponent.customItemRenderPart = null;
      }
   }
}

export function animateLimb(limb: VisualRenderPart, limbInfo: LimbInfo): void {
   if (limbInfo.animationTicksElapsed === limbInfo.animationDurationTicks) {
      // New animation

      limbInfo.animationStartOffset.x = limbInfo.animationEndOffset.x;
      limbInfo.animationStartOffset.y = limbInfo.animationEndOffset.y;

      const newOffset = generateRandomLimbPosition();
      limbInfo.animationEndOffset.x = newOffset.x;
      limbInfo.animationEndOffset.y = newOffset.y;

      limbInfo.animationDurationTicks = randInt(MIN_LIMB_MOVE_INTERVAL, MAX_LIMB_MOVE_INTERVAL);
      limbInfo.animationTicksElapsed = 0;
   }

   limbInfo.animationTicksElapsed++;

   // Move offset
   const moveProgress = limbInfo.animationTicksElapsed / limbInfo.animationDurationTicks;
   limb.offset.x = lerp(limbInfo.animationStartOffset.x, limbInfo.animationEndOffset.x, moveProgress);
   limb.offset.y = lerp(limbInfo.animationStartOffset.y, limbInfo.animationEndOffset.y, moveProgress);
}