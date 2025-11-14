<script lang="ts">
   import { assert, type Entity, type TamingTier } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
   import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../game/client-item-info";
   import { keyIsPressed } from "../../../game/keyboard-input";
   import { sendForceCompleteTamingTierPacket, sendCompleteTamingTierPacket } from "../../../game/networking/packet-sending";
   import { playHeadSound } from "../../../game/sound";
   import { getEntityTamingSpec } from "../../../game/taming-specs";
   import { isDev } from "../../../game/utils";
   import { entityExists, getEntityType } from "../../../game/world";
   import MenuElem from "../menus/MenuElem.svelte";
   import SkillConnector from "./SkillConnector.svelte";
   import TamingSkillNode from "./TamingSkillNode.svelte";
   import TierSeparator from "./TierSeparator.svelte";
   import NametagUnused from "../../../images/menus/taming-almanac/nametag-unused.png";
   import NametagUsed from "../../../images/menus/taming-almanac/nametag-used.png";
   import { Menu, menuSelectorState } from "../../../ui-state/menu-selector-state.svelte";
   import { SKILL_TRANSFORM_SCALE_FACTOR, TAMING_TIER_ICONS, tamingMenuState } from "../../../ui-state/taming-menu-state.svelte";

   interface Props {
      entity: Entity;
   }

   let { entity }: Props = $props();
   assert(entityExists(entity)); //@squeam
   
   const UNUSED_NAMETAG_IMG = NametagUnused;
   const USED_NAMETAG_IMG = NametagUsed;

   const clientEntityInfo = $derived(CLIENT_ENTITY_INFO_RECORD[getEntityType(entity)]);

   const tamingSpec = $derived(getEntityTamingSpec(entity));
   const nextTamingTierFoodCost: number | undefined = $derived(tamingSpec.tierFoodRequirements[(tamingMenuState.tamingTier + 1) as TamingTier]);

   const foodProgress = $derived(typeof nextTamingTierFoodCost !== "undefined" ? Math.min(tamingMenuState.foodEatenInTier / nextTamingTierFoodCost, 1) : 1);

   const onCompleteButtonClick = (): void => {
      if (keyIsPressed("shift") && isDev()) {
         sendForceCompleteTamingTierPacket(entity);
         // @Copynpaste
         playHeadSound("taming-tier-complete.mp3", 1, 1);
      } else if (typeof nextTamingTierFoodCost !== "undefined" && tamingMenuState.foodEatenInTier >= nextTamingTierFoodCost) {
         sendCompleteTamingTierPacket(entity);
         // @Copynpaste
         playHeadSound("taming-tier-complete.mp3", 1, 1);
      }
   }

   const openRenamePrompt = (): void => {
      menuSelectorState.openMenu(Menu.tamingRenamePrompt);
   }

   const getProgressBarClassName = (): string => {
      switch (tamingMenuState.tamingTier) {
         case 0: {
            return "green";
         }
         case 1: {
            return "blue";
         }
         default: {
            return "purple";
         }
      }
   }

   const getSkillMapSize = (): [number, number] => {
      let minX = 0;
      let maxX = 0;
      let maxY = 0;
      for (const skillNode of tamingSpec.skillNodes) {
         if (skillNode.x < minX) {
            minX = skillNode.x;
         } else if (skillNode.x > maxX) {
            maxX = skillNode.x;
         }
         if (skillNode.y > maxY) {
            maxY = skillNode.y;
         }
      }
      let skillMapWidth = maxX - minX + 18;
      let skillMapHeight = maxY + 8;
      skillMapWidth += 18;
      skillMapHeight += 8;
      return [skillMapWidth, skillMapHeight];
   }

   const [skillMapWidth, skillMapHeight] = getSkillMapSize();
</script>

<MenuElem id="taming-menu">
   <h1>
      {clientEntityInfo.name}
      {#if tamingMenuState.name !== ""}
         {tamingMenuState.name}
      {/if}
      {#if tamingMenuState.tamingTier > 0}
         <!-- svelte-ignore a11y_click_events_have_key_events -->
         <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
         <img onclick={openRenamePrompt} class="rename-icon" src={tamingMenuState.name !== "" ? USED_NAMETAG_IMG : UNUSED_NAMETAG_IMG} alt="" />
      {/if}
   </h1>

   <p class="taming-tier">
      <span>Taming Tier:</span>
      <img src={TAMING_TIER_ICONS[tamingMenuState.tamingTier]} alt="" />
   </p>

   <div class="progress-area">
      <div class="row">
         <div class="berry-progress-bar">
            <div class="berry-progress-bar-bg"></div>
            <div class={"berry-progress-bar-fill " + getProgressBarClassName()} style:--width-percentage="{foodProgress * 100}%"></div>
            <div class="progress-counter">
               {#if typeof nextTamingTierFoodCost !== "undefined"}
                  <span>{tamingMenuState.foodEatenInTier}/{nextTamingTierFoodCost} {CLIENT_ITEM_INFO_RECORD[tamingSpec.foodItemType].namePlural}</span>
                  <img src={getItemTypeImage(tamingSpec.foodItemType)} alt="" />
               {:else}
                  <div class="height-padder">
                     <span>Max!</span>
                  </div>
               {/if}
            </div>
         </div>
         {#if typeof nextTamingTierFoodCost !== "undefined"}
            <button class:clickable={tamingMenuState.foodEatenInTier >= nextTamingTierFoodCost} onmousedown={onCompleteButtonClick}>Complete</button>
         {/if}
      </div>
   </div>

   <div class="skill-map-container" style:min-width="{skillMapWidth * SKILL_TRANSFORM_SCALE_FACTOR}rem" style:height="{skillMapHeight * SKILL_TRANSFORM_SCALE_FACTOR}rem">
      {#each tamingSpec.skillNodes as skillNode}
         {@const hasSkill = tamingMenuState.acquiredSkills.includes(skillNode.skill.id)}

         <TamingSkillNode {skillNode} {hasSkill} {entity} />
         {#if skillNode.parent !== null && tamingMenuState.tamingTier >= skillNode.requiredTamingTier}
            <SkillConnector {tamingSpec} toSkillNode={skillNode} {hasSkill} />
         {/if}
      {/each}

      {#if tamingMenuState.tamingTier < 1}
         <TierSeparator tamingTier={1} />
      {/if}
      {#if tamingMenuState.tamingTier < 2 && tamingSpec.maxTamingTier >= 2}
         <TierSeparator tamingTier={2} />
      {/if}
      {#if tamingMenuState.tamingTier < 3 && tamingSpec.maxTamingTier >= 3}
         <TierSeparator tamingTier={3} />
      {/if}
   </div>
</MenuElem>