// Constants ================================================================
const BOOST_ANGLE = 15
const BRAKING_DISTANCE = 2000
const DRIFT_MIN_SPEED = 100
const DRIFT_FACTOR = 3
const DISTANCE_FACTOR = 2
const CP_RADIUS = 600

// Controls ================================================================

function turn(
  pod: IPod,
  game: IGame
): {
  thrust: number
  nextX: number
  nextY: number
} {
  let thrust = calculateThrust(pod, game)
  let nextX: number, nextY: number

  if (pod.speed > DRIFT_MIN_SPEED) {
    nextX = pod.currCheckpointX - DRIFT_FACTOR * pod.speedX
    nextY = pod.currCheckpointY - DRIFT_FACTOR * pod.speedY
  } else {
    nextX = pod.currCheckpointX
    nextY = pod.currCheckpointY
  }

  return { thrust, nextX, nextY }
}

function calculateThrust(pod: IPod, game: IGame): number {
  let thrust = 100

  if (Math.abs(pod.angle) < 90) {
    thrust *= 1 - Math.abs(pod.angle) / 90
  }

  if (pod.distanceNextCheckpoint < DISTANCE_FACTOR * CP_RADIUS) {
    const brakingFactor =
      pod.distanceNextCheckpoint / (DISTANCE_FACTOR * CP_RADIUS)
    console.error({ brakingFactor })
    thrust *= brakingFactor
  }

  return Math.round(thrust)
}

// Geometry ================================================================

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
}

// Pods ================================================================

interface IPod {
  posX: number
  posY: number
  speedX: number
  speedY: number
  speed: number
  angle: number
  currCheckpointId: number
  currCheckpointX: number
  currCheckpointY: number
  distanceNextCheckpoint: number
  currentLap: number
  booseUsed: boolean
  shieldUsed: boolean
}

function initializePod(): IPod {
  return {
    posX: 0,
    posY: 0,
    speedX: 0,
    speedY: 0,
    speed: 0,
    angle: 0,
    currCheckpointId: 0,
    currCheckpointX: 0,
    currCheckpointY: 0,
    distanceNextCheckpoint: 0,
    currentLap: 0,
    booseUsed: false,
    shieldUsed: false,
  }
}

function updatePod(
  pod: IPod,
  posX: number,
  posY: number,
  speedX: number,
  speedY: number,
  angle: number,
  nextCheckpointId: number,
  nextCheckpointX: number,
  nextCheckpointY: number
): IPod {
  let updatedPod = updatePodPosition(pod, posX, posY)
  updatedPod = updatePodSpeed(updatedPod, speedX, speedY)
  updatedPod = updatePodAngle(updatedPod, angle)
  updatedPod = updatePodCurrCheckpoint(
    updatedPod,
    nextCheckpointId,
    nextCheckpointX,
    nextCheckpointY
  )
  updatedPod = updatePodDistanceNextCheckpoint(
    updatedPod,
    nextCheckpointX,
    nextCheckpointY
  )

  return updatedPod
}

function updatePodPosition(pod: IPod, posX: number, posY: number): IPod {
  return { ...pod, posX, posY }
}

function updatePodSpeed(pod: IPod, speedX: number, speedY: number): IPod {
  const speed = Math.sqrt(speedX * speedX + speedY * speedY)
  return { ...pod, speedX, speedY, speed }
}

function updatePodAngle(pod: IPod, angle: number): IPod {
  return { ...pod, angle }
}

function updatePodCurrCheckpoint(
  pod: IPod,
  currCheckpointId: number,
  currCheckpointX: number,
  currCheckpointY: number
): IPod {
  return { ...pod, currCheckpointId, currCheckpointX, currCheckpointY }
}

function updatePodDistanceNextCheckpoint(
  pod: IPod,
  nextCheckpointX: number,
  nextCheckpointY: number
): IPod {
  const distanceNextCheckpoint = distance(
    pod.posX,
    pod.posY,
    nextCheckpointX,
    nextCheckpointY
  )
  return { ...pod, distanceNextCheckpoint }
}

// Game ================================================================

interface IGame {
  laps: number
  checkpoints: {
    [id: number]: [number, number]
  }
}

function initializeGame(): IGame {
  // @ts-ignore
  const laps: number = parseInt(readline())

  // @ts-ignore
  const checkpointCount: number = parseInt(readline())

  const checkpoints = {}
  for (let i = 0; i < checkpointCount; i++) {
    // @ts-ignore
    var inputs: string[] = readline().split(" ")
    const checkpointX: number = parseInt(inputs[0])
    const checkpointY: number = parseInt(inputs[1])
    checkpoints[i] = [checkpointX, checkpointY]
  }
  return { laps, checkpoints }
}

function getInput() {
  const podData = {
    myPod1PosX: 0,
    myPod1PosY: 0,
    myPod1SpeedX: 0,
    myPod1SpeedY: 0,
    myPod1Angle: 0,
    myPod1NextCheckpointId: 0,
    myPod2PosX: 0,
    myPod2PosY: 0,
    myPod2SpeedX: 0,
    myPod2SpeedY: 0,
    myPod2Angle: 0,
    myPod2NextCheckpointId: 0,
    opponentPod1PosX: 0,
    opponentPod1PosY: 0,
    opponentPod1SpeedX: 0,
    opponentPod1SpeedY: 0,
    opponentPod1Angle: 0,
    opponentPod1NextCheckpointId: 0,
    opponentPod2PosX: 0,
    opponentPod2PosY: 0,
    opponentPod2SpeedX: 0,
    opponentPod2SpeedY: 0,
    opponentPod2Angle: 0,
    opponentPod2NextCheckpointId: 0,
  }

  for (let i = 0; i < 2; i++) {
    // @ts-ignore
    var inputs: string[] = readline().split(" ")
    const [x, y, vx, vy, angle, nextCheckPointId] = inputs.map(Number)

    if (i === 0) {
      podData.myPod1PosX = x
      podData.myPod1PosY = y
      podData.myPod1SpeedX = vx
      podData.myPod1SpeedY = vy
      podData.myPod1Angle = angle
      podData.myPod1NextCheckpointId = nextCheckPointId
    } else {
      podData.myPod2PosX = x
      podData.myPod2PosY = y
      podData.myPod2SpeedX = vx
      podData.myPod2SpeedY = vy
      podData.myPod2Angle = angle
      podData.myPod2NextCheckpointId = nextCheckPointId
    }
  }

  for (let i = 0; i < 2; i++) {
    // @ts-ignore
    var inputs: string[] = readline().split(" ")
    const [x2, y2, vx2, vy2, angle2, nextCheckPointId2] = inputs.map(Number)

    if (i === 0) {
      podData.opponentPod1PosX = x2
      podData.opponentPod1PosY = y2
      podData.opponentPod1SpeedX = vx2
      podData.opponentPod1SpeedY = vy2
      podData.opponentPod1Angle = angle2
      podData.opponentPod1NextCheckpointId = nextCheckPointId2
    } else {
      podData.opponentPod2PosX = x2
      podData.opponentPod2PosY = y2
      podData.opponentPod2SpeedX = vx2
      podData.opponentPod2SpeedY = vy2
      podData.opponentPod2Angle = angle2
      podData.opponentPod2NextCheckpointId = nextCheckPointId2
    }
  }

  return podData
}

// Main ================================================================

function main() {
  let game: IGame = initializeGame()
  let myPod1: IPod = initializePod()
  let myPod2: IPod = initializePod()
  while (true) {
    const {
      myPod1PosX,
      myPod1PosY,
      myPod1SpeedX,
      myPod1SpeedY,
      myPod1Angle,
      myPod1NextCheckpointId,
      myPod2PosX,
      myPod2PosY,
      myPod2SpeedX,
      myPod2SpeedY,
      myPod2Angle,
      myPod2NextCheckpointId,
      opponentPod1PosX,
      opponentPod1PosY,
      opponentPod1SpeedX,
      opponentPod1SpeedY,
      opponentPod1Angle,
      opponentPod1NextCheckpointId,
      opponentPod2PosX,
      opponentPod2PosY,
      opponentPod2SpeedX,
      opponentPod2SpeedY,
      opponentPod2Angle,
      opponentPod2NextCheckpointId,
    } = getInput()

    myPod1 = updatePod(
      myPod1,
      myPod1PosX,
      myPod1PosY,
      myPod1SpeedX,
      myPod1SpeedY,
      myPod1Angle,
      myPod1NextCheckpointId,
      game.checkpoints[myPod1NextCheckpointId][0],
      game.checkpoints[myPod1NextCheckpointId][1]
    )

    myPod2 = updatePod(
      myPod2,
      myPod2PosX,
      myPod2PosY,
      myPod2SpeedX,
      myPod2SpeedY,
      myPod2Angle,
      myPod2NextCheckpointId,
      game.checkpoints[myPod2NextCheckpointId][0],
      game.checkpoints[myPod2NextCheckpointId][1]
    )

    const { thrust: thrust1, nextX: nextX1, nextY: nextY1 } = turn(myPod1, game)
    const { thrust: thrust2, nextX: nextX2, nextY: nextY2 } = turn(myPod2, game)

    console.error({ thrust1, nextX1, nextY1 })
    console.error({ thrust2, nextX2, nextY2 })
    console.error({ myPod1, myPod2, game })

    console.log(`${nextX1} ${nextY1} ${thrust1}`)
    console.log(`${nextX2} ${nextY2} ${thrust2}`)
  }
}

main()
