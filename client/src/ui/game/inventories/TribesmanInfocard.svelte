<script lang="ts">
   import { type TitleGenerationInfo, TRIBESMAN_TITLE_RECORD, Settings, type Entity } from "webgl-test-shared";
   import { TribeComponentArray } from "../../../game/entity-components/server-components/TribeComponent";
   import { TribeMemberComponentArray } from "../../../game/entity-components/server-components/TribeMemberComponent";
   import { TribesmanAIComponentArray } from "../../../game/entity-components/server-components/TribesmanAIComponent";
   import { TribesmanComponentArray } from "../../../game/entity-components/server-components/TribesmanComponent";
   import { sendRecruitTribesmanPacket } from "../../../game/networking/packet-sending/packet-sending";
   import { playerTribe, getTribeByID } from "../../../game/tribes";
   import { getEntityAgeTicks } from "../../../game/world";
   import TribesmanRelationSlider from "./TribesmanRelationSlider.svelte";

   const getTitleByTier = (titles: ReadonlyArray<TitleGenerationInfo>, tier: number): TitleGenerationInfo | null => {
      for (let i = 0; i < titles.length; i++) {
         const titleGenerationInfo = titles[i];

         const titleInfo = TRIBESMAN_TITLE_RECORD[titleGenerationInfo.title];
         if (titleInfo.tier === tier) {
            return titleGenerationInfo;
         }
      }

      return null;
   }

   interface Props {
      readonly tribesman: Entity;
   }

   let props: Props = $props();
   const tribesman = props.tribesman;

   const tribeComponent = TribeComponentArray.getComponent(tribesman);
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesman);
   const tribesmanComponent = TribesmanComponentArray.getComponent(tribesman);
   const tribesmanAIComponent = TribesmanAIComponentArray.getComponent(tribesman);

   // @Cleanup: what?
   if (tribesmanComponent.titles.length === 0) {
   } else {
      for (let i = 0; i < tribesmanComponent.titles.length; i++) {
         const titleGenerationInfo = tribesmanComponent.titles[i];
      }
   }

   const titleTiers = new Array<number>();
   for (let tier = 1; tier <= 3; tier++) {
      titleTiers.push(tier);
   }

   const ageDays = getEntityAgeTicks(tribesman) / Settings.TIME_PASS_RATE * Settings.TICK_RATE / 3600;

   // @Cleanup: redundant check??
   const tribeName = tribeComponent.tribeID === playerTribe.id ? playerTribe.name : getTribeByID(tribeComponent.tribeID).name;

   const canRecruit = tribesmanAIComponent.relationsWithPlayer >= 50;

   const recruit = (): void => {
      if (canRecruit) {
         sendRecruitTribesmanPacket(tribesman);
      }
   }
</script>
   
<div id="tribesman-info" class="sub-menu">
   <h2>{tribeMemberComponent.name}</h2>

   <p>Belongs to the <span>{tribeName}</span>.</p>

   <p>Age: <span>{ageDays.toFixed(1)} days</span></p>

   <div class="area">
      <h4 style:textDecoration="underline">Titles</h4>
      <ul>
         {#each titleTiers as tier}
            {@const titleGenerationInfo = getTitleByTier(tribesmanComponent.titles, tier)}
            {#if titleGenerationInfo !== null}
               {@const titleInfo = TRIBESMAN_TITLE_RECORD[titleGenerationInfo.title]}
               <li>{titleInfo.name}</li>
            {:else}
               <li style:color="#222"><i>None</i></li>
            {/if}
         {/each}
      </ul> 
   </div>

   {#if tribeComponent.tribeID !== playerTribe.id}
      <div class="area">
         <div class="flex-container space-around">
            <button class="recruit-button" class:clickable={canRecruit} onclick={recruit}>Recruit</button>
            <TribesmanRelationSlider relation={tribesmanAIComponent.relationsWithPlayer} />
         </div>
      </div>
   {/if}
</div>