import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';

let detector: poseDetection.PoseDetector | null = null;

export interface BodyEstimates {
    height: number; // in cm
    weight: number; // in kg
    confidence: number; // 0-1
}

/**
 * Initialize the pose detection model
 */
export async function loadPoseModel(): Promise<void> {
    if (detector) return; // Already loaded

    const model = poseDetection.SupportedModels.MoveNet;
    const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    };

    detector = await poseDetection.createDetector(model, detectorConfig);
}

/**
 * Detect pose from an image
 */
export async function detectPose(
    imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<poseDetection.Pose[]> {
    if (!detector) {
        throw new Error('Pose detector not initialized. Call loadPoseModel() first.');
    }

    const poses = await detector.estimatePoses(imageElement);
    return poses;
}

/**
 * Estimate height from pose landmarks
 * Uses the distance from nose to ankle as a proxy for full height
 */
export function estimateHeight(pose: poseDetection.Pose): number | null {
    const keypoints = pose.keypoints;

    // Find nose (index 0) and ankles (index 15, 16)
    const nose = keypoints.find(kp => kp.name === 'nose');
    const leftAnkle = keypoints.find(kp => kp.name === 'left_ankle');
    const rightAnkle = keypoints.find(kp => kp.name === 'right_ankle');

    if (!nose || (!leftAnkle && !rightAnkle)) {
        return null;
    }

    // Use whichever ankle has higher confidence
    const ankle = !leftAnkle ? rightAnkle : !rightAnkle ? leftAnkle :
        leftAnkle.score! > rightAnkle.score! ? leftAnkle : rightAnkle;

    if (!ankle || nose.score! < 0.3 || ankle.score! < 0.3) {
        return null;
    }

    // Calculate pixel distance from nose to ankle
    const pixelHeight = Math.sqrt(
        Math.pow(ankle.x - nose.x, 2) + Math.pow(ankle.y - nose.y, 2)
    );

    // Calibration: Assume average person height is 165cm
    // This is a rough approximation - ideally we'd have a reference object
    // Assuming the person fills about 80% of a 640px height frame
    const REFERENCE_PIXELS = 512; // pixels from head to toe in typical frame
    const REFERENCE_HEIGHT_CM = 165; // average height in cm

    const estimatedHeight = (pixelHeight / REFERENCE_PIXELS) * REFERENCE_HEIGHT_CM;

    // Clamp to reasonable range (120cm - 210cm)
    return Math.max(120, Math.min(210, Math.round(estimatedHeight)));
}

/**
 * Estimate body width from shoulders and hips
 */
function estimateBodyWidth(pose: poseDetection.Pose): number | null {
    const keypoints = pose.keypoints;

    const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
    const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
    const leftHip = keypoints.find(kp => kp.name === 'left_hip');
    const rightHip = keypoints.find(kp => kp.name === 'right_hip');

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
        return null;
    }

    if (leftShoulder.score! < 0.3 || rightShoulder.score! < 0.3 ||
        leftHip.score! < 0.3 || rightHip.score! < 0.3) {
        return null;
    }

    // Calculate shoulder and hip widths
    const shoulderWidth = Math.sqrt(
        Math.pow(rightShoulder.x - leftShoulder.x, 2) +
        Math.pow(rightShoulder.y - leftShoulder.y, 2)
    );

    const hipWidth = Math.sqrt(
        Math.pow(rightHip.x - leftHip.x, 2) +
        Math.pow(rightHip.y - leftHip.y, 2)
    );

    // Average the two
    return (shoulderWidth + hipWidth) / 2;
}

/**
 * Estimate weight from height and body proportions
 * This is VERY approximate and should be used with caution
 */
export function estimateWeight(pose: poseDetection.Pose, height: number): number | null {
    const bodyWidth = estimateBodyWidth(pose);

    if (!bodyWidth || !height) {
        return null;
    }

    // Very rough BMI-based estimation
    // Assume average BMI of 22, then adjust based on body width
    // Width ratio: wider body = higher BMI
    const REFERENCE_WIDTH_PIXELS = 150; // typical shoulder width in frame
    const widthRatio = bodyWidth / REFERENCE_WIDTH_PIXELS;

    // Base BMI adjusted by width
    const estimatedBMI = 22 * widthRatio;

    // Weight = BMI * (height in meters)^2
    const heightInMeters = height / 100;
    const estimatedWeight = estimatedBMI * heightInMeters * heightInMeters;

    // Clamp to reasonable range (30kg - 150kg)
    return Math.max(30, Math.min(150, Math.round(estimatedWeight)));
}

/**
 * Calculate average confidence of key body landmarks
 */
export function getPoseConfidence(pose: poseDetection.Pose): number {
    const importantKeypoints = [
        'nose', 'left_shoulder', 'right_shoulder',
        'left_hip', 'right_hip', 'left_ankle', 'right_ankle'
    ];

    const keypoints = pose.keypoints.filter(kp =>
        importantKeypoints.includes(kp.name || '')
    );

    if (keypoints.length === 0) return 0;

    const avgScore = keypoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / keypoints.length;
    return avgScore;
}

/**
 * Main function to get body estimates from an image
 */
export async function getBodyEstimates(
    imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<BodyEstimates | null> {
    const poses = await detectPose(imageElement);

    if (poses.length === 0) {
        return null;
    }

    const pose = poses[0]; // Use first detected pose
    const confidence = getPoseConfidence(pose);

    if (confidence < 0.4) {
        return null; // Not confident enough
    }

    const height = estimateHeight(pose);
    const weight = height ? estimateWeight(pose, height) : null;

    if (!height || !weight) {
        return null;
    }

    return {
        height,
        weight,
        confidence
    };
}

/**
 * Check if pose is suitable for estimation (full body visible)
 */
export function isPoseComplete(pose: poseDetection.Pose): boolean {
    const requiredKeypoints = [
        'nose', 'left_shoulder', 'right_shoulder',
        'left_hip', 'right_hip', 'left_ankle', 'right_ankle'
    ];

    const detectedKeypoints = pose.keypoints.filter(kp =>
        requiredKeypoints.includes(kp.name || '') && (kp.score || 0) > 0.3
    );

    return detectedKeypoints.length >= 6; // At least 6 of 7 required points
}
