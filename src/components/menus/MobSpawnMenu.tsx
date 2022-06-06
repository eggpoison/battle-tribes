import { ChangeEvent, useCallback, useRef, useState } from "react";
import Board from "../../Board";
import LivingEntity from "../../entities/LivingEntity";
import Player from "../../entities/tribe-members/Player";
import TransformComponent from "../../entity-components/TransformComponent";
import ENTITY_INFO, { MobInfo } from "../../data/entity-info";
import { randFloat, Vector } from "../../utils";

const spawnMobs = (mobInfo: MobInfo, amount: number, offsetRange: [number, number]): void => {
   const mobConstr = mobInfo.getConstr();
   for (let i = 0; i < amount; i++) {
      const playerPostion = Player.instance.getComponent(TransformComponent)!.position;
      
      const offset = randFloat(...offsetRange) * Board.tileSize;
      const offsetVector = Vector.randomUnitVector();
      offsetVector.magnitude *= offset;

      const position = playerPostion.add(offsetVector.convertToPoint());

      const mob = new mobConstr(position) as LivingEntity<MobInfo>;
      mob.setInfo(mobInfo);
      Board.addEntity(mob);
   }
}

type OffsetInputType = "static" | "range";

const MobSpawnMenu = () => {
   const inputSpawnAmountRef = useRef<HTMLInputElement | null>(null);
   const inputSpawnTypeRef = useRef<HTMLSelectElement | null>(null);

   const [offsetInputType, setOffestInputType] = useState<OffsetInputType>("static");

   const offsetInputRangeRef = useRef<HTMLInputElement | null>(null);
   const offsetInputMinRef = useRef<HTMLInputElement | null>(null);
   const offsetInputMaxRef = useRef<HTMLInputElement | null>(null);
   
   const mobTypes = useRef<Array<MobInfo>>(ENTITY_INFO.reduce((previousValue, currentValue) => {
      return currentValue.hasOwnProperty("behaviour") ? previousValue.concat([currentValue as MobInfo]) : previousValue;
   }, new Array<MobInfo>()));

   const spawn = useCallback((): void => {
      const rawMobType = Number(inputSpawnTypeRef.current!.value);
      const mobType = ENTITY_INFO[rawMobType] as MobInfo;

      const amount = Number(inputSpawnAmountRef.current!.value);

      let minOffset!: number;
      let maxOffset!: number;
      if (offsetInputType === "static") {
         minOffset = Number(offsetInputRangeRef.current!.value);
         maxOffset = Number(offsetInputRangeRef.current!.value);
      } else {
         minOffset = Number(offsetInputMinRef.current!.value);
         maxOffset = Number(offsetInputMaxRef.current!.value);
      }

      spawnMobs(mobType, amount, [minOffset, maxOffset]);
   }, [offsetInputType]);

   const changeOffsetInputType = (e: ChangeEvent<HTMLInputElement>): void => {
      setOffestInputType(e.target.checked ? "range" : "static");
   }

   return (
      <div id="mob-spawn-menu">
         <h1>Mob Spawn Menu</h1>

         <div className="formatter">
            <div className="section">
               <h2 className="section-title">Mob Details</h2>

               <div>
                  <label>
                     Type
                     <select ref={inputSpawnTypeRef}>
                        {mobTypes.current.map((info, i) => {
                           const idx = ENTITY_INFO.indexOf(info);
                           const constrName = info.getConstr().name;
                           return <option value={idx} key={i}>{constrName}</option>
                        })}
                     </select>
                  </label>
               </div>

               <div>
                  <label>
                     Amount
                     <input ref={inputSpawnAmountRef} type="range" min={1} max={10} defaultValue={1} />
                  </label>
               </div>
            </div>
            <div className="section">
               <h2 className="section-title">Spawn Position</h2>

               <h3>Offset</h3>

               <div>
                  <span className={`offset-input-type${offsetInputType === "static" ? " selected" : undefined}`}>Static</span>
                  <label className="switch">
                     <input onChange={e => changeOffsetInputType(e)} type="checkbox" defaultChecked={false} />
                     <span className="slider"></span>
                  </label>
                  <span className={`offset-input-type${offsetInputType === "range" ? " selected" : undefined}`}>Range</span>
               </div>

               {offsetInputType === "static" ? (
                  <input ref={offsetInputRangeRef} type="range" min={0} max={10} defaultValue={5} />
               ) : <>
                  <input ref={offsetInputMinRef} type="text" defaultValue={0} /> to <input ref={offsetInputMaxRef} type="text" defaultValue={10} />
               </>}
            </div>
         </div>

         <button onClick={() => spawn()} className="spawn-button">Spawn</button>
      </div>
   );
}

export default MobSpawnMenu;