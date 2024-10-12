import { Settings } from "battletribes-shared/settings";
import { Point, customTickIntervalHasPassed, lerp, randFloat, randInt, randItem, rotateXAroundOrigin, rotateYAroundOrigin } from "battletribes-shared/utils";
import { EntityID, LimbAction } from "battletribes-shared/entities";
import { InventoryUseComponentArray, LimbInfo } from "./entity-components/InventoryUseComponent";
import { getTextureArrayIndex } from "./texture-atlases/texture-atlases";
import CLIENT_ITEM_INFO_RECORD from "./client-item-info";
import { ParticleColour } from "./rendering/webgl/particle-rendering";
import { createColouredParticle, createSawdustCloud } from "./particles";
import Board from "./Board";
import { getItemRecipe } from "battletribes-shared/items/crafting-recipes";
import { ItemType, ITEM_INFO_RECORD, ConsumableItemInfo } from "battletribes-shared/items/items";
import TexturedRenderPart from "./render-parts/TexturedRenderPart";
import { RenderPart } from "./render-parts/render-parts";
import { TribesmanAIComponentArray } from "./entity-components/TribesmanAIComponent";
import { TransformComponentArray } from "./entity-components/TransformComponent";
import { getEntityRenderInfo } from "./world";

enum CustomItemState {
   usingMedicine,
   crafting
}

const MIN_LIMB_DIRECTION = 0.2;
const MAX_LIMB_DIRECTION = 0.9;

const MIN_LIMB_MOVE_INTERVAL = Math.floor(0.2 * Settings.TPS);
const MAX_LIMB_MOVE_INTERVAL = Math.floor(0.4 * Settings.TPS);

const BANDAGE_LIFETIME_TICKS = Math.floor(1.25 * Settings.TPS);

// @Incomplete: Investigate using slices of the actual item images instead of hardcoded pixel colours
const INGREDIENT_PARTICLE_COLOURS: Partial<Record<ItemType, ReadonlyArray<ParticleColour>>> = {
   [ItemType.wood]: [[114/255, 49/255, 0], [135/255, 74/255, 0], [153/255, 92/255, 6/255]]
};

const MEDICINE_PARTICLE_COLOURS: ReadonlyArray<ParticleColour> = [[217/255, 26/255, 20/255], [63/255, 204/255, 91/255]];

export function generateRandomLimbPosition(limbIdx: number): Point {
   const limbMult = limbIdx === 0 ? 1 : -1;

   let offsetDirection = randFloat(MIN_LIMB_DIRECTION, MAX_LIMB_DIRECTION);
   const offsetMagnitude = 34 + randFloat(0, 6 + 6 * (offsetDirection - MIN_LIMB_DIRECTION) / MAX_LIMB_DIRECTION);
   offsetDirection *= limbMult;

   const x = offsetMagnitude * Math.sin(offsetDirection);
   const y = offsetMagnitude * Math.cos(offsetDirection);
   return new Point(x, y);
}

export function createCraftingAnimationParticles(entity: EntityID, limbIdx: number): void {
   const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity);
   
   const recipe = getItemRecipe(tribesmanComponent.craftingItemType);
   if (recipe === null) {
      console.warn("No recipe");
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(entity);

   for (const itemTypeString of Object.keys(recipe.ingredients)) {
      const ingredientType = Number(itemTypeString) as ItemType;

      if (ingredientType === ItemType.wood && Math.random() < 1 / Settings.TPS) {
         const pos = generateRandomLimbPosition(limbIdx);

         const x = transformComponent.position.x + rotateXAroundOrigin(pos.x, pos.y, transformComponent.rotation);
         const y = transformComponent.position.y + rotateYAroundOrigin(pos.x, pos.y, transformComponent.rotation);

         createSawdustCloud(x, y);
      }
      
      if (Math.random() >= 2.5 / Settings.TPS) {
         continue;
      }
      
      const particleColours = INGREDIENT_PARTICLE_COLOURS[ingredientType];
      if (typeof particleColours !== "undefined") {
         const colour = randItem(particleColours);
         const pos = generateRandomLimbPosition(limbIdx);

         const x = transformComponent.position.x + rotateXAroundOrigin(pos.x, pos.y, transformComponent.rotation);
         const y = transformComponent.position.y + rotateYAroundOrigin(pos.x, pos.y, transformComponent.rotation);

         createColouredParticle(x, y, randFloat(30, 50), colour[0], colour[1], colour[2]);
      }
   }
}

const createBandageRenderPart = (entity: EntityID): void => {
   const renderPart = new TexturedRenderPart(
      null,
      6,
      2 * Math.PI * Math.random(),
      getTextureArrayIndex("entities/miscellaneous/bandage.png")
   );

   const offsetMagnitude = 32 * Math.random();
   const offsetDirection = 2 * Math.PI * Math.random();
   renderPart.offset.x = offsetMagnitude * Math.sin(offsetDirection);
   renderPart.offset.y = offsetMagnitude * Math.cos(offsetDirection);

   const renderInfo = getEntityRenderInfo(entity);
   renderInfo.attachRenderThing(renderPart);

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   inventoryUseComponent.bandageRenderParts.push(renderPart);
}

export function updateBandageRenderPart(entity: EntityID, renderPart: RenderPart): void {
   const renderPartAge = renderPart.getAge();
   
   if (renderPartAge >= BANDAGE_LIFETIME_TICKS) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(renderPart);

      const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
      const idx = inventoryUseComponent.bandageRenderParts.indexOf(renderPart);
      if (idx !== -1) {
         inventoryUseComponent.bandageRenderParts.splice(idx, 1);
      }
      return;
   }

   const progress = renderPartAge / BANDAGE_LIFETIME_TICKS;
   renderPart.opacity = 1 - progress * progress;
}

export function createMedicineAnimationParticles(entity: EntityID, limbIdx: number): void {
   const transformComponent = TransformComponentArray.getComponent(entity);

   if (Math.random() < 5 / Settings.TPS) {
      const colour = randItem(MEDICINE_PARTICLE_COLOURS);
      const pos = generateRandomLimbPosition(limbIdx);
      
      const x = transformComponent.position.x + rotateXAroundOrigin(pos.x, pos.y, transformComponent.rotation);
      const y = transformComponent.position.y + rotateYAroundOrigin(pos.x, pos.y, transformComponent.rotation);
      
      createColouredParticle(x, y, randFloat(20, 35), colour[0], colour[1], colour[2]);
   }

   // @Hack: limbIdx
   // Bandages
   if (limbIdx === 0 && customTickIntervalHasPassed(transformComponent.ageTicks, 0.4)) {
      createBandageRenderPart(entity);
   }
}

const getCustomItemRenderPartTextureSource = (entity: EntityID, state: CustomItemState): string => {
   switch (state) {
      case CustomItemState.usingMedicine: {
         return CLIENT_ITEM_INFO_RECORD[ItemType.herbal_medicine].entityTextureSource;
      }
      case CustomItemState.crafting: {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity);
         return CLIENT_ITEM_INFO_RECORD[tribesmanComponent.craftingItemType].entityTextureSource;
      }
   }
}

const getCustomItemRenderPartOpacity = (entity: EntityID, state: CustomItemState): number => {
   switch (state) {
      case CustomItemState.usingMedicine: {
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);

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

         const ticksSpentUsingMedicine = Board.serverTicks - lastEatTicks;
         const useProgress = ticksSpentUsingMedicine / Math.floor(useInfo.consumeTime * Settings.TPS);
         return 1 - useProgress;
      }
      case CustomItemState.crafting: {
         const tribesmanComponent = TribesmanAIComponentArray.getComponent(entity);
         return tribesmanComponent.craftingProgress * 0.8;
      }
   }
}

const getCustomItemRenderPartState = (entity: EntityID): CustomItemState | null => {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   
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

export function updateCustomItemRenderPart(entity: EntityID): void {
   const customItemState = getCustomItemRenderPartState(entity);
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(entity);
   if (customItemState !== null) {
      if (inventoryUseComponent.customItemRenderPart === null) {
         inventoryUseComponent.customItemRenderPart = new TexturedRenderPart(
            null,
            getTextureArrayIndex(getCustomItemRenderPartTextureSource(entity, customItemState)),
            9,
            0
         );
         inventoryUseComponent.customItemRenderPart.offset.y = 38;

         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderThing(inventoryUseComponent.customItemRenderPart);
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

export function animateLimb(limb: RenderPart, limbIdx: number, limbInfo: LimbInfo): void {
   if (limbInfo.animationTicksElapsed === limbInfo.animationDurationTicks) {
      // New animation

      limbInfo.animationStartOffset.x = limbInfo.animationEndOffset.x;
      limbInfo.animationStartOffset.y = limbInfo.animationEndOffset.y;

      const newOffset = generateRandomLimbPosition(limbIdx);
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