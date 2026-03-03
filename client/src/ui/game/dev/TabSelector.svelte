<script lang="ts">
   import Tab from "./Tab.svelte";
   import { Menu, menuSelectorState } from "../../../ui-state/menu-selector-state";

   const updateSelectedTab = (e: MouseEvent, clickedTab: Menu): void => {
      menuSelectorState.toggleMenu(clickedTab);
      // If not here, the items tab autofocus won't work
      e.preventDefault();
   }
</script>

<div id="tab-selection">
   <!-- @Cleanup: copy and paste -->
   <Tab menu={Menu.itemsDevTab} onClick={updateSelectedTab} />
   <Tab menu={Menu.summonDevTab} onClick={updateSelectedTab} />
   <Tab menu={Menu.titlesDevTab} onClick={updateSelectedTab} />
   <Tab menu={Menu.tribesDevTab} onClick={updateSelectedTab} />
</div>