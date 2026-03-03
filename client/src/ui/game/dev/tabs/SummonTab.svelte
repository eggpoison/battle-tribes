<script lang="ts">
   import { randAngle, InventoryName, type ItemSlots, EntityComponents, ServerComponentType, type ComponentSummonData, type EntitySummonData, type EntitySummonPacket, EntityType, NUM_ENTITY_TYPES } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../../game/client-entity-info";
   import DevmodeScrollableOptions from "../DevmodeScrollableOptions.svelte";
   import { ENTITY_INVENTORY_NAME_RECORD, tabSelectorState } from "../../../../ui-state/tab-selector-state";
   import { GameInteractState, gameUIState } from "../../../../ui-state/game-ui-state";
   import DevmodeRangeInput from "../DevmodeRangeInput.svelte";
   import InventoryComponentInput from "./InventoryComponentInput.svelte";
   import TribeComponentInput from "./TribeComponentInput.svelte";
   import { menuSelectorState } from "../../../../ui-state/menu-selector-state";

   type EntityTypeTuple = [EntityType, string];

   const entityTypeTuples = new Array<EntityTypeTuple>();
   for (let entityType: EntityType = 0; entityType < NUM_ENTITY_TYPES; entityType++) {
      const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[entityType];
      entityTypeTuples.push([entityType, clientEntityInfo.name]);
   }

   const sortedTuples = entityTypeTuples.sort((a, b) => a[1] > b[1] ? 1 : -1);

   const sortedEntityTypes = new Array<EntityType>();
   for (let i = 0; i < sortedTuples.length; i++) {
      const tuple = sortedTuples[i];
      sortedEntityTypes.push(tuple[0]);
   }
   const alphabeticalEntityTypes = sortedEntityTypes;
   
   const alphabeticalEntityNames = alphabeticalEntityTypes.map(entityType => CLIENT_ENTITY_INFO_RECORD[entityType].name);

   const serialiseInventoryComponentSummonData = (entityType: EntityType): ComponentSummonData<ServerComponentType.inventory> => {
      // @Cleanup: can be simpller as inventories has all
      
      const inventoryNames = ENTITY_INVENTORY_NAME_RECORD[entityType] || [];
      
      const itemSlots: Partial<Record<InventoryName, ItemSlots>> = {};
      for (let i = 0; i < inventoryNames.length; i++) {
         const inventoryName = inventoryNames[i];

         const inventory = tabSelectorState.summonedInventories[inventoryName];
         
         if (Object.keys(inventory.itemSlots).length > 0) {
            itemSlots[inventoryName] = inventory.itemSlots;
         }
      }

      return {
         itemSlots: itemSlots
      };
   }

   const serialiseTribeComponentSummonData = (): ComponentSummonData<ServerComponentType.tribe> => {
      return {
         tribeID: tabSelectorState.summonedTribeID
      };
   }

   const serialiseComponentSummonData = (componentType: ServerComponentType, entityType: EntityType): ComponentSummonData<ServerComponentType> | undefined => {
      switch (componentType) {
         case ServerComponentType.inventory: return serialiseInventoryComponentSummonData(entityType);
         case ServerComponentType.tribe: return serialiseTribeComponentSummonData();
      }
   }

   let selectedEntityType = $state(alphabeticalEntityTypes[0]);

   // Spawn options
   let spawnRange = $state(0);

   const componentTypes: ReadonlyArray<ServerComponentType> = $derived(EntityComponents[selectedEntityType]);

   const updateSummonPacket = (): void => {
      // Create summon data
      const summonData: EntitySummonData = {};
      for (const componentType of componentTypes) {
         const data = serialiseComponentSummonData(componentType, selectedEntityType);
         if (typeof data !== "undefined") {
            // @Hack
            summonData[componentType] = data as any;
         }
      }
      
      const packet: EntitySummonPacket = {
         // The position and rotation values are overriden with the actual values when the packet is sent
         position: [0, 0],
         rotation: randAngle(),
         entityType: selectedEntityType,
         summonData: summonData
      };
      tabSelectorState.setSummonPacket(packet);
   }

   const beginSummon = (): void => {
      updateSummonPacket();

      // Close the tab
      menuSelectorState.closeCurrentMenu();
      gameUIState.setGameInteractState(GameInteractState.summonEntity);
   }
   
   const selectEntityType = (optionIdx: number): void => {
      const entityType = alphabeticalEntityTypes[optionIdx];
      selectedEntityType = entityType;
   }
</script>

<div id="summon-tab" class="devmode-tab devmode-container">
   <div class="flex-container">
      <DevmodeScrollableOptions options={alphabeticalEntityNames} onOptionSelect={selectEntityType} />
      
      <div class="spawn-options devmode-menu-section">
         <h2 class="devmode-menu-section-title">Spawn Options</h2>
         <div class="bar"></div>

         <DevmodeRangeInput text="Spawn range:" bind:value={spawnRange} />

         {#each componentTypes as componentType}
            {#if componentType === ServerComponentType.inventory}
               <InventoryComponentInput entityType={selectedEntityType} />;
            {:else if componentType === ServerComponentType.tribe}
               <TribeComponentInput />;
            {/if}
         {/each}

         <button onclick={beginSummon}>Summon</button>
      </div>
   </div>
</div>