<script lang="ts">
   import MenuElem from "../menus/MenuElem.svelte";
   import SkillConnector from "./SkillConnector.svelte";
   import TamingSkillNode from "./TamingSkillNode.svelte";

   export const TAMING_TIER_ICONS: Record<number, any> = {
      0: require("../../../images/entities/miscellaneous/taming-tier-0.png"),
      1: require("../../../images/entities/miscellaneous/taming-tier-1.png"),
      2: require("../../../images/entities/miscellaneous/taming-tier-2.png"),
      3: require("../../../images/entities/miscellaneous/taming-tier-3.png")
   };
   export const SKILL_TRANSFORM_SCALE_FACTOR = 0.5;

   const UNUSED_NAMETAG_IMG = require("../../../images/menus/taming-almanac/nametag-unused.png");
   const USED_NAMETAG_IMG = require("../../../images/menus/taming-almanac/nametag-used.png");


   const [entity, setEntity] = useState(0);
   const [isVisible, setIsVisible] = useState(false);
   const [_, forceUpdate] = useReducer(x => x + 1, 0);
   const [hoveredSkill, setHoveredSkill] = useState<TamingSkillNode | null>(null);
   
   const clientEntityInfo = CLIENT_ENTITY_INFO_RECORD[getEntityType(entity)];

   const tamingComponent = TamingComponentArray.getComponent(entity);
   const tamingSpec = getEntityTamingSpec(entity);
   const nextTamingTierFoodCost: number | undefined = tamingSpec.tierFoodRequirements[(tamingComponent.tamingTier + 1) as TamingTier];

   const foodProgress = typeof nextTamingTierFoodCost !== "undefined" ? Math.min(tamingComponent.foodEatenInTier / nextTamingTierFoodCost, 1) : 1;

   const onCompleteButtonClick = (): void => {
      if (keyIsPressed("shift") && isDev()) {
         sendForceCompleteTamingTierPacket(entity);
      } else {
         sendCompleteTamingTierPacket(entity);
      }

      playHeadSound("taming-tier-complete.mp3", 1, 1);
   }

   const openRenamePrompt = (): void => {
      TamingRenamePrompt_open(entity);
      
      addMenuCloseFunction(TamingRenamePrompt_close);
   }

   let progressBarClassName: string;
   switch (tamingComponent.tamingTier) {
      case 0: {
         progressBarClassName = "green";
         break;
      }
      case 1: {
         progressBarClassName = "blue";
         break;
      }
      case 2:
      case 3: {
         progressBarClassName = "purple";
         break;
      }
      default: throw new Error();
   }

   let minX = 0;
   let maxX = 0;
   let maxY = 0;
   for (const skillNode of tamingSpec.skillNodes) {
      if (skillNode.x < minX) {
         minX = skillNode.x;
      } else if (skillNode.x > maxX) {
         maxX = skillNode.x;
      }
      if (skillNode.y > maxY) {
         maxY = skillNode.y;
      }
   }
   let skillMapWidth = maxX - minX;
   let skillMapHeight = maxY;
   // Pad it
   skillMapWidth += 18;
   skillMapHeight += 8;
   
</script>

<MenuElem id="taming-menu" className="menu">
   <h1>
      {clientEntityInfo.name}
      {#if tamingComponent.name !== ""}
         {tamingComponent.name}
      {/if}
      {#if tamingComponent.tamingTier > 0}
         <img onclick={openRenamePrompt} className="rename-icon" src={tamingComponent.name !== "" ? USED_NAMETAG_IMG : UNUSED_NAMETAG_IMG} />
      {/if}
   </h1>

   <p className="taming-tier">
      <span>Taming Tier:</span>
      <img src={TAMING_TIER_ICONS[tamingComponent.tamingTier]} />
   </p>

   <div className="progress-area">
      <div className="row">
         <div className="berry-progress-bar">
            <div className="berry-progress-bar-bg"></div>
            <div className={"berry-progress-bar-fill " + progressBarClassName} style={{"--width-percentage": foodProgress * 100 + "%"} as React.CSSProperties}></div>
            <div className="progress-counter">
               {#if typeof nextTamingTierFoodCost !== "undefined"}
                  <span>{tamingComponent.foodEatenInTier}/{nextTamingTierFoodCost} {CLIENT_ITEM_INFO_RECORD[tamingSpec.foodItemType].namePlural}</span>
                  <img src={getItemTypeImage(tamingSpec.foodItemType)} />
               {:else}
                  <div className="height-padder">
                     <span>Max!</span>
                  </div>
               {/if}
            </div>
         </div>
         {#if typeof nextTamingTierFoodCost !== "undefined"}
            <button class={tamingComponent.foodEatenInTier >= nextTamingTierFoodCost ? "clickable" : undefined} onMouseDown={onCompleteButtonClick}>Complete</button>
         {/if}
      </div>
   </div>

   <div class="skill-map-container" style={{minWidth: skillMapWidth * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem", height: skillMapHeight * Vars.SKILL_TRANSFORM_SCALE_FACTOR + "rem"}}>
      {#each tamingSpec.skillNodes as skillNode}
         <TamingSkillNode />
      {/each}
      {#each tamingSpec.skillNodes as skillNode}
         {#if skillNode.parent !== null && tamingComponent.tamingTier >= skillNode.requiredTamingTier}
            <SkillConnector tamingComponent={tamingComponent} toSkillNode={skillNode} />
         {/if}
      {/each}

      {#if tamingComponent.tamingTier < 1}
         <TierSeparator tamingTier={1} />
      {/if}
      {#if tamingComponent.tamingTier < 2 && tamingSpec.maxTamingTier >= 2}
         <TierSeparator tamingTier={2} />
      {/if}
      {#if tamingComponent.tamingTier < 3 && tamingSpec.maxTamingTier >= 3}
         <TierSeparator tamingTier={3} />
      {/if}
   </div>
</MenuElem>