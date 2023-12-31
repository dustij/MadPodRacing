// Constants ==================================================================

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

// Thrust decrease value per game tick.
// Used to gradually reduce the pod's thrust over time or in specific conditions.
const THRUST_DECREASE_PER_TICK = 10
