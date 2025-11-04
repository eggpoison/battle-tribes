import { TECHS, TechID, Tech, getTechByID, getTechRequiredForItem } from "battletribes-shared/techs";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { addKeyListener } from "../../../game/keyboard-input";
import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../game/client-item-info";
import { setTechTreeX, setTechTreeY, setTechTreeZoom, techIsDirectlyAccessible } from "../../../game/rendering/webgl/tech-tree-rendering";
import OPTIONS from "../../../game/options";
import { countItemTypesInInventory } from "../../../game/inventory-manipulation";
import { createTechTreeItem } from "../../../game/rendering/webgl/tech-tree-item-rendering";
import { Point, randAngle, randFloat } from "battletribes-shared/utils";
import { playHeadSound } from "../../../game/sound";
import TechTreeProgressBar from "./TechTreeProgressBar";
import { ItemTally2, tallyInventoryItems } from "battletribes-shared/items/ItemTally";
import { InventoryName } from "battletribes-shared/items/items";
import { addMenuCloseFunction } from "../../../game/menus";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { playerTribe } from "../../../game/tribes";
import { sendForceUnlockTechPacket, sendSelectTechPacket, sendUnlockTechPacket } from "../../../game/networking/packet-sending";
import { playerInstance } from "../../../game/player";

const boundsScale = 16;

let minX = 0;
let maxX = 0;
let minY = 0;
let maxY = 0;
for (let i = 0; i < TECHS.length; i++) {
   const tech = TECHS[i];
   if (tech.positionX < minX) {
      minX = tech.positionX;
   }
   if (tech.positionX > maxX) {
      maxX = tech.positionX;
   }
   if (tech.positionY < minY) {
      minY = tech.positionY;
   }
   if (tech.positionY > maxY) {
      maxY = tech.positionY;
   }
}
minX *= boundsScale;
maxX *= boundsScale;
minY *= boundsScale;
maxY *= boundsScale;

let hoveredTechID: TechID | null = null;

export function techIsHovered(techID: TechID): boolean {
   return techID === hoveredTechID;
}

const selectTech = (techID: TechID): void => {
   sendSelectTechPacket(techID);
}
   
const researchTech = (tech: Tech): void => {
   if (!playerTribe.unlockedTechs.includes(tech)) {
      sendUnlockTechPacket(tech.id);
   }
}

interface TechTooltipProps {
   readonly tech: Tech;
   readonly techPositionX: number;
   readonly techPositionY: number;
   readonly zoom: number;
}
const TechTooltip = ({ tech, techPositionX, techPositionY, zoom }: TechTooltipProps) => {
   const tooltipRef = useRef<HTMLDivElement | null>(null);
   
   useEffect(() => {
      if (tooltipRef.current !== null) {
         const tooltip = tooltipRef.current;
         tooltip.style.left = `calc(50% + (${tech.positionX + 5}rem + ${techPositionX}px) * ${zoom})`;
         tooltip.style.top = `calc(50% + (${-tech.positionY}rem + ${techPositionY}px) * ${zoom})`;
      }
   }, [tech.positionX, tech.positionY, techPositionX, techPositionY, zoom]);

   const isUnlocked = playerTribe.unlockedTechs.includes(tech);
   
   return <div ref={tooltipRef} id="tech-tooltip">
      <div className="container">
         
         <h2 className="name">{tech.name}</h2>
         <p className="description">{tech.description}</p>

         <div className="bar"></div>

         <p className="unlocks">Unlocks {tech.unlockedItems.map((itemType, i) => {
            const techRequired = getTechRequiredForItem(itemType);
            if (techRequired === null || !techRequired.blacklistedTribes.includes(playerTribe.tribeType)) {
               return <span key={i}>
                  <img src={getItemTypeImage(itemType)} alt="" />
                  <b>{CLIENT_ITEM_INFO_RECORD[itemType].name}</b>
                  {i <= tech.unlockedItems.length - 2 ? ", " : "."}
               </span>;
            } else {
               return undefined;
            }
         })}</p>

         {tech.conflictingTechs.length > 0 ? (
            <p className="conflict">Conflicts with {getTechByID(tech.conflictingTechs[0]).name}</p>
         ) : null}
      </div>
      {!isUnlocked ? <>
         <div className="container">
            <ul>
               {tech.researchItemRequirements.getEntries().map((entry, i) => {
                  if (playerInstance === null) {
                     return;
                  }
                  
                  const itemType = entry.itemType;
                  const itemAmount = entry.count;
                  
                  const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
                  if (inventoryComponent === null) {
                     return;
                  }
                  
                  const hotbar = getInventory(inventoryComponent, InventoryName.hotbar)!;
                  
                  const itemProgress = (playerTribe.techTreeUnlockProgress[tech.id]?.itemProgress.hasOwnProperty(itemType)) ? playerTribe.techTreeUnlockProgress[tech.id]!.itemProgress[itemType] : 0;

                  const hasFinished = typeof itemProgress !== "undefined" ? itemProgress >= itemAmount : false;
                  const canContributeItems = countItemTypesInInventory(hotbar, itemType) > 0;
                  
                  return <li key={i} className={hasFinished ? "completed" : undefined}>
                     <div>
                        <img className="item-image" src={getItemTypeImage(itemType)} alt="" />
                        <span>{CLIENT_ITEM_INFO_RECORD[itemType].name}</span>
                     </div>
                     <div>
                        <span className="item-research-count">{itemProgress}/{itemAmount}</span>
                     </div>

                     {!hasFinished && canContributeItems ? (
                        <div className="item-research-star-container">
                           <img src={require("../../../images/ui/research-star.png")} alt="" />
                        </div>
                     ) : null}
                  </li>
               })}
            </ul>
         </div>
         {tech.researchStudyRequirements > 0 ? (
            <div className="container research-container">
               <TechTreeProgressBar techInfo={tech} />
            </div>
         ) : null}
      </> : null}
   </div>;
}

/** Gets a tally of all the items which we predict will be researched when clicking */
const getResearchedItems = (techInfo: Tech): ItemTally2 => {
   if (playerInstance === null) {
      return new ItemTally2();
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   if (inventoryComponent === null) {
      return new ItemTally2();
   }
   
   const hotbar = getInventory(inventoryComponent, InventoryName.hotbar)!;
   
   const availableItemsTally = new ItemTally2();
   tallyInventoryItems(availableItemsTally, hotbar);
   
   const researchTally = new ItemTally2();
   for (const entry of techInfo.researchItemRequirements.getEntries()) {
      const researchItemType = entry.itemType;

      const availableCount = availableItemsTally.getItemCount(researchItemType);
      researchTally.addItem(researchItemType, availableCount);
      
      const itemProgress = playerTribe.techTreeUnlockProgress[techInfo.id]?.itemProgress[researchItemType] || 0;
      researchTally.restrictItemCount(researchItemType, entry.count - itemProgress);
   }

   return researchTally;
}

const addResearchedItems = (techInfo: Tech, researchTally: ItemTally2): void => {
   const entries = researchTally.getEntries();
   for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      for (let i = 0; i < entry.count; i++) {
         // @Speed
         const position = new Point(techInfo.positionX, techInfo.positionY).offset(randFloat(0, 3.5), randAngle());
         createTechTreeItem(entry.itemType, position);
      }
   }
}

interface TechNodeProps {
   readonly tech: Tech;
   readonly positionX: number;
   readonly positionY: number;
   readonly zoom: number;
}
const TechNode = ({ tech, positionX, positionY, zoom }: TechNodeProps) => {
   const elementRef = useRef<HTMLDivElement | null>(null);
   const [isHovered, setIsHovered] = useState(false);

   useEffect(() => {
      if (elementRef.current !== null) {
         const element = elementRef.current;
         element.style.left = `calc(50% + (${tech.positionX}rem + ${positionX}px) * ${zoom})`;
         element.style.top = `calc(50% + (${-tech.positionY}rem + ${positionY}px) * ${zoom})`;
      }
   }, [tech.positionX, tech.positionY, positionX, positionY, zoom]);

   const isUnlocked = playerTribe.unlockedTechs.includes(tech);
   const isSelected = playerTribe.selectedTech === tech;

   const onMouseEnter = (): void => {
      hoveredTechID = tech.id;
      setIsHovered(true);
   }

   const onMouseLeave = (): void => {
      hoveredTechID = null;
      setIsHovered(false);
   }

   const onClick = (e: MouseEvent): void => {
      if (e.shiftKey) {
         sendForceUnlockTechPacket(tech.id);
      } else if (!isUnlocked) {
         researchTech(tech);

         const itemTally = getResearchedItems(tech);
         addResearchedItems(tech, itemTally);
         
         // @Incomplete: This sounds like an error sound when it's not...
         // @Incomplete @Bug: will decrease in loudness as the sound plays: - attach to camera so it doesn't decrease in loudness. or make 'global sounds'
         playHeadSound("item-research.mp3", 0.4, 1);
      }
   }

   const onRightClick = (e: MouseEvent): void => {
      if (isUnlocked) {
         return;
      }
      
      if (tech.researchStudyRequirements > 0) {
         selectTech(tech.id);
      }
      e.preventDefault();
   }

   return <>
      <div ref={elementRef} onClick={e => onClick(e.nativeEvent)} onContextMenu={e => onRightClick(e.nativeEvent)} className={`tech${isUnlocked ? " unlocked" : ""}${isSelected ? " selected" : ""}`} onMouseEnter={() => onMouseEnter()} onMouseLeave={() => onMouseLeave()}>
         <div className="icon-wrapper">
            <img src={require("../../../images/tech-tree/" + tech.iconSrc)} alt="" className="icon" draggable={false} />
         </div>
      </div>
      {isHovered ? (
         <TechTooltip tech={tech} techPositionX={positionX} techPositionY={positionY} zoom={zoom} />
      ) : null}
   </>;
}

export let updateTechTree: () => void = () => {};

export let techTreeIsOpen: () => boolean = () => false;
let closeTechTree: () => void;

const TechTree = () => {
   const [isVisible, setIsVisible] = useState(false);
   const changeVisibility = useRef<() => void>();
   const hasLoaded = useRef(false);
   const [positionX, setPositionX] = useState(0);
   const [positionY, setPositionY] = useState(0);
   const lastDragX = useRef(0);
   const lastDragY = useRef(0);
   const isDragging = useRef(false);
   const scrollFunc = useRef<(e: WheelEvent) => void>();
   const [zoom, setZoom] = useState(1);
   const [, forceUpdate] = useReducer(x => x + 1, 0);

   useEffect(() => {
      if (!hasLoaded.current) {
         updateTechTree = (): void => {
            forceUpdate();
         }
         
         // @Memleak: Remove the listener when the component is unmounted
         addKeyListener("p", () => {
            changeVisibility.current!();
         });
         
         document.addEventListener("wheel", e => {
            scrollFunc.current!(e);
         });
      }
      hasLoaded.current = true;
   }, []);

   useEffect(() => {
      if (isVisible) {
         addMenuCloseFunction(() => {
            closeTechTree();
         });
      }
      
      closeTechTree = () => {
         if (isVisible) {
            changeVisibility.current!();
         }
      }

      techTreeIsOpen = (): boolean => {
         return isVisible;
      }

      changeVisibility.current = (): void => {
         if (!isVisible) {
            if (playerInstance === null) {
               return;
            }
            document.getElementById("tech-tree-canvas")!.classList.remove("hidden");
         } else {
            document.getElementById("tech-tree-canvas")!.classList.add("hidden");
         }
         setIsVisible(!isVisible);
      }
   }, [isVisible]);

   useEffect(() => {
      scrollFunc.current = (e: WheelEvent): void => {
         if (e.deltaY > 0) {
            let newZoom = zoom / 1.2;
            if (newZoom < 0.25) {
               newZoom = zoom;
            }
            setZoom(newZoom);
            setTechTreeZoom(newZoom);
         } else {
            let newZoom = zoom * 1.2;
            if (newZoom > 1) {
               newZoom = zoom;
            }
            setZoom(newZoom);
            setTechTreeZoom(newZoom);
         }
      }
   }, [zoom]);

   const onMouseDown = (e: MouseEvent): void => {
      isDragging.current = true;
      lastDragX.current = e.clientX;
      lastDragY.current = e.clientY;
   }

   const onMouseMove = useCallback((e: MouseEvent): void => {
      if (!isDragging.current) {
         return;
      }
      const dragX = e.clientX - lastDragX.current;
      const dragY = e.clientY - lastDragY.current;

      lastDragX.current = e.clientX;
      lastDragY.current = e.clientY;

      let x = positionX + dragX * 2 / zoom;
      let y = positionY + dragY * 2 / zoom;
      if (x < minX) {
         x = minX;
      } else if (x > maxX) {
         x = maxX;
      }
      if (y < minY) {
         y = minY;
      } else if (y > maxY) {
         y = maxY;
      }
      
      setPositionX(x);
      setPositionY(y);
      setTechTreeX(x);
      setTechTreeY(y);
   }, [positionX, positionY, zoom]);

   const onMouseUp = (): void => {
      isDragging.current = false;
   }

   if (!isVisible) {
      return null;
   }
   
   return <div id="tech-tree" style={{"--tech-tree-zoom": zoom} as React.CSSProperties} onMouseDown={e => onMouseDown(e.nativeEvent)} onMouseMove={e => onMouseMove(e.nativeEvent)} onMouseUp={() => onMouseUp()}>
      <h1>Tech Tree</h1>
      
      {TECHS.filter(tech => OPTIONS.showAllTechs || techIsDirectlyAccessible(tech)).map((techInfo, i) => {
         return <TechNode tech={techInfo} positionX={positionX} positionY={positionY} zoom={zoom} key={i} />
      })}
   </div>;
}

export default TechTree;