<script lang="ts">
   import { TribeType, NUM_TRIBE_TYPES } from "webgl-test-shared/src/tribes";
   import CLIENT_TRIBE_INFO_RECORD from "../../../../game/client-tribe-info";
   import { setRenderedTribePlanID } from "../../../../game/rendering/tribe-plan-visualiser/tribe-plan-visualiser";
   import { tribeHasExtendedInfo, tribes } from "../../../../game/tribes";
   import CLIENT_ENTITY_INFO_RECORD from "../../../../game/client-entity-info";
   import { sendDevChangeTribeTypePacket, sendDevCreateTribePacket, sendSetAutogiveBaseResourcesPacket, sendTPTOEntityPacket } from "../../../../game/networking/packet-sending";

   let selectedTribe = $state(tribes[0]);

   const selectTribeID = (optionIdx: number): void => {
      setSelectedTribe(tribes[optionIdx]);
   }

   const updateTribeType = useCallback((optionIdx: number): void => {
      const tribeType = optionIdx as TribeType;
      sendDevChangeTribeTypePacket(selectedTribe.id, tribeType);
   }, [selectedTribe]);

   const tribeTypeOptions = new Array<string>();
   for (let tribeType: TribeType = 0; tribeType < NUM_TRIBE_TYPES; tribeType++) {
      const clientInfo = CLIENT_TRIBE_INFO_RECORD[tribeType];
      tribeTypeOptions.push(clientInfo.name);
   }

   const checkAutogiveBaseResources = (e: Event): void => {
      const autogiveBaseResources = (e.target as HTMLInputElement).checked;
      sendSetAutogiveBaseResourcesPacket(selectedTribe.id, autogiveBaseResources);
   }

   export let TribesTab_refresh: () => void = () => {};

   const TribesTab = () => {}
</script>
   
<div id="tribes-tab" class="devmode-tab devmode-container">
   <div class="flex-container">
      <DevmodeScrollableOptions options={tribes.map(tribe => tribe.id.toString())} onOptionSelect={selectTribeID} />
      
      <div class="flex-container column">
         <div class="spawn-options devmode-menu-section">
            <h2 class="devmode-menu-section-title">{selectedTribe.name}</h2>
            <div class="bar"></div>

            <DevmodeDropdownInput text="Tribe type:" options={tribeTypeOptions} defaultOption={CLIENT_TRIBE_INFO_RECORD[selectedTribe.tribeType].name} onChange={updateTribeType} />

            <button onclick={() => setRenderedTribePlanID(selectedTribe.id)}>View Plans</button>

            <label>
               <input type="checkbox" onchange={checkAutogiveBaseResources} />
               Autogive Base Resources
            </label>
         </div>

         {#if tribeHasExtendedInfo(selectedTribe)}
            <div class="devmode-menu-section">
               <h3>Tribesmen</h3>

               {#each selectedTribe.tribesmen as tribesmanInfo}
                  <div class="devmode-card">
                     <button onclick={() => sendTPTOEntityPacket(tribesmanInfo.entity)}>Teleport</button>
                     
                     <p>{tribesmanInfo.name}</p>
                     <p>{CLIENT_ENTITY_INFO_RECORD[tribesmanInfo.entityType].name} #{tribesmanInfo.entity}</p>
                  </div>
               {/each}
            </div>
         {/if}

         <!-- @Cleanup: Wrong section -->
         <div class="devmode-menu-section">
            <button onclick={sendDevCreateTribePacket}>Create New Tribe</button>
         </div>
      </div>
   </div>
</div>