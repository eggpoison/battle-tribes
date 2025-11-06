<script lang="ts">
   import { Mutable, randAngle, Inventory, InventoryName, ItemSlots, EntityComponents, ServerComponentType, ComponentSummonData, EntitySummonData, EntitySummonPacket, EntityType, NUM_ENTITY_TYPES } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../../game/client-entity-info";
   import DevmodeRangeInput from "../DevmodeRangeInput";
   import TribeComponentInput from "./TribeComponentInput";
   import DevmodeScrollableOptions from "../DevmodeScrollableOptions";
   import InventoryComponentInput, { ENTITY_INVENTORY_NAME_RECORD, NUM_INVENTORY_NAMES } from "./InventoryComponentInput";
   import { closeCurrentMenu } from "../../../../game/menus";
   import { GameInteractState } from "../../GameScreen";

   type EntityTypeTuple = [EntityType, string];

   interface ComponentDataInputsProps {
      readonly componentType: ServerComponentType;
   }

   const createInitialInventories = (): Record<InventoryName, Inventory> => {
      const inventories: Partial<Record<InventoryName, Inventory>> = {};

      for (let inventoryName: InventoryName = 0; inventoryName < NUM_INVENTORY_NAMES; inventoryName++) {
         const inventory = new Inventory(1, 1, inventoryName);
         inventories[inventoryName] = inventory;
      }

      return inventories as Record<InventoryName, Inventory>;
   }

   // @Hack? Is there a better way?
   export const SUMMON_DATA_PARAMS = {
      inventories: createInitialInventories(),
      tribeID: 0
   };

   let alphabeticalEntityTypes: ReadonlyArray<EntityType>;
   {
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
      alphabeticalEntityTypes = sortedEntityTypes;
   }
   const alphabeticalEntityNames = alphabeticalEntityTypes.map(entityType => CLIENT_ENTITY_INFO_RECORD[entityType].name);

   const serialiseInventoryComponentSummonData = (entityType: EntityType): ComponentSummonData<ServerComponentType.inventory> => {
      // @Cleanup: can be simpller as inventories has all
      
      const inventoryNames = ENTITY_INVENTORY_NAME_RECORD[entityType] || [];
      
      const itemSlots: Partial<Record<InventoryName, ItemSlots>> = {};
      for (let i = 0; i < inventoryNames.length; i++) {
         const inventoryName = inventoryNames[i];

         const inventory = SUMMON_DATA_PARAMS.inventories[inventoryName];
         
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
         tribeID: SUMMON_DATA_PARAMS.tribeID
      };
   }

   const serialiseComponentSummonData = (componentType: ServerComponentType, entityType: EntityType): ComponentSummonData<ServerComponentType> | undefined => {
      switch (componentType) {
         case ServerComponentType.inventory: return serialiseInventoryComponentSummonData(entityType);
         case ServerComponentType.tribe: return serialiseTribeComponentSummonData();
      }
   }

   const getInputElement = (componentType: ServerComponentType, entityType: EntityType, setMenu: (element: JSX.Element) => void, key: number): JSX.Element | undefined => {
      switch (componentType) {
         case  ServerComponentType.inventory: return <InventoryComponentInput entityType={entityType} setMenu={setMenu} key={key} />;
         case ServerComponentType.tribe: return <TribeComponentInput key={key} />;
      }
   }

   const ComponentDataInputs = (props: ComponentDataInputsProps) => {
      switch (props.componentType) {
         case ServerComponentType.transform: {
            
         }
      }
   }

   const [selectedEntityType, setSelectedEntityType] = useState(alphabeticalEntityTypes[0]);

   // Spawn options
   const [spawnRange, setSpawnRange] = useState(0);

   const componentTypes = EntityComponents[selectedEntityType] as ReadonlyArray<ServerComponentType>;

   const updateSummonPacket = useCallback((): void => {
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
      props.summonPacketRef.current = packet;
   }, [selectedEntityType, spawnRange]);

   const beginSummon = (): void => {
      updateSummonPacket();

      // Close the tab
      closeCurrentMenu();
      props.setGameInteractState(GameInteractState.summonEntity);
   }
   
   const selectEntityType = (optionIdx: number): void => {
      const entityType = alphabeticalEntityTypes[optionIdx];
      setSelectedEntityType(entityType);
   }
</script>

<div id="summon-tab" class="devmode-tab devmode-container">
   <div class="flex-container">
      <DevmodeScrollableOptions options={alphabeticalEntityNames} onOptionSelect={selectEntityType} />
      
      <div class="spawn-options devmode-menu-section">
         <h2 class="devmode-menu-section-title">Spawn Options</h2>
         <div class="bar"></div>

         <DevmodeRangeInput text="Spawn range:" defaultValue={spawnRange} onChange={setSpawnRange} />

         {componentTypes.map((componentType, i) => {
            return getInputElement(componentType, selectedEntityType, props.setMenu, i);
         })}

         <button onclick={beginSummon}>Summon</button>
      </div>
   </div>
</div>