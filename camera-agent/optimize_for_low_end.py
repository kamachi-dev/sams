"""
Performance optimizations for low-end devices
This module provides optimizations that can be applied to reduce CPU/memory usage
"""

import cv2
import numpy as np

class PerformanceOptimizer:
    """Handles performance optimizations for low-end devices"""
    
    def __init__(self):
        # Optimizations for low-end devices
        self.frame_skip_count = 2  # Process every Nth frame
        self.frame_counter = 0
        self.detection_confidence_threshold = 0.6  # Higher threshold = fewer false positives
        self.max_image_size_for_processing = 640  # Resize large frames before processing
        
    def should_process_frame(self):
        """Determine if we should process this frame based on frame skipping"""
        self.frame_counter += 1
        if self.frame_counter >= self.frame_skip_count:
            self.frame_counter = 0
            return True
        return False
    
    def optimize_frame_for_processing(self, frame):
        """Resize frame if it's too large to save processing time"""
        height, width = frame.shape[:2]
        
        # If frame is larger than our max size, resize it
        if width > self.max_image_size_for_processing or height > self.max_image_size_for_processing:
            # Calculate scaling factor to maintain aspect ratio
            scale = min(self.max_image_size_for_processing / width, 
                       self.max_image_size_for_processing / height)
            new_width = int(width * scale)
            new_height = int(height * scale)
            
            # Resize the frame
            resized_frame = cv2.resize(frame, (new_width, new_height))
            return resized_frame, scale
        
        return frame, 1.0
    
    def restore_coordinates(self, coords, scale_factor):
        """Restore coordinates to original frame size after processing resized frame"""
        if scale_factor == 1.0:
            return coords
        return [int(coord / scale_factor) for coord in coords]
    
    def get_optimal_camera_settings(self):
        """Get camera settings optimized for low-end devices"""
        # These settings reduce the processing load on the camera itself
        return {
            'width': 640,
            'height': 480,
            'fps': 15,  # Lower FPS reduces CPU usage
            'brightness': 128,
            'contrast': 32,
            'saturation': 32,
            'gain': 0,
            'exposure': -6  # Auto exposure
        }

def apply_low_end_optimizations():
    """Apply OpenCV optimizations for better performance on low-end devices"""
    # Use optimizations if available
    try:
        # Enable OpenCV optimizations
        cv2.setUseOptimized(True)
        
        # Set number of threads for OpenCV operations (0 = auto-detect)
        # On low-end devices, limiting threads can prevent over-subscription
        cv2.setNumThreads(2)
        
        return True
    except Exception as e:
        print(f"Warning: Could not apply OpenCV optimizations: {e}")
        return False

# Memory optimization utilities
def clear_memory():
    """Force garbage collection to free memory"""
    import gc
    gc.collect()

def create_lightweight_face_analyzer():
    """Create a face analyzer with settings optimized for low-end devices"""
    try:
        from insightface.app import FaceAnalysis
        # Use smaller model and CPU provider for better compatibility
        app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
        # Prepare with smaller detection size for faster processing
        app.prepare(ctx_id=0, det_size=(640, 640))  # Smaller than default 1024x1024
        return app
    except Exception as e:
        print(f"Error creating lightweight face analyzer: {e}")
        # Fallback to basic OpenCV face detection
        return None

# Example usage in the camera agent:
"""
# In your camera_agent.py, add these imports:
from optimize_for_low_end import PerformanceOptimizer, apply_low_end_optimizations, create_lightweight_face_analyzer

# In main() function:
apply_low_end_optimizations()
optimizer = PerformanceOptimizer()

# In your frame processing loop:
if not optimizer.should_process_frame():
    continue  # Skip this frame

# Optimize frame before processing
optimized_frame, scale_factor = optimizer.optimize_frame_for_processing(frame)
# ... process optimized_frame ...
# When getting results, restore coordinates if needed:
# original_coords = optimizer.restore_coordinates(detected_coords, scale_factor)
"""
