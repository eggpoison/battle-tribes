<script lang="ts">
   import ItemsTab from "./tabs/ItemsTab.svelte";
   import SummonTab from "./tabs/SummonTab.svelte";
   import TitlesTab from "./tabs/TitlesTab.svelte";
   import TribesTab from "./tabs/TribesTab.svelte";
   import Tab from "./Tab.svelte";
   import { TabType } from "../../../ui-state/tab-selector-state.svelte";

   let selectedTab = $state<TabType | null>(null);
   
   const updateSelectedTab = (e: MouseEvent, clickedTab: TabType): void => {
      // If clicked tab was the currently selected tab, clear the selected tab
      if (selectedTab === clickedTab) {
         selectedTab = null;
      } else {
         // Otherwise, select the clicked tab.
         selectedTab = clickedTab;

         // If not here, the items tab autofocus won't work
         e.preventDefault();
      }
   }
</script>

{#if selectedTab === TabType.items}
   <ItemsTab/>
{:else if selectedTab === TabType.summon}
   <SummonTab />
{:else if selectedTab === TabType.titles}
   <TitlesTab />
{:else if selectedTab === TabType.tribes}
   <TribesTab />
{/if}
   

<div id="tab-selection">
   <!-- @Cleanup: copy and paste -->
   <Tab tabType={TabType.items}  selectedTabType={selectedTab} onClick={updateSelectedTab} />
   <Tab tabType={TabType.summon} selectedTabType={selectedTab} onClick={updateSelectedTab} />
   <Tab tabType={TabType.titles} selectedTabType={selectedTab} onClick={updateSelectedTab} />
   <Tab tabType={TabType.tribes} selectedTabType={selectedTab} onClick={updateSelectedTab} />
</div>