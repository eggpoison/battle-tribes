<script lang="ts">
   import { InventoryName, getTechByID, getTechRequiredForItem, type Tech } from "webgl-test-shared";
   import { playerTribe } from "../../../game/tribes";
   import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../game/client-item-info";
   import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import { playerInstance } from "../../../game/player";
   import { countItemTypesInInventory } from "../../../game/inventory-manipulation";
   import ResearchStar from "../../../images/ui/research-star.png";
   import TechTreeProgressBar from "./TechTreeProgressBar.svelte";

   interface Props {
      readonly tech: Tech;
      readonly x: number;
      readonly y: number;
      readonly zoom: number;
   }
   
   let props: Props = $props();
   const tech = props.tech;
   const x = props.x;
   const y = props.y;
   const zoom = props.zoom;

   const isUnlocked = playerTribe.unlockedTechs.includes(tech);

   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
   const hotbar = getInventory(inventoryComponent, InventoryName.hotbar)!;
</script>

<div id="tech-tooltip" style:left="calc(50% + ({tech.positionX + 5}rem + {x}px) * ${zoom})" style:top="calc(50% + ({-tech.positionY}rem + {y}px) * ${zoom})">
   <div class="container">
      
      <h2 class="name">{tech.name}</h2>
      <p class="description">{tech.description}</p>

      <div class="bar"></div>

      <p class="unlocks">
         Unlocks
         {#each tech.unlockedItems as itemType, i}
            {@const techRequired = getTechRequiredForItem(itemType)}
            {#if techRequired === null || !techRequired.blacklistedTribes.includes(playerTribe.tribeType)}
               <span>
                  <img src={getItemTypeImage(itemType)} alt="" />
                  <b>{CLIENT_ITEM_INFO_RECORD[itemType].name}</b>
                  {i <= tech.unlockedItems.length - 2 ? ", " : "."}
               </span>
            {/if}
         {/each}
      })}</p>

      {#if tech.conflictingTechs.length > 0}
         <p class="conflict">Conflicts with {getTechByID(tech.conflictingTechs[0]).name}</p>
      {/if}
   </div>
   
   {#if !isUnlocked}
      <div class="container">
         <ul>
            {#each tech.researchItemRequirements.getEntries() as entry}
               {@const itemType = entry.itemType}
               {@const itemAmount = entry.count}
               {@const itemProgress = (playerTribe.techTreeUnlockProgress[tech.id]?.itemProgress.hasOwnProperty(itemType)) ? playerTribe.techTreeUnlockProgress[tech.id]!.itemProgress[itemType] : 0}
               {@const hasFinished = itemProgress !== undefined ? itemProgress >= itemAmount : false}
               {@const canContributeItems = countItemTypesInInventory(hotbar, itemType) > 0}
               
               <li class={hasFinished ? "completed" : undefined}>
                  <div>
                     <img class="item-image" src={getItemTypeImage(itemType)} alt="" />
                     <span>{CLIENT_ITEM_INFO_RECORD[itemType].name}</span>
                  </div>
                  <div>
                     <span class="item-research-count">{itemProgress}/{itemAmount}</span>
                  </div>

                  {#if !hasFinished && canContributeItems}
                     <div class="item-research-star-container">
                        <img src={ResearchStar} alt="" />
                     </div>
                  {/if}
               </li>
            {/each}
         </ul>
      </div>
      {#if tech.researchStudyRequirements > 0}
         <div class="container research-container">
            <TechTreeProgressBar techInfo={tech} />
         </div>
      {/if}
   {/if}
</div>