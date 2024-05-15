"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAbsAngleDiff = exports.getAngleDiff = exports.assertUnreachable = exports.distBetweenPointAndRectangle = exports.smoothstep = exports.pointIsInRectangle = exports.distToSegment = exports.customTickIntervalHasPassed = exports.angle = exports.calculateDistanceSquared = exports.distance = exports.randSign = exports.clamp = exports.clampToBoardDimensions = exports.veryBadHash = exports.curveWeight = exports.roundNum = exports.rotatePoint = exports.rotateYAroundOrigin = exports.rotateXAroundOrigin = exports.rotateYAroundPoint = exports.rotateXAroundPoint = exports.flipAngle = exports.randItem = exports.lerp = exports.Vector = exports.Point = exports.randFloat = exports.randInt = void 0;
/**
 * Returns a random integer inclusively.
 * @param min The minimum value of the random number.
 * @param max The maximum value of the random number.
 * @returns A random integer between the min and max values.
 */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
exports.randInt = randInt;
function randFloat(min, max) {
    return Math.random() * (max - min) + min;
}
exports.randFloat = randFloat;
class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    add(other) {
        this.x += other.x;
        this.y += other.y;
    }
    ;
    subtract(other) {
        this.x -= other.x;
        this.y -= other.y;
    }
    calculateDotProduct(other) {
        return this.x * other.x + this.y * other.y;
    }
    calculateDistanceBetween(other) {
        const xDiff = this.x - other.x;
        const yDiff = this.y - other.y;
        return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
    }
    calculateDistanceSquaredBetween(other) {
        const diffX = this.x - other.x;
        const diffY = this.y - other.y;
        return diffX * diffX + diffY * diffY;
    }
    calculateAngleBetween(other) {
        let angle = Math.atan2(other.y - this.y, other.x - this.x);
        return Math.PI / 2 - angle;
    }
    convertToVector(other) {
        const targetPoint = other || new Point(0, 0);
        const distance = this.calculateDistanceBetween(targetPoint);
        const angle = targetPoint.calculateAngleBetween(this);
        return new Vector(distance, angle);
    }
    copy() {
        return new Point(this.x, this.y);
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    lengthSquared() {
        return this.x * this.x + this.y * this.y;
    }
    package() {
        return [this.x, this.y];
    }
    static unpackage(packagedPoint) {
        return new Point(packagedPoint[0], packagedPoint[1]);
    }
    static fromVectorForm(magnitude, direction) {
        const x = magnitude * Math.sin(direction);
        const y = magnitude * Math.cos(direction);
        return new Point(x, y);
    }
}
exports.Point = Point;
class Vector {
    constructor(magnitude, direction) {
        this.magnitude = magnitude;
        this.direction = direction;
    }
    convertToPoint() {
        // Note: direction is measured clockwise from the positive y axis, so we flip the purposes of sin and cos here
        // (E.g. at theta = 0, we want x = 0, so we use sin)
        const x = Math.sin(this.direction) * this.magnitude;
        const y = Math.cos(this.direction) * this.magnitude;
        return new Point(x, y);
    }
    add(other) {
        const cartesianForm = this.convertToPoint();
        cartesianForm.add(other.convertToPoint());
        const polarForm = cartesianForm.convertToVector();
        this.magnitude = polarForm.magnitude;
        this.direction = polarForm.direction;
    }
    subtract(other) {
        const cartesianForm = this.convertToPoint();
        cartesianForm.subtract(other.convertToPoint());
        const polarForm = cartesianForm.convertToVector();
        this.magnitude = polarForm.magnitude;
        this.direction = polarForm.direction;
    }
    copy() {
        return new Vector(this.magnitude, this.direction);
    }
    static randomUnitVector() {
        const theta = randFloat(0, 2 * Math.PI);
        return new Vector(1, theta);
    }
    package() {
        return [this.magnitude, this.direction];
    }
    normalise() {
        this.magnitude = 1;
    }
    static unpackage(packagedVector) {
        return new Vector(packagedVector[0], packagedVector[1]);
    }
}
exports.Vector = Vector;
function lerp(start, end, amount) {
    return start * (1 - amount) + end * amount;
}
exports.lerp = lerp;
function randItem(arr) {
    if (arr.length === 0)
        throw new Error("Array has no items in it!");
    return arr[Math.floor(Math.random() * arr.length)];
}
exports.randItem = randItem;
function flipAngle(angle) {
    return (angle + Math.PI) % Math.PI;
}
exports.flipAngle = flipAngle;
function rotateXAroundPoint(x, y, pivotX, pivotY, rotation) {
    return Math.cos(rotation) * (x - pivotX) + Math.sin(rotation) * (y - pivotY) + pivotX;
}
exports.rotateXAroundPoint = rotateXAroundPoint;
function rotateYAroundPoint(x, y, pivotX, pivotY, rotation) {
    return -Math.sin(rotation) * (x - pivotX) + Math.cos(rotation) * (y - pivotY) + pivotY;
}
exports.rotateYAroundPoint = rotateYAroundPoint;
function rotateXAroundOrigin(x, y, rotation) {
    return Math.cos(rotation) * x + Math.sin(rotation) * y;
}
exports.rotateXAroundOrigin = rotateXAroundOrigin;
function rotateYAroundOrigin(x, y, rotation) {
    return -Math.sin(rotation) * x + Math.cos(rotation) * y;
}
exports.rotateYAroundOrigin = rotateYAroundOrigin;
function rotatePoint(point, pivotPoint, rotation) {
    const x = Math.cos(rotation) * (point.x - pivotPoint.x) + Math.sin(rotation) * (point.y - pivotPoint.y) + pivotPoint.x;
    const y = -Math.sin(rotation) * (point.x - pivotPoint.x) + Math.cos(rotation) * (point.y - pivotPoint.y) + pivotPoint.y;
    return new Point(x, y);
}
exports.rotatePoint = rotatePoint;
function roundNum(num, dp) {
    const power = Math.pow(10, dp);
    const roundedNum = Math.round((num + 2e-52) * power) / power;
    return roundedNum;
}
exports.roundNum = roundNum;
/**
 * Calculates the curved weight of a given weight value from 0-1
 * Note: the power param must be above 0
 * */
function curveWeight(baseWeight, power, flatWeight) {
    let curvedWeight = -Math.pow(-baseWeight + 1, power) + 1;
    if (typeof flatWeight !== "undefined") {
        curvedWeight += flatWeight * (1 - baseWeight);
    }
    return curvedWeight;
}
exports.curveWeight = curveWeight;
function veryBadHash(seed) {
    let hash = 0;
    for (let i = 0, len = seed.length; i < len; i++) {
        let chr = seed.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
exports.veryBadHash = veryBadHash;
function clampToBoardDimensions(tileCoord) {
    if (tileCoord < 0) {
        return 0;
    }
    if (tileCoord >= 256 /* Settings.BOARD_DIMENSIONS */) {
        return 256 /* Settings.BOARD_DIMENSIONS */ - 1;
    }
    return tileCoord;
}
exports.clampToBoardDimensions = clampToBoardDimensions;
function clamp(num, min, max) {
    if (num < min) {
        return min;
    }
    if (num > max) {
        return max;
    }
    return num;
}
exports.clamp = clamp;
function randSign() {
    return Math.random() < 0.5 ? 1 : 0;
}
exports.randSign = randSign;
function distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}
exports.distance = distance;
function calculateDistanceSquared(x1, y1, x2, y2) {
    const diffX = x1 - x2;
    const diffY = y1 - y2;
    return diffX * diffX + diffY * diffY;
}
exports.calculateDistanceSquared = calculateDistanceSquared;
function angle(x, y) {
    return Math.PI / 2 - Math.atan2(y, x);
}
exports.angle = angle;
function customTickIntervalHasPassed(ticks, intervalSeconds) {
    const ticksPerInterval = intervalSeconds * 60 /* Settings.TPS */;
    const previousCheck = (ticks - 1) / ticksPerInterval;
    const check = ticks / ticksPerInterval;
    return Math.floor(previousCheck) !== Math.floor(check);
}
exports.customTickIntervalHasPassed = customTickIntervalHasPassed;
function sqr(x) { return x * x; }
function dist2(v, w) { return sqr(v.x - w.x) + sqr(v.y - w.y); }
function distToSegmentSquared(p, v, w) {
    var l2 = dist2(v, w);
    if (l2 == 0)
        return dist2(p, v);
    var t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return dist2(p, new Point(v.x + t * (w.x - v.x), v.y + t * (w.y - v.y)));
}
function distToSegment(p, v, w) { return Math.sqrt(distToSegmentSquared(p, v, w)); }
exports.distToSegment = distToSegment;
function pointIsInRectangle(pointX, pointY, rectPosX, rectPosY, rectWidth, rectHeight, rectRotation) {
    // Rotate point around rect to make the situation axis-aligned
    const alignedPointX = rotateXAroundPoint(pointX, pointY, rectPosX, rectPosY, -rectRotation);
    const alignedPointY = rotateYAroundPoint(pointX, pointY, rectPosX, rectPosY, -rectRotation);
    const x1 = rectPosX - rectWidth / 2;
    const x2 = rectPosX + rectWidth / 2;
    const y1 = rectPosY - rectHeight / 2;
    const y2 = rectPosY + rectHeight / 2;
    return alignedPointX >= x1 && alignedPointX <= x2 && alignedPointY >= y1 && alignedPointY <= y2;
}
exports.pointIsInRectangle = pointIsInRectangle;
function smoothstep(value) {
    const clamped = clamp(value, 0, 1);
    return clamped * clamped * (3 - 2 * clamped);
}
exports.smoothstep = smoothstep;
function distBetweenPointAndRectangle(pointX, pointY, rectPosX, rectPosY, rectWidth, rectHeight, rectRotation) {
    // Rotate point around rect to make the situation axis-aligned
    const alignedPointX = rotateXAroundPoint(pointX, pointY, rectPosX, rectPosY, -rectRotation);
    const alignedPointY = rotateYAroundPoint(pointX, pointY, rectPosX, rectPosY, -rectRotation);
    const rectMinX = rectPosX - rectWidth * 0.5;
    const rectMaxX = rectPosX + rectWidth * 0.5;
    const rectMinY = rectPosY - rectHeight * 0.5;
    const rectMaxY = rectPosY + rectHeight * 0.5;
    var dx = Math.max(rectMinX - alignedPointX, 0, alignedPointX - rectMaxX);
    var dy = Math.max(rectMinY - alignedPointY, 0, alignedPointY - rectMaxY);
    return Math.sqrt(dx * dx + dy * dy);
}
exports.distBetweenPointAndRectangle = distBetweenPointAndRectangle;
function assertUnreachable(x) {
    console.warn(x);
    throw new Error("Why must I exist?");
}
exports.assertUnreachable = assertUnreachable;
function getAngleDiff(sourceAngle, targetAngle) {
    let a = targetAngle - sourceAngle;
    a = Math.abs((a + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a;
}
exports.getAngleDiff = getAngleDiff;
function getAbsAngleDiff(sourceAngle, targetAngle) {
    return Math.abs(getAngleDiff(sourceAngle, targetAngle));
}
exports.getAbsAngleDiff = getAbsAngleDiff;
