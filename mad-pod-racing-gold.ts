// ============================================================================
// Constants
// ============================================================================

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
const COLLISION_RADIUS_UNITS = 455

// Thrust decrease value per game tick.
// Used to gradually reduce the pod's thrust over time or in specific conditions.
const THRUST_DECREASE_PER_TICK = 10

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
  thrust?: number | string
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
  nextCheckpointY: number
): IPod {
  return {
    ...pod,
    id,
    posX,
    posY,
    speedX,
    speedY,
    speed: Math.sqrt(speedX * speedX + speedY * speedY),
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

/**
 * Detects if there is a collision between two pods.
 * @param {IPod} pod1 - The first pod.
 * @param {IPod} pod2 - The second pod.
 * @returns {boolean} True if the pods are colliding, false otherwise.
 */
function detectCollision(pod1: IPod, pod2: IPod): boolean {
  // Calculate the distance between the two pods
  const distance = distanceBetween({
    x1: pod1.posX,
    y1: pod1.posY,
    x2: pod2.posX,
    y2: pod2.posY,
  })

  // Log the distance for debugging purposes
  console.error({
    collision: distance < COLLISION_RADIUS_UNITS * 2,
    distance,
    myPodId: pod1.id,
    opponentPodId: pod2.id,
  })

  // Check if the distance is less than twice the collision radius
  return distance < COLLISION_RADIUS_UNITS * 2
}

// ============================================================================
// Controls
// ============================================================================

/**
 * Determines the next action for the pod based on its current state and the game state.
 * @param {IPod} pod - The current pod.
 * @param {IPod} opponentPod1 - The first opponent pod.
 * @param {IPod} opponentPod2 - The second opponent pod.
 * @param {IGame} game - The current game state.
 * @returns {object} The next action including thrust and next coordinates.
 */
function nextAction(
  pod: IPod,
  opponentPod1: IPod,
  opponentPod2: IPod,
  game: IGame
): { thrust: number | string; nextX: number; nextY: number } {
  // Calculate the thrust for the current pod based on its position and game state
  pod.thrust = calculateThrust(pod, game)
  let nextX: number, nextY: number

  // TODO: Implement collision logic with opponent pods.

  // If the pod's speed is above the threshold for effective drifting,
  // calculate the next position with drift effect applied
  if (pod.speed > MINIMUM_DRIFT_SPEED_UNITS) {
    nextX = pod.nextCheckpointX - DRIFT_INTENSITY_FACTOR * pod.speedX
    nextY = pod.nextCheckpointY - DRIFT_INTENSITY_FACTOR * pod.speedY
  } else {
    // If the pod is moving slowly, head directly towards the current checkpoint
    nextX = pod.nextCheckpointX
    nextY = pod.nextCheckpointY
  }

  // Calculate the distance to the next checkpoint from the proposed next position
  const distanceToCheckpoint = distanceBetween({
    x1: nextX,
    y1: nextY,
    x2: pod.nextCheckpointX,
    y2: pod.nextCheckpointY,
  })

  // If the pod has already passed this checkpoint, aim for the next one
  if (pod.distanceNextCheckpoint < distanceToCheckpoint) {
    // Calculate the ID of the next checkpoint
    const nextCheckpointId = (pod.nextCheckpointId + 1) % game.checkpointCount
    // Update the next coordinates to the next checkpoint's position
    nextX = game.checkpoints[nextCheckpointId][0]
    nextY = game.checkpoints[nextCheckpointId][1]
  }

  // Finalize and round the thrust and next position coordinates
  return {
    thrust:
      typeof pod.thrust === "number" ? Math.round(pod.thrust) : pod.thrust,
    nextX: Math.round(nextX),
    nextY: Math.round(nextY),
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
      game.checkpoints[podData.opponentPod1NextCheckpointId][1]
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
      game.checkpoints[podData.opponentPod2NextCheckpointId][1]
    )

    // Determine the next action for each of the player's pods.
    const myPod1Action = nextAction(myPod1, opponentPod1, opponentPod2, game)
    const myPod2Action = nextAction(myPod2, opponentPod1, opponentPod2, game)

    // Log debug information for each pod.
    console.error({
      thrust1: myPod1Action.thrust,
      nextX1: myPod1Action.nextX,
      nextY1: myPod1Action.nextY,
    })
    console.error({
      thrust2: myPod2Action.thrust,
      nextX2: myPod2Action.nextX,
      nextY2: myPod2Action.nextY,
    })

    // Log the current state of the game and pods for debugging.
    console.error({ myPod1, myPod2, game })

    // Output the next action for each of the player's pods.
    console.log(
      `${myPod1Action.nextX} ${myPod1Action.nextY} ${myPod1Action.thrust}`
    )
    console.log(
      `${myPod2Action.nextX} ${myPod2Action.nextY} ${myPod2Action.thrust}`
    )
  }
}

main()
