<script lang="ts">
   import { NUM_TRIBESMAN_TITLES, TribesmanTitle } from "webgl-test-shared";
   import { sendDevGiveTitlePacket, sendDevRemoveTitlePacket } from "../../../../game/networking/packet-sending";
   import TitlesList from "./TitlesList.svelte";
   import { tabSelectorState } from "../../../../ui-state/tab-selector-state.svelte";

   const getUnclaimedTitles = (titles: ReadonlyArray<TribesmanTitle>): ReadonlyArray<TribesmanTitle> => {
      const unclaimedTitles = new Array<TribesmanTitle>();
      
      for (let title: TribesmanTitle = 0; title < NUM_TRIBESMAN_TITLES; title++) {
         if (!titles.includes(title)) {
            unclaimedTitles.push(title);
         }
      }

      return unclaimedTitles;
   }


   const unclaimedTitles = getUnclaimedTitles(tabSelectorState.titles);
</script>

<div id="titles-tab" class="devmode-tab devmode-container">
   <div class="flex-container">
      <div class="devmode-menu-section">
         <h2 class="devmode-menu-section-title">Add</h2>
         <TitlesList onclick={sendDevGiveTitlePacket} titles={unclaimedTitles} />
      </div>
      <div class="devmode-menu-section">
         <h2 class="devmode-menu-section-title">Remove</h2>
         <TitlesList onclick={sendDevRemoveTitlePacket} titles={tabSelectorState.titles} />
      </div>
   </div>
</div>