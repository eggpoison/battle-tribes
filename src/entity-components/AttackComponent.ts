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
    readonly attackingEntity: Entity;
}
abstract class BaseAttack implements BaseAttackInfo {
    public abstract readonly type: string;

    public getPosition: () => Point;
    
    public readonly damage: number;
    public readonly duration: number;
    public readonly attackingEntity: Entity;

    constructor(attackInfo: BaseAttackInfo) {
        this.getPosition = attackInfo.getPosition;
        this.damage = attackInfo.damage;
        this.duration = attackInfo.duration;
        this.attackingEntity = attackInfo.attackingEntity;
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
            // Don't attack yourself
            if (entity === this.attackingEntity) continue;

            // If the entity can be attacked
            const healthComponent = entity.getComponent(HealthComponent);
            if (healthComponent !== null) {
                // Hurt it
                healthComponent.hurt(this.damage, this.attackingEntity);
            }
        }
    }

    public getAttackedEntities(): Array<Entity> {
        return TransformComponent.getNearbyEntities(this.getPosition(), this.radius * Board.tileSize);
    }
}

export type Attack = CircleAttack;

class AttackComponent extends Component {
    private readonly attacks: { [key: string]: Attack } = {};

    public startAttack(id: string): void {
        this.attacks[id].startAttack();
    }

    public addAttack(id: string, attack: Attack): void {
        this.attacks[id] = attack;
    }
}

export default AttackComponent;