declare class Particle {
    readonly id: number;
    age: number;
    readonly lifetime: number;
    constructor(lifetime: number);
    getOpacity?(): number;
    getScale?(): number;
}
export default Particle;
