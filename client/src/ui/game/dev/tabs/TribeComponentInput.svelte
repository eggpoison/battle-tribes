<script lang="ts">
   import CLIENT_TRIBE_INFO_RECORD from "../../../../game/client-tribe-info";
   import { tribes } from "../../../../game/tribes";
   import { tabSelectorState } from "../../../../ui-state/tab-selector-state.svelte";
   import DevmodeDropdownInput from "../DevmodeDropdownInput.svelte";

   const tribeIDs = new Array<number>();
   const options = new Array<string>();
   for (const tribe of tribes) {
      tribeIDs.push(tribe.id);
      options.push(tribe.id + " (" + CLIENT_TRIBE_INFO_RECORD[tribe.tribeType].name + ")");
   }

   const updateTribeID = (optionIdx: number): void => {
      const tribeID = tribeIDs[optionIdx];
      tabSelectorState.setSummonedTribeID(tribeID);
   }
</script>

<DevmodeDropdownInput text="Tribe ID:" options={options} onChange={updateTribeID} />