import Board from "../Board";
import Component from "../Component";
import Entity from "../Entity";
import { Point } from "../utils";
import HealthComponent from "./HealthComponent";
import TransformComponent from "./TransformComponent";


interface BaseAttackInfo {
    getPosition(): Point;
    readonly damage: number;
    readonly duration: number;
}
abstract class BaseAttack implements BaseAttackInfo {
    public abstract readonly type: string;

    public getPosition: () => Point;
    
    public readonly damage: number;
    public readonly duration: number;

    constructor(attackInfo: BaseAttackInfo) {
        this.getPosition = attackInfo.getPosition;
        this.damage = attackInfo.damage;
        this.duration = attackInfo.duration;
    }

    public abstract getAttackedEntities(): Array<Entity>;
}

interface CircleAttackInfo extends BaseAttackInfo {
    readonly radius: number;
}
export class CircleAttack extends BaseAttack implements CircleAttackInfo {
    public readonly type = "circle";

    public readonly radius: number;

    constructor(attackInfo: CircleAttackInfo) {
        super(attackInfo);

        this.radius = attackInfo.radius;
    }

    public startAttack(): void {
        const entitiesToAttack = this.getAttackedEntities();

        for (const entity of entitiesToAttack) {
            // If the entity can be attacked
            const healthComponent = entity.getComponent(HealthComponent);
            if (healthComponent !== null) {
                // Hurt it
                healthComponent.hurt(this.damage);
            }
        }
    }

    public getAttackedEntities(): Array<Entity> {
        return TransformComponent.getNearbyEntities(this.getPosition(), this.radius * Board.tileSize);
    }
}

export type Attack = CircleAttack;

class AttackComponent extends Component {
    private readonly attack: Attack;

    constructor(attack: Attack) {
        super();

        this.attack = attack;
    }

    public startAttack(): void {
        this.attack.startAttack();
        // switch (this.attack.type) {
        //     case "circle": {
        //         // Circle attack
        //         const attackedEntities = TransformComponent.getNearbyEntities(this.attack.getPosition(), this.attack.radius);

        //         for (const entity of attackedEntities) {
        //             // If the entity can be attacked
        //             const healthComponent = entity.getComponent(HealthComponent);
        //             if (healthComponent !== null) {
        //                 healthComponent.hurt(this.attack.damage);
        //             }
        //         }
        //     }
        // }
    }
}

export default AttackComponent;