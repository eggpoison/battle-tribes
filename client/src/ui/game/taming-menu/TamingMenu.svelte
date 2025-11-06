<script lang="ts">
   import { type TamingTier } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
   import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../game/client-item-info";
   import { TamingComponentArray } from "../../../game/entity-components/server-components/TamingComponent";
   import { keyIsPressed } from "../../../game/keyboard-input";
   import { sendForceCompleteTamingTierPacket, sendCompleteTamingTierPacket } from "../../../game/networking/packet-sending";
   import { playHeadSound } from "../../../game/sound";
   import { getEntityTamingSpec } from "../../../game/taming-specs";
   import { isDev } from "../../../game/utils";
   import { getEntityType } from "../../../game/world";
   import MenuElem from "../menus/MenuElem.svelte";
   import SkillConnector from "./SkillConnector.svelte";
   import TamingSkillNode from "./TamingSkillNode.svelte";
   import TierSeparator from "./TierSeparator.svelte";
   import NametagUnused from "../../../images/menus/taming-almanac/nametag-unused.png";
   import NametagUsed from "../../../images/menus/taming-almanac/nametag-used.png";
   import { entityInteractionState } from "../../../ui-state/entity-interaction-state.svelte";
   import { Menu, menuSelectorState } from "../../../ui-state/menu-selector-state.svelte";
   import { SKILL_TRANSFORM_SCALE_FACTOR, TAMING_TIER_ICONS } from "../../../ui-state/taming-menu-state.svelte";

   const UNUSED_NAMETAG_IMG = NametagUnused;
   const USED_NAMETAG_IMG = NametagUsed;

   // @Hack: "!"
   const entity = entityInteractionState.selectedEntity!;

   const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[getEntityType(entity)];

   const tamingComponent = TamingComponentArray.getComponent(entity);
   const tamingSpec = getEntityTamingSpec(entity);
   const nextTamingTierFoodCost: number | undefined = tamingSpec.tierFoodRequirements[(tamingComponent.tamingTier + 1) as TamingTier];

   const foodProgress = typeof nextTamingTierFoodCost !== "undefined" ? Math.min(tamingComponent.foodEatenInTier / nextTamingTierFoodCost, 1) : 1;

   const onCompleteButtonClick = (): void => {
      if (keyIsPressed("shift") && isDev()) {
         sendForceCompleteTamingTierPacket(entity);
      } else {
         sendCompleteTamingTierPacket(entity);
      }

      playHeadSound("taming-tier-complete.mp3", 1, 1);
   }

   const openRenamePrompt = (): void => {
      menuSelectorState.setMenu(Menu.tamingRenamePrompt);
   }

   let progressBarClassName: string;
   switch (tamingComponent.tamingTier) {
      case 0: {
         progressBarClassName = "green";
         break;
      }
      case 1: {
         progressBarClassName = "blue";
         break;
      }
      case 2:
      case 3: {
         progressBarClassName = "purple";
         break;
      }
      default: throw new Error();
   }

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
   let skillMapWidth = maxX - minX;
   let skillMapHeight = maxY;
   // Pad it
   skillMapWidth += 18;
   skillMapHeight += 8;
</script>

<MenuElem id="taming-menu" className="menu">
   <h1>
      {clientEntityInfo.name}
      {#if tamingComponent.name !== ""}
         {tamingComponent.name}
      {/if}
      {#if tamingComponent.tamingTier > 0}
         <!-- svelte-ignore a11y_click_events_have_key_events -->
         <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
         <img onclick={openRenamePrompt} class="rename-icon" src={tamingComponent.name !== "" ? USED_NAMETAG_IMG : UNUSED_NAMETAG_IMG} alt="" />
      {/if}
   </h1>

   <p class="taming-tier">
      <span>Taming Tier:</span>
      <img src={TAMING_TIER_ICONS[tamingComponent.tamingTier]} alt="" />
   </p>

   <div class="progress-area">
      <div class="row">
         <div class="berry-progress-bar">
            <div class="berry-progress-bar-bg"></div>
            <div class={"berry-progress-bar-fill " + progressBarClassName} style:--width-percentage="{foodProgress * 100}%"></div>
            <div class="progress-counter">
               {#if typeof nextTamingTierFoodCost !== "undefined"}
                  <span>{tamingComponent.foodEatenInTier}/{nextTamingTierFoodCost} {CLIENT_ITEM_INFO_RECORD[tamingSpec.foodItemType].namePlural}</span>
                  <img src={getItemTypeImage(tamingSpec.foodItemType)} alt="" />
               {:else}
                  <div class="height-padder">
                     <span>Max!</span>
                  </div>
               {/if}
            </div>
         </div>
         {#if typeof nextTamingTierFoodCost !== "undefined"}
            <button class:clickable={tamingComponent.foodEatenInTier >= nextTamingTierFoodCost} onmousedown={onCompleteButtonClick}>Complete</button>
         {/if}
      </div>
   </div>

   <div class="skill-map-container" style:minWidth="{skillMapWidth * SKILL_TRANSFORM_SCALE_FACTOR}rem" style:height="{skillMapHeight * SKILL_TRANSFORM_SCALE_FACTOR}rem">
      {#each tamingSpec.skillNodes as skillNode}
         <TamingSkillNode {skillNode} />
      {/each}
      {#each tamingSpec.skillNodes as skillNode}
         {#if skillNode.parent !== null && tamingComponent.tamingTier >= skillNode.requiredTamingTier}
            <SkillConnector {tamingSpec} tamingComponent={tamingComponent} toSkillNode={skillNode} />
         {/if}
      {/each}

      {#if tamingComponent.tamingTier < 1}
         <TierSeparator tamingTier={1} />
      {/if}
      {#if tamingComponent.tamingTier < 2 && tamingSpec.maxTamingTier >= 2}
         <TierSeparator tamingTier={2} />
      {/if}
      {#if tamingComponent.tamingTier < 3 && tamingSpec.maxTamingTier >= 3}
         <TierSeparator tamingTier={3} />
      {/if}
   </div>
</MenuElem>