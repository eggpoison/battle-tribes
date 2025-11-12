<script lang="ts">
   import Tab from "./Tab.svelte";
   import { Menu, menuSelectorState } from "../../../ui-state/menu-selector-state.svelte";

   const updateSelectedTab = (e: MouseEvent, clickedTab: Menu): void => {
      // If clicked tab was the currently selected tab, clear the selected tab
      if (menuSelectorState.menu === clickedTab) {
         menuSelectorState.closeMenu();
      } else {
         // Otherwise, select the clicked tab.
         menuSelectorState.openMenu(clickedTab);

         // If not here, the items tab autofocus won't work
         e.preventDefault();
      }
   }
</script>

<div id="tab-selection">
   <!-- @Cleanup: copy and paste -->
   <Tab menu={Menu.itemsDevTab} onClick={updateSelectedTab} />
   <Tab menu={Menu.summonDevTab} onClick={updateSelectedTab} />
   <Tab menu={Menu.titlesDevTab} onClick={updateSelectedTab} />
   <Tab menu={Menu.tribesDevTab} onClick={updateSelectedTab} />
</div>