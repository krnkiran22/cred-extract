from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from app.models.schemas import APIResponse, FaceMatchRequest
from app.services.face_service import get_face_service, FaceService
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Global storage for uploaded images (in production, use database or cloud storage)
uploaded_images = {}

@router.post("/upload-aadhaar-face", response_model=APIResponse)
async def upload_aadhaar_face(
    file: UploadFile = File(...),
    face_service: FaceService = Depends(get_face_service)
):
    """Upload Aadhaar photo for face extraction"""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload an image file."
            )
        
        # Read file content
        file_content = await file.read()
        
        # Validate file size (max 10MB)
        if len(file_content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum size allowed is 10MB."
            )
        
        if len(file_content) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file uploaded."
            )
        
        # Validate face quality
        face_validation = face_service.validate_face_quality(file_content)
        
        if not face_validation['is_valid']:
            raise HTTPException(
                status_code=400,
                detail=f"Face validation failed: {', '.join(face_validation['issues'])}"
            )
        
        # Extract face encoding
        logger.info(f"Processing Aadhaar face image: {file.filename}")
        face_encoding = face_service.extract_face_encoding(file_content)
        
        if face_encoding is None:
            raise HTTPException(
                status_code=400,
                detail="Could not extract face from the image"
            )
        
        # Store the image and encoding (in production, use proper storage)
        session_id = f"aadhaar_{len(uploaded_images)}"
        uploaded_images[session_id] = {
            'type': 'aadhaar',
            'image_data': file_content,
            'face_encoding': face_encoding,
            'filename': file.filename
        }
        
        logger.info(f"Successfully extracted face from Aadhaar image")
        return APIResponse(
            success=True,
            message="Aadhaar face uploaded and processed successfully",
            data={
                'session_id': session_id,
                'face_detected': True,
                'validation': face_validation
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Aadhaar face: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )

@router.post("/upload-live-photo", response_model=APIResponse)
async def upload_live_photo(
    file: UploadFile = File(...),
    face_service: FaceService = Depends(get_face_service)
):
    """Upload live photo for face extraction"""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload an image file."
            )
        
        # Read file content
        file_content = await file.read()
        
        # Validate file size (max 10MB)
        if len(file_content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum size allowed is 10MB."
            )
        
        if len(file_content) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file uploaded."
            )
        
        # Validate face quality
        face_validation = face_service.validate_face_quality(file_content)
        
        if not face_validation['is_valid']:
            raise HTTPException(
                status_code=400,
                detail=f"Face validation failed: {', '.join(face_validation['issues'])}"
            )
        
        # Extract face encoding
        logger.info(f"Processing live photo: {file.filename}")
        face_encoding = face_service.extract_face_encoding(file_content)
        
        if face_encoding is None:
            raise HTTPException(
                status_code=400,
                detail="Could not extract face from the image"
            )
        
        # Store the image and encoding
        session_id = f"live_{len(uploaded_images)}"
        uploaded_images[session_id] = {
            'type': 'live',
            'image_data': file_content,
            'face_encoding': face_encoding,
            'filename': file.filename
        }
        
        logger.info(f"Successfully extracted face from live photo")
        return APIResponse(
            success=True,
            message="Live photo uploaded and processed successfully",
            data={
                'session_id': session_id,
                'face_detected': True,
                'validation': face_validation
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing live photo: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )

@router.post("/compare-faces", response_model=APIResponse)
async def compare_faces(
    aadhaar_session_id: str = Form(...),
    live_session_id: str = Form(...),
    confidence_threshold: Optional[float] = Form(0.6),
    face_service: FaceService = Depends(get_face_service)
):
    """Compare faces from Aadhaar and live photos"""
    try:
        # Validate session IDs
        if aadhaar_session_id not in uploaded_images:
            raise HTTPException(
                status_code=404,
                detail="Aadhaar image not found. Please upload Aadhaar photo first."
            )
        
        if live_session_id not in uploaded_images:
            raise HTTPException(
                status_code=404,
                detail="Live photo not found. Please upload live photo first."
            )
        
        aadhaar_data = uploaded_images[aadhaar_session_id]
        live_data = uploaded_images[live_session_id]
        
        # Validate image types
        if aadhaar_data['type'] != 'aadhaar':
            raise HTTPException(
                status_code=400,
                detail="Invalid Aadhaar session ID"
            )
        
        if live_data['type'] != 'live':
            raise HTTPException(
                status_code=400,
                detail="Invalid live photo session ID"
            )
        
        # Validate confidence threshold
        if confidence_threshold < 0 or confidence_threshold > 1:
            raise HTTPException(
                status_code=400,
                detail="Confidence threshold must be between 0 and 1"
            )
        
        # Compare faces
        logger.info(f"Comparing faces with threshold: {confidence_threshold}")
        is_match, confidence = face_service.compare_faces(
            aadhaar_data['image_data'],
            live_data['image_data'],
            tolerance=1 - confidence_threshold  # face_recognition uses distance, so invert
        )
        
        # Clean up uploaded images after comparison
        del uploaded_images[aadhaar_session_id]
        del uploaded_images[live_session_id]
        
        result_message = "Face verification successful" if is_match else "Face verification failed"
        
        logger.info(f"Face comparison result: {result_message}, confidence: {confidence:.2f}%")
        return APIResponse(
            success=True,
            message=result_message,
            data={
                'is_match': is_match,
                'confidence_percentage': round(confidence, 2),
                'confidence_threshold': confidence_threshold * 100,
                'verification_status': 'PASSED' if is_match else 'FAILED'
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error comparing faces: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error comparing faces: {str(e)}"
        )

@router.delete("/clear-session/{session_id}")
async def clear_session(session_id: str):
    """Clear uploaded image session"""
    if session_id in uploaded_images:
        del uploaded_images[session_id]
        return APIResponse(
            success=True,
            message="Session cleared successfully"
        )
    else:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

@router.get("/face-requirements")
async def get_face_requirements():
    """Get face photo requirements and tips"""
    return APIResponse(
        success=True,
        message="Face photo requirements",
        data={
            "requirements": [
                "Single face per image",
                "Clear, well-lit photos",
                "Face should be visible and not obscured",
                "Minimum face size: 50x50 pixels",
                "Maximum file size: 10MB",
                "Supported formats: JPEG, PNG, WebP"
            ],
            "tips": [
                "Look directly at the camera",
                "Ensure good lighting without shadows",
                "Remove sunglasses or masks",
                "Keep a neutral expression",
                "Make sure the entire face is visible"
            ],
            "confidence_info": {
                "default_threshold": 0.6,
                "threshold_range": "0.0 to 1.0",
                "recommended_range": "0.5 to 0.8",
                "description": "Higher threshold = stricter matching"
            }
        }
    )