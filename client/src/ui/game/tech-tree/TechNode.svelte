<script lang="ts">
   import { Point, randFloat, randAngle, ItemTally2, tallyInventoryItems, InventoryName, type Tech, TechID } from "webgl-test-shared";
   import TechTooltip from "./TechTooltip.svelte";
   import { sendForceUnlockTechPacket, sendSelectTechPacket, sendUnlockTechPacket } from "../../../game/networking/packet-sending";
   import { playHeadSound } from "../../../game/sound";
   import { playerTribe } from "../../../game/tribes";
   import { techTreeIcons, techTreeState } from "../../../ui-state/tech-tree-state.svelte";
   import { InventoryComponentArray, getInventory } from "../../../game/entity-components/server-components/InventoryComponent";
   import { playerInstance } from "../../../game/player";
   import { createTechTreeItem } from "../../../game/rendering/webgl/tech-tree-item-rendering";

   interface Props {
      readonly tech: Tech;
      readonly x: number;
      readonly y: number;
      readonly zoom: number;
   }

   let isHovered = $state(false);

   let props: Props = $props();
   const tech = props.tech;
   const x = props.x;
   const y = props.y;
   const zoom = props.zoom;

   const isUnlocked = playerTribe.unlockedTechs.includes(tech);
   const isSelected = playerTribe.selectedTech === tech;

   const onmouseenter = (): void => {
      techTreeState.setHoveredTech(tech.id);
      isHovered = true;
   }

   const onmouseleave = (): void => {
      techTreeState.setHoveredTech(null);
      isHovered = false;
   }

   const selectTech = (techID: TechID): void => {
      sendSelectTechPacket(techID);
   }
      
   const researchTech = (tech: Tech): void => {
      if (!playerTribe.unlockedTechs.includes(tech)) {
         sendUnlockTechPacket(tech.id);
      }
   }

   /** Gets a tally of all the items which we predict will be researched when clicking */
   const getResearchedItems = (techInfo: Tech): ItemTally2 => {
      if (playerInstance === null) {
         return new ItemTally2();
      }
      
      const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
      
      const hotbar = getInventory(inventoryComponent, InventoryName.hotbar)!;
      
      const availableItemsTally = new ItemTally2();
      tallyInventoryItems(availableItemsTally, hotbar);
      
      const researchTally = new ItemTally2();
      for (const entry of techInfo.researchItemRequirements.getEntries()) {
         const researchItemType = entry.itemType;

         const availableCount = availableItemsTally.getItemCount(researchItemType);
         researchTally.addItem(researchItemType, availableCount);
         
         const itemProgress = playerTribe.techTreeUnlockProgress[techInfo.id]?.itemProgress[researchItemType] || 0;
         researchTally.restrictItemCount(researchItemType, entry.count - itemProgress);
      }

      return researchTally;
   }

   const addResearchedItems = (techInfo: Tech, researchTally: ItemTally2): void => {
      const entries = researchTally.getEntries();
      for (let i = 0; i < entries.length; i++) {
         const entry = entries[i];

         for (let i = 0; i < entry.count; i++) {
            // @Speed
            const position = new Point(techInfo.positionX, techInfo.positionY).offset(randFloat(0, 3.5), randAngle());
            createTechTreeItem(entry.itemType, position);
         }
      }
   }

   const onclick = (e: MouseEvent): void => {
      if (e.shiftKey) {
         sendForceUnlockTechPacket(tech.id);
      } else if (!isUnlocked) {
         researchTech(tech);

         const itemTally = getResearchedItems(tech);
         addResearchedItems(tech, itemTally);
         
         // @Incomplete: This sounds like an error sound when it's not...
         // @Incomplete @Bug: will decrease in loudness as the sound plays: - attach to camera so it doesn't decrease in loudness. or make 'global sounds'
         playHeadSound("item-research.mp3", 0.4, 1);
      }
   }

   const oncontextmenu = (e: MouseEvent): void => {
      if (isUnlocked) {
         return;
      }
      
      if (tech.researchStudyRequirements > 0) {
         selectTech(tech.id);
      }
      e.preventDefault();
   }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div style:left="calc(50% + ({tech.positionX}rem + {x}px) * {zoom})" style:top="calc(50% + ({-tech.positionY}rem + {y}px) * {zoom})" {onclick} {oncontextmenu} class="tech" class:unlocked={isUnlocked} class:selected={isSelected} {onmouseenter} {onmouseleave}>
   <div class="icon-wrapper">
      <img src={techTreeIcons["/src/images/tech-tree/" + tech.iconSrc] as string} alt="" class="icon" draggable={false} />
   </div>
</div>

{#if isHovered}
   <TechTooltip {tech} {x} {y} {zoom} />
{/if}