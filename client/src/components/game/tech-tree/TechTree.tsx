import { TECHS, TechID, TechInfo, getTechByID, getTechRequiredForItem } from "webgl-test-shared/dist/techs";
import { ItemType, ItemTypeString } from "webgl-test-shared/dist/items";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { addKeyListener } from "../../../keyboard-input";
import CLIENT_ITEM_INFO_RECORD, { getItemTypeImage } from "../../../client-item-info";
import Game from "../../../Game";
import Client from "../../../client/Client";
import { setTechTreeX, setTechTreeY, setTechTreeZoom, techIsDirectlyAccessible } from "../../../rendering/webgl/tech-tree-rendering";
import OPTIONS from "../../../options";
import Player from "../../../entities/Player";
import { countItemTypesInInventory, tallyInventoryItems } from "../../../inventory-manipulation";
import { definiteGameState } from "../../../game-state/game-states";
import { setMenuCloseFunction } from "../../../player-input";
import { ItemTally } from "webgl-test-shared/dist/crafting-recipes";
import { createTechTreeItem } from "../../../rendering/webgl/tech-tree-item-rendering";
import { Point, randFloat } from "webgl-test-shared/dist/utils";
import Camera from "../../../Camera";
import { playSound } from "../../../sound";
import TechTreeProgressBar from "./TechTreeProgressBar";

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
   Client.sendSelectTech(techID);
}
   
const researchTech = (techID: TechID): void => {
   if (Game.tribe.hasUnlockedTech(techID)) {
      return;
   }
   
   Client.sendUnlockTech(techID);
}

interface TechTooltipProps {
   readonly techInfo: TechInfo;
   readonly techPositionX: number;
   readonly techPositionY: number;
   readonly zoom: number;
}
const TechTooltip = ({ techInfo, techPositionX, techPositionY, zoom }: TechTooltipProps) => {
   const tooltipRef = useRef<HTMLDivElement | null>(null);
   
   useEffect(() => {
      if (tooltipRef.current !== null) {
         const tooltip = tooltipRef.current;
         tooltip.style.left = `calc(50% + (${techInfo.positionX + 5}rem + ${techPositionX}px) * ${zoom})`;
         tooltip.style.top = `calc(50% + (${-techInfo.positionY}rem + ${techPositionY}px) * ${zoom})`;
      }
   }, [techInfo.positionX, techInfo.positionY, techPositionX, techPositionY, zoom]);

   const isUnlocked = Game.tribe.hasUnlockedTech(techInfo.id);
   
   return <div ref={tooltipRef} id="tech-tooltip">
      <div className="container">
         
         <h2 className="name">{techInfo.name}</h2>
         <p className="description">{techInfo.description}</p>

         <div className="bar"></div>

         <p className="unlocks">Unlocks {techInfo.unlockedItems.map((itemType, i) => {
            const techRequired = getTechRequiredForItem(itemType);
            if (techRequired === null || !getTechByID(techRequired).blacklistedTribes.includes(Game.tribe.tribeType)) {
               return <span key={i}>
                  <img src={getItemTypeImage(itemType)} alt="" />
                  <b>{CLIENT_ITEM_INFO_RECORD[itemType].name}</b>
                  {i <= techInfo.unlockedItems.length - 2 ? ", " : "."}
               </span>;
            } else {
               return undefined;
            }
         })}</p>

         {techInfo.conflictingTechs.length > 0 ? (
            <p className="conflict">Conflicts with {getTechByID(techInfo.conflictingTechs[0]).name}</p>
         ) : null}
      </div>
      {!isUnlocked ? <>
         <div className="container">
            <ul>
               {Object.entries(techInfo.researchItemRequirements).map(([itemTypeString, itemAmount], i) => {
                  const itemType = Number(itemTypeString) as ItemType;
                  const itemProgress = (Game.tribe.techTreeUnlockProgress[techInfo.id]?.itemProgress.hasOwnProperty(itemType)) ? Game.tribe.techTreeUnlockProgress[techInfo.id]!.itemProgress[itemType] : 0;

                  const hasFinished = typeof itemProgress !== "undefined" ? itemProgress >= itemAmount : false;
                  const canContributeItems = countItemTypesInInventory(definiteGameState.hotbar, itemType) > 0;
                  
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
         {techInfo.researchStudyRequirements > 0 ? (
            <div className="container research-container">
               <TechTreeProgressBar techInfo={techInfo} />
            </div>
         ) : null}
      </> : null}
   </div>;
}

const getResearchedItems = (techInfo: TechInfo): ItemTally => {
   // Tally items
   const tally: ItemTally = {};
   tallyInventoryItems(tally, definiteGameState.hotbar);
   
   const researchTally: ItemTally = {};
   for (const [itemTypeString, amount] of Object.entries(techInfo.researchItemRequirements)) {
      const itemType = Number(itemTypeString) as ItemType;

      const availableItemCount = tally[itemType];

      if (typeof availableItemCount !== "undefined") {
         if (typeof researchTally[itemType] === "undefined") {
            researchTally[itemType] = availableItemCount;
         } else {
            researchTally[itemType]! += availableItemCount;
         }

         const itemProgress = Game.tribe.techTreeUnlockProgress[techInfo.id]?.itemProgress[itemType] || 0;
         const maxResearchableCount = amount - itemProgress;
         if (researchTally[itemType]! > maxResearchableCount) {
            researchTally[itemType] = maxResearchableCount;
         }
      }
   }

   return researchTally;
}

const addResearchedItems = (techInfo: TechInfo, researchTally: ItemTally): void => {
   for (const [itemTypeString, amount] of Object.entries(researchTally)) {
      const itemType = Number(itemTypeString) as ItemType;

      for (let i = 0; i < amount; i++) {
         // @Speed
         const position = new Point(techInfo.positionX, techInfo.positionY).offset(randFloat(0, 3.5), 2 * Math.PI * Math.random());
         createTechTreeItem(itemType, position);
      }
   }
}

interface TechProps {
   readonly techInfo: TechInfo;
   readonly positionX: number;
   readonly positionY: number;
   readonly zoom: number;
}
const Tech = ({ techInfo, positionX, positionY, zoom }: TechProps) => {
   const elementRef = useRef<HTMLDivElement | null>(null);
   const [isHovered, setIsHovered] = useState(false);

   useEffect(() => {
      if (elementRef.current !== null) {
         const element = elementRef.current;
         element.style.left = `calc(50% + (${techInfo.positionX}rem + ${positionX}px) * ${zoom})`;
         element.style.top = `calc(50% + (${-techInfo.positionY}rem + ${positionY}px) * ${zoom})`;
      }
   }, [techInfo.positionX, techInfo.positionY, positionX, positionY, zoom]);

   const isUnlocked = Game.tribe.hasUnlockedTech(techInfo.id);
   const isSelected = Game.tribe.selectedTechID === techInfo.id;

   const onMouseEnter = (): void => {
      hoveredTechID = techInfo.id;
      setIsHovered(true);
   }

   const onMouseLeave = (): void => {
      hoveredTechID = null;
      setIsHovered(false);
   }

   const onClick = (e: MouseEvent): void => {
      if (e.shiftKey) {
         Client.sendForceUnlockTech(techInfo.id);
      } else if (!isUnlocked) {
         researchTech(techInfo.id);

         const itemTally = getResearchedItems(techInfo);
         addResearchedItems(techInfo, itemTally);
         
         // @Incomplete: attach to camera so it doesn't decrease in loudness
         playSound("item-research.mp3", 0.4, 1, Camera.position.x, Camera.position.y);
      }
   }

   const onRightClick = (e: MouseEvent): void => {
      if (isUnlocked) {
         return;
      }
      
      if (techInfo.researchStudyRequirements > 0) {
         selectTech(techInfo.id);
      }
      e.preventDefault();
   }

   return <>
      <div ref={elementRef} onClick={e => onClick(e.nativeEvent)} onContextMenu={e => onRightClick(e.nativeEvent)} className={`tech${isUnlocked ? " unlocked" : ""}${isSelected ? " selected" : ""}`} onMouseEnter={() => onMouseEnter()} onMouseLeave={() => onMouseLeave()}>
         <div className="icon-wrapper">
            <img src={require("../../../images/tech-tree/" + techInfo.iconSrc)} alt="" className="icon" draggable={false} />
         </div>
      </div>
      {isHovered ? (
         <TechTooltip techInfo={techInfo} techPositionX={positionX} techPositionY={positionY} zoom={zoom} />
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
         setMenuCloseFunction(() => {
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
            if (Player.instance === null) {
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
         return <Tech techInfo={techInfo} positionX={positionX} positionY={positionY} zoom={zoom} key={i} />
      })}
   </div>;
}

export default TechTree;