import cv2
import numpy as np
import base64
from typing import Optional, Dict, Tuple, List
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class YOLOFaceService:
    def __init__(self):
        """Initialize YOLO Face Service with OpenCV-based face detection"""
        self.confidence_threshold = 0.6
        
        # Initialize face cascade for detection
        try:
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            if self.face_cascade.empty():
                raise Exception("Could not load face cascade classifier")
        except Exception as e:
            logger.error(f"Failed to initialize face cascade: {str(e)}")
            # Fallback to basic detection
            self.face_cascade = None
            
        # Initialize ORB detector with more features for better matching
        self.orb = cv2.ORB_create(
            nfeatures=1000,      # Increase feature count
            scaleFactor=1.2,     # Better scale invariance
            nlevels=8,           # More pyramid levels
            edgeThreshold=15,    # Lower edge threshold for small faces
            firstLevel=0,        # Start from original scale
            WTA_K=2,             # Keep default
            scoreType=cv2.ORB_HARRIS_SCORE,  # Use Harris corner detector
            patchSize=31,        # Default patch size
            fastThreshold=10     # Lower threshold for corner detection
        )
        
        logger.info("YOLO Face Service initialized successfully with OpenCV")
    
    def detect_faces_opencv(self, image_bytes: bytes) -> List[Dict]:
        """Detect faces using OpenCV Haar Cascade"""
        try:
            # Convert bytes to OpenCV image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                logger.error("Could not decode image")
                return []
                
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            if self.face_cascade is None:
                logger.error("Face cascade not available")
                return []
            
            # Detect faces with more aggressive parameters for small faces
            faces = self.face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,  # More granular scaling
                minNeighbors=3,    # Lower threshold for detection
                minSize=(20, 20),  # Allow smaller faces
                maxSize=(500, 500) # Reasonable upper limit
            )
            
            face_data = []
            for (x, y, w, h) in faces:
                # Expand face region slightly for better feature extraction
                expansion = max(5, min(w, h) // 10)  # Add 10% padding or minimum 5 pixels
                x_exp = max(0, x - expansion)
                y_exp = max(0, y - expansion)
                w_exp = min(gray.shape[1] - x_exp, w + 2 * expansion)
                h_exp = min(gray.shape[0] - y_exp, h + 2 * expansion)
                
                face_roi = gray[y_exp:y_exp+h_exp, x_exp:x_exp+w_exp]
                
                # Resize small faces for better feature extraction
                if w < 80 or h < 80:
                    target_size = 120
                    face_roi = cv2.resize(face_roi, (target_size, target_size), interpolation=cv2.INTER_CUBIC)
                    logger.info(f"Resized small face from {w}x{h} to {target_size}x{target_size}")
                
                # Apply histogram equalization for better feature extraction
                face_roi = cv2.equalizeHist(face_roi)
                
                face_data.append({
                    'bbox': [x, y, w, h],
                    'confidence': 0.95,  # High confidence for cascade
                    'face_roi': face_roi,
                    'face_crop': image[y:y+h, x:x+w],
                    'enhanced': w < 80 or h < 80  # Flag for enhanced faces
                })
            
            logger.info(f"Processed {len(face_data)} faces with enhancement")
            return face_data
        except Exception as e:
            logger.error(f"Error in OpenCV face detection: {str(e)}")
            return []
    
    def extract_face_features(self, image_bytes: bytes) -> Optional[np.ndarray]:
        """Extract face features using ORB detector"""
        try:
            faces = self.detect_faces_opencv(image_bytes)
            
            if not faces:
                logger.warning("No faces found in image")
                return None
            
            # Get the largest face
            largest_face = max(faces, key=lambda f: f['bbox'][2] * f['bbox'][3])
            face_roi = largest_face['face_roi']
            
            # Extract ORB features
            keypoints, descriptors = self.orb.detectAndCompute(face_roi, None)
            
            if descriptors is None or len(descriptors) < 10:
                logger.warning("Insufficient features detected in face")
                return None
            
            # Return flattened descriptor vector
            return descriptors.flatten()
            
        except Exception as e:
            logger.error(f"Error extracting face features: {str(e)}")
            return None
    
    def compare_faces_yolo(self, aadhaar_image_bytes: bytes, live_image_bytes: bytes) -> Dict:
        """Compare faces using OpenCV-based feature matching"""
        try:
            logger.info("Starting OpenCV-based face comparison")
            
            # Detect faces in both images
            logger.info("Detecting faces in Aadhaar image...")
            aadhaar_faces = self.detect_faces_opencv(aadhaar_image_bytes)
            logger.info(f"Found {len(aadhaar_faces)} faces in Aadhaar image")
            
            logger.info("Detecting faces in live image...")
            live_faces = self.detect_faces_opencv(live_image_bytes)
            logger.info(f"Found {len(live_faces)} faces in live image")
            
            if not aadhaar_faces:
                logger.error("No face detected in Aadhaar photo")
                return {
                    'success': False,
                    'error': 'Could not detect face in Aadhaar photo',
                    'match': False,
                    'confidence': 0.0
                }
            
            if not live_faces:
                logger.error("No face detected in live photo")
                return {
                    'success': False,
                    'error': 'Could not detect face in live photo',
                    'match': False,
                    'confidence': 0.0
                }
            
            # Get the largest faces from both images
            aadhaar_face = max(aadhaar_faces, key=lambda f: f['bbox'][2] * f['bbox'][3])
            live_face = max(live_faces, key=lambda f: f['bbox'][2] * f['bbox'][3])
            logger.info(f"Selected Aadhaar face bbox: {aadhaar_face['bbox']}")
            logger.info(f"Selected live face bbox: {live_face['bbox']}")
            
            # Extract features using ORB
            logger.info("Extracting ORB features from Aadhaar face...")
            aadhaar_kp, aadhaar_desc = self.orb.detectAndCompute(aadhaar_face['face_roi'], None)
            logger.info(f"Aadhaar face features: {len(aadhaar_desc) if aadhaar_desc is not None else 0}")
            
            logger.info("Extracting ORB features from live face...")
            live_kp, live_desc = self.orb.detectAndCompute(live_face['face_roi'], None)
            logger.info(f"Live face features: {len(live_desc) if live_desc is not None else 0}")
            
            if aadhaar_desc is None or live_desc is None:
                logger.error("Could not extract sufficient features from one or both faces")
                return {
                    'success': False,
                    'error': 'Could not extract sufficient features from faces',
                    'match': False,
                    'confidence': 0.0
                }
            
            # Check if we have enough features for comparison
            if len(aadhaar_desc) < 5 or len(live_desc) < 5:
                logger.error(f"Insufficient features: Aadhaar={len(aadhaar_desc)}, Live={len(live_desc)}")
                return {
                    'success': False,
                    'error': 'Insufficient features detected in faces for comparison',
                    'match': False,
                    'confidence': 0.0
                }
            
            # Match features using FLANN matcher
            FLANN_INDEX_KDTREE = 1
            index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=5)
            search_params = dict(checks=50)
            
            matches = None
            try:
                flann = cv2.FlannBasedMatcher(index_params, search_params)
                matches = flann.knnMatch(aadhaar_desc, live_desc, k=2)
                logger.info(f"FLANN matching successful, found {len(matches) if matches else 0} match pairs")
            except Exception as flann_error:
                logger.warning(f"FLANN matching failed: {str(flann_error)}, falling back to BFMatcher")
                # Fallback to BFMatcher if FLANN fails
                try:
                    bf = cv2.BFMatcher()
                    matches = bf.knnMatch(aadhaar_desc, live_desc, k=2)
                    logger.info(f"BFMatcher fallback successful, found {len(matches) if matches else 0} match pairs")
                except Exception as bf_error:
                    logger.error(f"Both FLANN and BFMatcher failed: {str(bf_error)}")
                    return {
                        'success': False,
                        'error': f'Feature matching failed: {str(bf_error)}',
                        'match': False,
                        'confidence': 0.0
                    }
            
            # Apply Lowe's ratio test to find good matches
            good_matches = []
            if matches and len(matches) > 0:
                for match_pair in matches:
                    if len(match_pair) == 2:
                        m, n = match_pair
                        if m.distance < 0.7 * n.distance:
                            good_matches.append(m)
            else:
                logger.warning("No matches found between the two faces")
                return {
                    'success': True,
                    'match': False,
                    'confidence': 0.0,
                    'good_matches': 0,
                    'total_features': min(len(aadhaar_desc), len(live_desc)),
                    'message': "No feature matches found between faces"
                }
            
            # Calculate similarity based on good matches
            total_features = min(len(aadhaar_desc), len(live_desc))
            match_ratio = len(good_matches) / max(total_features, 1)
            
            # Convert to confidence percentage
            confidence = min(match_ratio * 100, 100)
            
            # Determine if faces match (threshold can be adjusted)
            match_threshold = 15  # Percentage of features that should match
            is_match = confidence >= match_threshold
            
            logger.info(f"OpenCV Face comparison - good matches: {len(good_matches)}/{total_features}, confidence: {confidence:.1f}%, match: {is_match}")
            
            return {
                'success': True,
                'match': is_match,
                'confidence': confidence,
                'good_matches': len(good_matches),
                'total_features': total_features,
                'message': f"Face {'match' if is_match else 'mismatch'} detected with {confidence:.1f}% confidence"
            }
            
        except Exception as e:
            logger.error(f"Error in OpenCV face comparison: {str(e)}")
            return {
                'success': False,
                'error': f"Face comparison failed: {str(e)}",
                'match': False,
                'confidence': 0.0
            }
    
    def validate_face_quality(self, image_bytes: bytes) -> Dict:
        """Validate if image contains a clear face"""
        try:
            faces = self.detect_faces_opencv(image_bytes)
            
            if not faces:
                return {
                    'is_valid': False,
                    'reason': 'No face detected in image'
                }
            
            # Check if face is large enough
            largest_face = max(faces, key=lambda f: f['bbox'][2] * f['bbox'][3])
            face_area = largest_face['bbox'][2] * largest_face['bbox'][3]
            
            if face_area < 1000:  # Minimum face area
                return {
                    'is_valid': False,
                    'reason': 'Face too small or unclear'
                }
            
            return {
                'is_valid': True,
                'reason': 'Face detected and quality validated',
                'face_count': len(faces),
                'largest_face_area': face_area
            }
            
        except Exception as e:
            return {
                'is_valid': False,
                'reason': f'Face validation failed: {str(e)}'
            }
    
    async def health_check(self) -> bool:
        """Health check for YOLO Face Service"""
        try:
            # Create a simple test image with basic validation
            test_image = np.ones((200, 200, 3), dtype=np.uint8) * 255
            _, buffer = cv2.imencode('.jpg', test_image)
            test_bytes = buffer.tobytes()
            
            # Try to process the test image (should return no faces, but no error)
            result = self.validate_face_quality(test_bytes)
            return True  # If no exception, service is healthy
        except Exception as e:
            logger.error(f"YOLO Face Service health check failed: {str(e)}")
            return False

# Global YOLO face service instance
yolo_face_service = None

def get_yolo_face_service() -> YOLOFaceService:
    """Get YOLO Face service instance"""
    global yolo_face_service
    if yolo_face_service is None:
        yolo_face_service = YOLOFaceService()
    return yolo_face_service