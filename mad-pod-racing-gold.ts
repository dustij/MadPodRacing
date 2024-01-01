// ============================================================================
// Constants
// ============================================================================

// Friction factor for the game.
// Used to gradually reduce the pod's speed over time.
const FRICTION_FACTOR = 0.85

// Angle threshold for using boost in degrees.
// Represents the maximum angle at which the pod can effectively use its boost.
const MAX_BOOST_ANGLE_DEGREES = 15

// Braking distance in game units.
// This is the distance at which the pod begins to brake before reaching a target or obstacle.
const TARGET_BRAKING_DISTANCE_UNITS = 2000

// Minimum speed required to initiate a drift, in game speed units.
// Below this speed, drifting is ineffective.
const MINIMUM_DRIFT_SPEED_UNITS = 100

// Drift intensity factor.
// Higher values increase the effect of drifting on the pod's movement.
const DRIFT_INTENSITY_FACTOR = 4

// Factor influencing the pod's behavior based on distance to the next target.
// Used to adjust thrust and steering based on proximity to targets.
const TARGET_DISTANCE_FACTOR = 2

// Radius around checkpoints in game units.
// Defines the area within which the pod needs to be to successfully pass a checkpoint.
const CHECKPOINT_RADIUS_UNITS = 600

// Speed threshold for collision detection in game speed units.
// Speeds above this threshold trigger collision logic.
const COLLISION_DETECTION_SPEED_THRESHOLD = 300

// Collision radius for a pod in game units.
// Defines the distance at which two pods are considered to be colliding.
const COLLISION_RADIUS_UNITS = 400

// Collision benefit threshold in game units.
// Defines the score at which a collision is considered beneficial.
const COLLISION_DECRIMENT_THRESHOLD = 10

// Thrust decrease value per game tick.
// Used to gradually reduce the pod's thrust over time or in specific conditions.
const THRUST_DECREASE_PER_TICK = 10

// Speed at which to stop correcting.
// Used to stop correcting the pod's position after a collision.
const CORRECTION_SPEED_THRESHOLD = 100

// ============================================================================
// Geometry
// ============================================================================

/**
 * Calculates the Euclidean distance between two points.
 * @param {number} x1 - The x-coordinate of the first point.
 * @param {number} y1 - The y-coordinate of the first point.
 * @param {number} x2 - The x-coordinate of the second point.
 * @param {number} y2 - The y-coordinate of the second point.
 * @returns {number} The distance between the two points.
 */
function distanceBetween({
  x1,
  y1,
  x2,
  y2,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
}): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

/**
 * Calculates the relative angle to a checkpoint from a pod's position and direction.
 * @param {number} podX - The x-coordinate of the pod.
 * @param {number} podY - The y-coordinate of the pod.
 * @param {number} checkpointX - The x-coordinate of the checkpoint.
 * @param {number} checkpointY - The y-coordinate of the checkpoint.
 * @param {number} podDirection - The current direction of the pod in degrees.
 * @returns {number} The relative angle from the pod to the checkpoint.
 */
function angleToCheckpoint(
  podX: number,
  podY: number,
  checkpointX: number,
  checkpointY: number,
  podDirection: number
): number {
  // Calculate the angle between the pod and the checkpoint
  const deltaX = checkpointX - podX
  const deltaY = checkpointY - podY
  let angleToCheckpoint = (Math.atan2(deltaY, deltaX) * 180) / Math.PI

  // Adjust the angle based on the pod's current direction and normalize it
  return normalizeAngle(angleToCheckpoint - podDirection)
}

/**
 * Normalizes an angle to be within the range of -180 to 180 degrees.
 * @param {number} angle - The angle to normalize.
 * @returns {number} The normalized angle.
 */
function normalizeAngle(angle: number): number {
  angle %= 360
  if (angle > 180) {
    angle -= 360
  } else if (angle < -180) {
    angle += 360
  }
  return angle
}

// ============================================================================
// Pod
// ============================================================================

/**
 * Interface representing the state of a pod in a simulation.
 */
interface IPod {
  id: number
  posX: number
  posY: number
  speedX: number
  prevSpeedX: number
  prevSpeedY: number
  speedY: number
  speed: number
  angle: number
  nextCheckpointId: number
  nextCheckpointX: number
  nextCheckpointY: number
  distanceNextCheckpoint: number
  angleNextCheckpoint: number
  currentLap: number
  boostUsed: boolean
  shieldUsed: boolean
  isOpponent: boolean
  thrust?: number | string
  isCorrecting?: boolean
  targetX?: number
  targetY?: number
}

/**
 * Initializes a pod with default values.
 * @returns {IPod} The initialized pod.
 */
function initializePod(): IPod {
  return {
    id: 0,
    posX: 0,
    posY: 0,
    speedX: 0,
    speedY: 0,
    prevSpeedX: 0,
    prevSpeedY: 0,
    speed: 0,
    angle: 0,
    nextCheckpointId: 0,
    nextCheckpointX: 0,
    nextCheckpointY: 0,
    distanceNextCheckpoint: 0,
    angleNextCheckpoint: 0,
    currentLap: 0,
    boostUsed: false,
    shieldUsed: false,
    isOpponent: false,
    isCorrecting: false,
    targetX: 0,
    targetY: 0,
  }
}

/**
 * Updates the state of a pod based on new positional and checkpoint information.
 * @param {IPod} pod - The original pod state.
 * @param {...} other parameters - Detailed description for each.
 * @returns {IPod} The updated pod state.
 */
function updatePod(
  pod: IPod,
  id: number,
  posX: number,
  posY: number,
  speedX: number,
  speedY: number,
  angle: number,
  nextCheckpointId: number,
  nextCheckpointX: number,
  nextCheckpointY: number,
  isOpponent: boolean = false
): IPod {
  return {
    ...pod,
    id,
    posX,
    posY,
    speedX,
    speedY,
    speed: Math.round(Math.sqrt(speedX * speedX + speedY * speedY)),
    angle,
    nextCheckpointId,
    nextCheckpointX,
    nextCheckpointY,
    distanceNextCheckpoint: distanceBetween({
      x1: posX,
      y1: posY,
      x2: nextCheckpointX,
      y2: nextCheckpointY,
    }),
    angleNextCheckpoint: angleToCheckpoint(
      posX,
      posY,
      nextCheckpointX,
      nextCheckpointY,
      angle
    ),
    isOpponent,
  }
}

// ============================================================================
// Game
// ============================================================================

/**
 * Interface representing the state of a game, including laps, checkpoints, and optimal boost points.
 */
interface IGame {
  laps: number
  checkpointCount: number
  checkpoints: { [id: number]: [number, number] }
  optimalBoostCheckpointId: number
}

/**
 * Initializes a game by reading lap and checkpoint information.
 * @returns {IGame} The initialized game state.
 */
function initializeGame(): IGame {
  // @ts-ignore
  const laps: number = parseInt(readline())
  // @ts-ignore
  const checkpointCount: number = parseInt(readline())

  const checkpoints = initializeCheckpoints(checkpointCount)
  const optimalBoostCheckpointId = findOptimalBoostCheckpoint(
    checkpoints,
    checkpointCount
  )

  return { laps, checkpointCount, checkpoints, optimalBoostCheckpointId }
}

/**
 * Initializes checkpoints for the game.
 * @param {number} checkpointCount - The number of checkpoints.
 * @returns {object} The initialized checkpoints.
 */
function initializeCheckpoints(checkpointCount: number): {
  [id: number]: [number, number]
} {
  const checkpoints: { [id: number]: [number, number] } = {}
  for (let i = 0; i < checkpointCount; i++) {
    // @ts-ignore
    const inputs: string[] = readline().split(" ")
    const checkpointX: number = parseInt(inputs[0])
    const checkpointY: number = parseInt(inputs[1])
    checkpoints[i] = [checkpointX, checkpointY]
  }
  return checkpoints
}

/**
 * Finds the checkpoint with the maximum distance to the next checkpoint, suggesting optimal boost usage.
 * @param {object} checkpoints - The checkpoints.
 * @param {number} checkpointCount - The number of checkpoints.
 * @returns {number} The ID of the optimal boost checkpoint.
 */
function findOptimalBoostCheckpoint(
  checkpoints: { [id: number]: [number, number] },
  checkpointCount: number
): number {
  const distances = Object.keys(checkpoints).map((key) => {
    const i = parseInt(key)
    return distanceBetween({
      x1: checkpoints[i][0],
      y1: checkpoints[i][1],
      x2: checkpoints[(i + 1) % checkpointCount][0],
      y2: checkpoints[(i + 1) % checkpointCount][1],
    })
  })

  const maxDistanceIndex = distances.indexOf(Math.max(...distances))
  return (maxDistanceIndex + 1) % checkpointCount
}

/**
 * Reads input data for all pods, including position, speed, and next checkpoint.
 * @returns {object} The current state of all pods in the game.
 */
function getInput() {
  const podData = initializePodDataStructure()

  for (let i = 0; i < 2; i++) {
    updatePodData(podData, i, true) // Update myPods
  }

  for (let i = 0; i < 2; i++) {
    updatePodData(podData, i, false) // Update opponentPods
  }

  return podData
}

/**
 * Initializes data structure to store state of all pods.
 * @returns {object} The initialized data structure for pod state.
 */
function initializePodDataStructure() {
  return {
    myPod1Id: 0,
    myPod1PosX: 0,
    myPod1PosY: 0,
    myPod1SpeedX: 0,
    myPod1SpeedY: 0,
    myPod1Angle: 0,
    myPod1NextCheckpointId: 0,
    myPod2Id: 0,
    myPod2PosX: 0,
    myPod2PosY: 0,
    myPod2SpeedX: 0,
    myPod2SpeedY: 0,
    myPod2Angle: 0,
    myPod2NextCheckpointId: 0,
    opponentPod1Id: 0,
    opponentPod1PosX: 0,
    opponentPod1PosY: 0,
    opponentPod1SpeedX: 0,
    opponentPod1SpeedY: 0,
    opponentPod1Angle: 0,
    opponentPod1NextCheckpointId: 0,
    opponentPod2Id: 0,
    opponentPod2PosX: 0,
    opponentPod2PosY: 0,
    opponentPod2SpeedX: 0,
    opponentPod2SpeedY: 0,
    opponentPod2Angle: 0,
    opponentPod2NextCheckpointId: 0,
  }
}

/**
 * Updates the pod data based on input.
 * @param {object} podData - The data structure storing pod states.
 * @param {number} index - The index of the pod.
 * @param {boolean} isMyPod - True if it's the player's pod, false for the opponent's pod.
 */
function updatePodData(podData: any, index: number, isMyPod: boolean) {
  // @ts-ignore
  const inputs: string[] = readline().split(" ")
  const [x, y, vx, vy, angle, nextCheckPointId] = inputs.map(Number)

  const podPrefix = isMyPod ? "myPod" : "opponentPod"
  const podId = isMyPod ? index + 1 : index + 1

  podData[`${podPrefix}${podId}Id`] = podId
  podData[`${podPrefix}${podId}PosX`] = x
  podData[`${podPrefix}${podId}PosY`] = y
  podData[`${podPrefix}${podId}SpeedX`] = vx
  podData[`${podPrefix}${podId}SpeedY`] = vy
  podData[`${podPrefix}${podId}Angle`] = angle
  podData[`${podPrefix}${podId}NextCheckpointId`] = nextCheckPointId
}

// ============================================================================
// Collision
// ============================================================================

type Vector = {
  x: number
  y: number
}

// /**
//  * Calculates the future position of a pod after one turn.
//  * @param {IPod} pod - The pod for which to calculate the future position.
//  * @returns {object} The future position { x: number, y: number } of the pod.
//  */
// function calculateFuturePosition(pod: IPod): { x: number; y: number } {
//   // Calculate future position based on current speed and position
//   const futurePosX = pod.posX + pod.speedX
//   const futurePosY = pod.posY + pod.speedY

//   return { x: futurePosX, y: futurePosY }
// }

// Other class and type definitions remain the same

function getCollisionAngle(pod1: IPod, pod2: IPod): number {
  const dx = pod2.posX - pod1.posX
  const dy = pod2.posY - pod1.posY
  return Math.atan2(dy, dx)
}

function rotateVector(vector: Vector, angle: number): Vector {
  return {
    x: vector.x * Math.cos(angle) - vector.y * Math.sin(angle),
    y: vector.x * Math.sin(angle) + vector.y * Math.cos(angle),
  }
}

function updateVelocityAfterCollisionWithAngle(pod1: IPod, pod2: IPod): void {
  const angle = getCollisionAngle(pod1, pod2)

  // Rotate velocities to line of impact
  const pod1Velocity = { x: pod1.speedX, y: pod1.speedY }
  const pod2Velocity = { x: pod2.speedX, y: pod2.speedY }
  const u1 = rotateVector(pod1Velocity, -angle)
  const u2 = rotateVector(pod2Velocity, -angle)

  // Apply 1D elastic collision equations (assuming equal masses)
  const v1x = u2.x
  const v2x = u1.x

  // Rotate velocities back
  const v1 = rotateVector({ x: v1x, y: u1.y }, angle)
  const v2 = rotateVector({ x: v2x, y: u2.y }, angle)

  // Update velocities
  pod1.speedX = v1.x
  pod1.speedY = v1.y
  pod2.speedX = v2.x
  pod2.speedY = v2.y
}

function ellasticCollision(myPod: IPod, otherPod: IPod) {
  // Decompose velocities
  const u1x = myPod.speedX
  const u1y = myPod.speedY
  const u2x = otherPod.speedX
  const u2y = otherPod.speedY

  // Conservation of momentum (simplified for equal masses)
  const v1x = u2x
  const v1y = u2y
  const v2x = u1x
  const v2y = u1y

  // Update velocities
  updateVelocityAfterCollisionWithAngle(myPod, otherPod)

  // Calculate future positions
  const myPodFuturePosition = {
    x: myPod.posX + myPod.speedX,
    y: myPod.posY + myPod.speedY,
  }
  const otherPodFuturePosition = {
    x: otherPod.posX + otherPod.speedX,
    y: otherPod.posY + otherPod.speedY,
  }

  return [myPodFuturePosition, otherPodFuturePosition]
}

// may be usefel?
// Calculate the relative velocity of the pods
// const relativeVelocityX = myPod.speedX - otherPod.speedX
// const relativeVelocityY = myPod.speedY - otherPod.speedY

// // Calculate the distance between the two pods
// const distance = distanceBetween({
//   x1: myPod.posX,
//   y1: myPod.posY,
//   x2: otherPod.posX,
//   y2: otherPod.posY,
// })

// // Calculate the normal vector between the two pods
// const normalVectorX = (otherPod.posX - myPod.posX) / distance
// const normalVectorY = (otherPod.posY - myPod.posY) / distance

// // Calculate the impulse
// const impulse =
//   (2 *
//     (relativeVelocityX * normalVectorX + relativeVelocityY * normalVectorY)) /
//   (myPod.mass + otherPod.mass)

// // Calculate the new speed of the pods
// const newSpeedX = myPod.speedX + impulse * otherPod.mass * normalVectorX
// const newSpeedY = myPod.speedY + impulse * otherPod.mass * normalVectorY

/**
 * Detects if there is a collision between two pods.
 * @param {IPod} myPod - The first pod.
 * @param {IPod} otherPod - The second pod.
 * @returns {boolean} True if the pods are colliding, false otherwise.
 */
function detectCollision(myPod: IPod, otherPod: IPod): boolean {
  const myPodNextPosX = myPod.posX + myPod.speedX * FRICTION_FACTOR
  const myPodNextPosY = myPod.posY + myPod.speedY * FRICTION_FACTOR
  const otherPodNextPosX = otherPod.posX + otherPod.speedX * FRICTION_FACTOR
  const otherPodNextPosY = otherPod.posY + otherPod.speedY * FRICTION_FACTOR

  // Calculate the distance between the two pods
  const distance = distanceBetween({
    x1: myPodNextPosX,
    y1: myPodNextPosY,
    x2: otherPodNextPosX,
    y2: otherPodNextPosY,
  })

  // Check if the distance is less than twice the collision radius
  return distance <= COLLISION_RADIUS_UNITS * 2
}

/**
 * Detects if a collision between two pods is beneficial.
 * @param {IPod} myPod - The first pod.
 * @param {IPod} otherPod - The second pod.
 * @param {IGame} game - The current game state.
 * @returns {number} The collision benefit score.
 */
function collisionBenefitScore(
  myPod: IPod,
  otherPod: IPod,
  game: IGame
): number {
  const baseDistance = distanceBetween({
    x1: myPod.posX,
    y1: myPod.posY,
    x2: game.checkpoints[myPod.nextCheckpointId][0],
    y2: game.checkpoints[myPod.nextCheckpointId][1],
  })

  const heuristicNextPosX =
    myPod.posX +
    myPod.speedX * FRICTION_FACTOR +
    otherPod.speedX * FRICTION_FACTOR
  const heuristicNextPosY =
    myPod.posY +
    myPod.speedY * FRICTION_FACTOR +
    otherPod.speedY * FRICTION_FACTOR

  const heuristicDistance = distanceBetween({
    x1: game.checkpoints[myPod.nextCheckpointId][0],
    y1: game.checkpoints[myPod.nextCheckpointId][1],
    x2: heuristicNextPosX,
    y2: heuristicNextPosY,
  })

  return baseDistance - heuristicDistance
}

/**
 * Adjusts the pod's position after a collision by steering in the opposite direction of the impact.
 * @param {IPod} myPod - The pod experiencing the collision.
 * @param {IPod} otherPod - The other pod involved in the collision.
 * @returns {[number, number]} The next position coordinates (nextX, nextY).
 */
function adjustPositionAfterCollision(
  myPod: IPod,
  otherPod: IPod
): [number, number] {
  console.error("ADJUSTING POSITION AFTER COLLISION")
  myPod.isCorrecting = true

  // Determine the opposite direction
  const oppositeDirection = { x: -myPod.prevSpeedX, y: -myPod.prevSpeedY }

  // Apply maximum thrust in the opposite direction to slow down
  myPod.thrust = 100

  // Calculate the next position based on the opposite direction
  // TODO: You may need to convert the direction to a vector and apply it to the current position.
  let nextX = myPod.posX + oppositeDirection.x * 10
  let nextY = myPod.posY + oppositeDirection.y * 10

  return [nextX, nextY]
}

// ============================================================================
// Controls
// ============================================================================

/**
 * Determines the next action for the pod based on its current state and the game state.
 * @param {IPod} pod - The current pod.
 * @param {IPod} myOtherPod - The player's other pod.
 * @param {IPod} opponentPod1 - The first opponent pod.
 * @param {IPod} opponentPod2 - The second opponent pod.
 * @param {IGame} game - The current game state.
 * @returns {object} The next action including thrust and next coordinates.
 */
function nextAction(
  pod: IPod,
  myOtherPod: IPod,
  opponentPod1: IPod,
  opponentPod2: IPod,
  game: IGame
): { thrust: number | string; targetX: number; targetY: number } {
  // Initialize basic thrust and next coordinates
  pod.thrust = calculateThrust(pod, game)

  console.error({ pod: pod.id, thrust: pod.thrust, speed: pod.speed })

  if (pod.isCorrecting) {
    console.error("CORRECTING POSITION")
    if (pod.speed >= CORRECTION_SPEED_THRESHOLD) {
      pod.isCorrecting = false
    }
  }

  // if (pod.isCorrecting) {
  //   console.error("CORRECTING POSITION", "speed:", pod.speed)
  //   if (pod.speed >= CORRECTION_SPEED_THRESHOLD) {
  //     pod.isCorrecting = false
  //   }
  //   // return {
  //   //   thrust:
  //   //     typeof pod.thrust === "number" ? Math.round(pod.thrust) : pod.thrust,
  //   //   nextX: Math.round(pod.directionX ?? pod.nextCheckpointX),
  //   //   nextY: Math.round(pod.directionY ?? pod.nextCheckpointY),
  //   // }
  // }

  // pod.directionX = pod.nextCheckpointX
  // pod.directionY = pod.nextCheckpointY

  // Detect potential collisions
  const collisionWithOpponent1 = detectCollision(pod, opponentPod1)
  if (collisionWithOpponent1) {
    const opponent1BenefitScore = collisionBenefitScore(opponentPod1, pod, game)
    console.error(`COLLISION - Opponent 1`)
    console.error({ ellasticCollision: ellasticCollision(pod, opponentPod1) })
    pod.thrust = "SHIELD"
    pod.shieldUsed = true
  }

  const collisionWithOpponent2 = detectCollision(pod, opponentPod2)
  if (collisionWithOpponent2) {
    const opponent2BenefitScore = collisionBenefitScore(opponentPod2, pod, game)
    console.error(`COLLISION`)
    console.error({ ellasticCollision: ellasticCollision(pod, opponentPod2) })
    pod.thrust = "SHIELD"
    pod.shieldUsed = true
  }

  const collisionWithAlly = detectCollision(pod, myOtherPod)
  if (collisionWithAlly) {
    console.error("COLLISION DETECTED - Ally")
  }

  // // Collision handling logic
  // if (collisionWithOpponent || collisionWithAlly) {
  //   console.error("COLLISION DETECTED")

  //   console.error({ collisionWithOpponent, collisionWithAlly })
  //   // TODO: You can replace this with more sophisticated logic based on your game's mechanics, such as: offensive vs. defensive, if impulse is large enough, etc.
  //   if (collisionWithOpponent) {
  //     if (collisionWithOpponent1) {
  //       const scoreReportedByOpponent1 = collisionBenefitScore(
  //         opponentPod1,
  //         pod,
  //         game
  //       )

  //       const scoreReportedByMyPod = collisionBenefitScore(
  //         pod,
  //         opponentPod1,
  //         game
  //       )

  //       console.error({ myPod: pod.id, oppPod: opponentPod1.id })
  //       console.error({ scoreReportedByOpponent1, scoreReportedByMyPod })

  //       // Beneficial shield activation
  //       if (!pod.shieldUsed) {
  //         if (scoreReportedByOpponent1 < -COLLISION_DECRIMENT_THRESHOLD) {
  //           pod.shieldUsed = true
  //           pod.thrust = "SHIELD"
  //           console.error("SHIELD ACTIVATED")
  //         } else if (scoreReportedByMyPod < -COLLISION_DECRIMENT_THRESHOLD) {
  //           pod.shieldUsed = true
  //           pod.thrust = "SHIELD"
  //           console.error("SHIELD ACTIVATED")
  //         }
  //       }

  //       if (scoreReportedByMyPod > COLLISION_DECRIMENT_THRESHOLD) {
  //         // Adjust position to correct for collision
  //         ;[pod.directionX, pod.directionY] = adjustPositionAfterCollision(
  //           pod,
  //           myOtherPod
  //         )
  //       }
  //     } else {
  //       // collisionWithOpponent2
  //       const scoreReportedByOpponent2 = collisionBenefitScore(
  //         opponentPod2,
  //         pod,
  //         game
  //       )

  //       const scoreReportedByMyPod = collisionBenefitScore(
  //         pod,
  //         opponentPod2,
  //         game
  //       )

  //       console.error({ myPod: pod.id, oppPod: opponentPod2.id })
  //       console.error({ scoreReportedByOpponent2, scoreReportedByMyPod })

  //       // Beneficial shield activation
  //       if (!pod.shieldUsed) {
  //         if (scoreReportedByOpponent2 < -COLLISION_DECRIMENT_THRESHOLD) {
  //           pod.shieldUsed = true
  //           pod.thrust = "SHIELD"
  //           console.error("SHIELD ACTIVATED")
  //         } else if (scoreReportedByMyPod < -COLLISION_DECRIMENT_THRESHOLD) {
  //           pod.shieldUsed = true
  //           pod.thrust = "SHIELD"
  //           console.error("SHIELD ACTIVATED")
  //         }
  //       }

  //       if (scoreReportedByMyPod > COLLISION_DECRIMENT_THRESHOLD) {
  //         // Adjust position to correct for collision
  //         ;[pod.directionX, pod.directionY] = adjustPositionAfterCollision(
  //           pod,
  //           myOtherPod
  //         )
  //       }
  //     }
  //   } else {
  //     // Collision with ally
  //     const scoreReportedByMyPod = collisionBenefitScore(pod, myOtherPod, game)

  //     if (scoreReportedByMyPod > COLLISION_DECRIMENT_THRESHOLD) {
  //       // Adjust position to correct for collision
  //       ;[pod.directionX, pod.directionY] = adjustPositionAfterCollision(
  //         pod,
  //         myOtherPod
  //       )
  //     }
  //   }
  // } else {

  // Target correction logic
  if (pod.speed > MINIMUM_DRIFT_SPEED_UNITS) {
    pod.targetX = pod.nextCheckpointX - DRIFT_INTENSITY_FACTOR * pod.speedX
    pod.targetY = pod.nextCheckpointY - DRIFT_INTENSITY_FACTOR * pod.speedY
  } else {
    pod.targetX = pod.nextCheckpointX
    pod.targetY = pod.nextCheckpointY
  }
  // }

  // Check if the pod is passing the current checkpoint and aim for the next one
  const distanceTargetToCheckpoint = distanceBetween({
    x1: pod.targetX,
    y1: pod.targetY,
    x2: pod.nextCheckpointX,
    y2: pod.nextCheckpointY,
  })

  if (pod.distanceNextCheckpoint < distanceTargetToCheckpoint) {
    const nextCheckpointId = (pod.nextCheckpointId + 1) % game.checkpointCount
    pod.targetX = game.checkpoints[nextCheckpointId][0]
    pod.targetY = game.checkpoints[nextCheckpointId][1]
  }

  // Finalize and round the thrust and position coordinates
  return {
    thrust:
      typeof pod.thrust === "number" ? Math.round(pod.thrust) : pod.thrust,
    targetX: Math.round(pod.targetX),
    targetY: Math.round(pod.targetY),
  }
}

/**
 * Calculates the appropriate thrust for a pod based on its current state and game conditions.
 * @param {IPod} pod - The current pod.
 * @param {IGame} game - The current game state.
 * @returns {number | string} The calculated thrust value or "BOOST".
 */
function calculateThrust(pod: IPod, game: IGame): number | string {
  // Check if the pod can use a boost:
  // Conditions for boost are:
  // 1. The pod's angle to the next checkpoint is within the maximum boost angle.
  // 2. The pod is heading towards the optimal boost checkpoint.
  // 3. The pod has not used its boost yet.
  if (
    Math.abs(pod.angleNextCheckpoint) < MAX_BOOST_ANGLE_DEGREES &&
    pod.nextCheckpointId === game.optimalBoostCheckpointId &&
    !pod.boostUsed
  ) {
    pod.boostUsed = true // Mark the boost as used
    return "BOOST" // Return "BOOST" as the thrust command
  }

  // Start with maximum thrust
  let thrust = 100

  // Adjust thrust based on the pod's angle to the next checkpoint.
  // The closer the angle to 90 degrees, the less thrust is applied.
  if (Math.abs(pod.angleNextCheckpoint) < 90) {
    thrust *= 1 - Math.abs(pod.angleNextCheckpoint) / 90
  }

  // Further adjust thrust based on the distance to the next checkpoint.
  // As the pod gets closer to the checkpoint, reduce thrust to brake effectively.
  if (
    pod.distanceNextCheckpoint <
    TARGET_DISTANCE_FACTOR * CHECKPOINT_RADIUS_UNITS
  ) {
    const brakingFactor =
      pod.distanceNextCheckpoint /
      (TARGET_DISTANCE_FACTOR * CHECKPOINT_RADIUS_UNITS)
    thrust *= brakingFactor // Apply braking factor to reduce thrust
  }

  // Round the thrust value to the nearest integer and return it
  return Math.round(thrust)
}

// ============================================================================
// Main
// ============================================================================

/**
 * The main game loop.
 */
function main() {
  // Initialize the game and all pods.
  let game: IGame = initializeGame()
  let myPod1: IPod = initializePod()
  let myPod2: IPod = initializePod()
  let opponentPod1: IPod = initializePod()
  let opponentPod2: IPod = initializePod()

  // The main loop of the game.
  while (true) {
    // Read and update the game state based on the current input.
    const podData = getInput()

    // Update previous speed values for each pod.
    myPod1.prevSpeedX = myPod1.speedX
    myPod1.prevSpeedY = myPod1.speedY
    myPod2.prevSpeedX = myPod2.speedX
    myPod2.prevSpeedY = myPod2.speedY
    opponentPod1.prevSpeedX = opponentPod1.speedX
    opponentPod1.prevSpeedY = opponentPod1.speedY
    opponentPod2.prevSpeedX = opponentPod2.speedX
    opponentPod2.prevSpeedY = opponentPod2.speedY

    // Update the state of each pod with the latest data.
    myPod1 = updatePod(
      myPod1,
      podData.myPod1Id,
      podData.myPod1PosX,
      podData.myPod1PosY,
      podData.myPod1SpeedX,
      podData.myPod1SpeedY,
      podData.myPod1Angle,
      podData.myPod1NextCheckpointId,
      game.checkpoints[podData.myPod1NextCheckpointId][0],
      game.checkpoints[podData.myPod1NextCheckpointId][1]
    )

    myPod2 = updatePod(
      myPod2,
      podData.myPod2Id,
      podData.myPod2PosX,
      podData.myPod2PosY,
      podData.myPod2SpeedX,
      podData.myPod2SpeedY,
      podData.myPod2Angle,
      podData.myPod2NextCheckpointId,
      game.checkpoints[podData.myPod2NextCheckpointId][0],
      game.checkpoints[podData.myPod2NextCheckpointId][1]
    )

    opponentPod1 = updatePod(
      opponentPod1,
      podData.opponentPod1Id,
      podData.opponentPod1PosX,
      podData.opponentPod1PosY,
      podData.opponentPod1SpeedX,
      podData.opponentPod1SpeedY,
      podData.opponentPod1Angle,
      podData.opponentPod1NextCheckpointId,
      game.checkpoints[podData.opponentPod1NextCheckpointId][0],
      game.checkpoints[podData.opponentPod1NextCheckpointId][1],
      true
    )

    opponentPod2 = updatePod(
      opponentPod2,
      podData.opponentPod2Id,
      podData.opponentPod2PosX,
      podData.opponentPod2PosY,
      podData.opponentPod2SpeedX,
      podData.opponentPod2SpeedY,
      podData.opponentPod2Angle,
      podData.opponentPod2NextCheckpointId,
      game.checkpoints[podData.opponentPod2NextCheckpointId][0],
      game.checkpoints[podData.opponentPod2NextCheckpointId][1],
      true
    )

    // Log debugging.
    console.error({ pod: myPod1.id, vx: myPod1.speedX, vy: myPod1.speedY })
    console.error({ pod: myPod2.id, vx: myPod2.speedX, vy: myPod2.speedY })

    // Determine the next action for each of the player's pods.
    const myPod1Action = nextAction(
      myPod1,
      myPod2,
      opponentPod1,
      opponentPod2,
      game
    )
    const myPod2Action = nextAction(
      myPod2,
      myPod1,
      opponentPod1,
      opponentPod2,
      game
    )

    // Log debugging.
    console.error({
      pod: myPod1.id,
      boostUsed: myPod1.boostUsed,
      shieldUsed: myPod1.shieldUsed,
    })
    console.error({
      pod: myPod2.id,
      boostUsed: myPod2.boostUsed,
      shieldUsed: myPod2.shieldUsed,
    })

    // Output the next action for each of the player's pods.
    console.log(
      `${myPod1Action.targetX} ${myPod1Action.targetY} ${myPod1Action.thrust}`
    )
    console.log(
      `${myPod2Action.targetX} ${myPod2Action.targetY} ${myPod2Action.thrust}`
    )
  }
}

main()
