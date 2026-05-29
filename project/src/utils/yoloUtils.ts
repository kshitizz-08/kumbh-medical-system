import * as ort from 'onnxruntime-web';

// Initialize ONNX runtime configuration
ort.env.wasm.numThreads = 1; // Sometimes multi-threading causes issues in browser
ort.env.wasm.simd = true;

// Preprocess image for YOLOv8 (resize to 640x640, normalize)
export function preprocessImage(canvas: HTMLCanvasElement): Float32Array {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Could not get canvas context");
    
    // Resize to 640x640 for YOLOv8 standard input
    const targetSize = 640;
    
    // Create a temporary canvas for resizing
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = targetSize;
    tempCanvas.height = targetSize;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) throw new Error("Could not get temp canvas context");

    // Letterbox resize to maintain aspect ratio
    const scale = Math.min(targetSize / canvas.width, targetSize / canvas.height);
    const newW = canvas.width * scale;
    const newH = canvas.height * scale;
    const padX = (targetSize - newW) / 2;
    const padY = (targetSize - newH) / 2;

    // Fill black padding
    tempCtx.fillStyle = 'black';
    tempCtx.fillRect(0, 0, targetSize, targetSize);
    
    // Draw scaled image
    tempCtx.drawImage(canvas, padX, padY, newW, newH);

    const imgData = tempCtx.getImageData(0, 0, targetSize, targetSize);
    const data = imgData.data;

    // Create a Float32Array of shape [1, 3, 640, 640]
    // CHW format (Channels, Height, Width)
    const floatData = new Float32Array(3 * targetSize * targetSize);
    
    for (let i = 0; i < targetSize * targetSize; i++) {
        const r = data[i * 4] / 255.0;
        const g = data[i * 4 + 1] / 255.0;
        const b = data[i * 4 + 2] / 255.0;
        
        // Populate R, G, B channels
        floatData[i] = r;
        floatData[targetSize * targetSize + i] = g;
        floatData[2 * targetSize * targetSize + i] = b;
    }

    return floatData;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
}

// Post-process YOLOv8 tensor output (Non-Max Suppression)
export function postprocessTensor(outputTensor: ort.Tensor, origWidth: number, origHeight: number, confThreshold = 0.5, iouThreshold = 0.4): BoundingBox[] {
    const data = outputTensor.data as Float32Array;
    const dims = outputTensor.dims; // Expected: [1, 5, 8400]
    
    const rows = dims[2]; // 8400

    let boxes: BoundingBox[] = [];

    for (let i = 0; i < rows; i++) {
        // Data is interleaved by column in ONNX export typically, 
        // OR it might be [1, 5, 8400] where the first 8400 values are cx, next 8400 are cy, etc.
        // Usually Ultralytics exports as [1, 5, 8400] where:
        // class_conf = data[4 * 8400 + i]
        const confidence = data[4 * rows + i];
        
        if (confidence > confThreshold) {
            const cx = data[0 * rows + i];
            const cy = data[1 * rows + i];
            const w = data[2 * rows + i];
            const h = data[3 * rows + i];

            // Convert center to top-left
            const x = cx - w / 2;
            const y = cy - h / 2;

            boxes.push({ x, y, width: w, height: h, confidence });
        }
    }

    // Apply Non-Max Suppression (NMS)
    boxes = nms(boxes, iouThreshold);

    // Scale boxes back to original image size
    const targetSize = 640;
    const scale = Math.min(targetSize / origWidth, targetSize / origHeight);
    const padX = (targetSize - origWidth * scale) / 2;
    const padY = (targetSize - origHeight * scale) / 2;

    return boxes.map(box => ({
        x: Math.max(0, (box.x - padX) / scale),
        y: Math.max(0, (box.y - padY) / scale),
        width: Math.min(origWidth - box.x, box.width / scale),
        height: Math.min(origHeight - box.y, box.height / scale),
        confidence: box.confidence
    }));
}

function nms(boxes: BoundingBox[], iouThreshold: number): BoundingBox[] {
    boxes.sort((a, b) => b.confidence - a.confidence);
    const result: BoundingBox[] = [];

    for (let i = 0; i < boxes.length; i++) {
        let keep = true;
        for (let j = 0; j < result.length; j++) {
            if (iou(boxes[i], result[j]) > iouThreshold) {
                keep = false;
                break;
            }
        }
        if (keep) {
            result.push(boxes[i]);
        }
    }
    return result;
}

function iou(box1: BoundingBox, box2: BoundingBox): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    const intersectionArea = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const box1Area = box1.width * box1.height;
    const box2Area = box2.width * box2.height;

    return intersectionArea / (box1Area + box2Area - intersectionArea);
}
