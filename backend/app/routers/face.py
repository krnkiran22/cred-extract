from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from app.models.schemas import APIResponse, FaceMatchRequest
from app.services.yolo_face_service import get_yolo_face_service, YOLOFaceService
from app.services.otp_service import get_otp_service, OTPService
from typing import Optional
from pydantic import BaseModel
import base64
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class FaceVerificationRequest(BaseModel):
    aadhaar_photo_base64: str
    live_photo_base64: str
    phone_number: str  # Added phone number for OTP sending

@router.post("/verify-face", response_model=APIResponse)
async def verify_face(
    request: FaceVerificationRequest,
    yolo_face_service: YOLOFaceService = Depends(get_yolo_face_service),
    otp_service: OTPService = Depends(get_otp_service)
):
    """Verify live photo against Aadhaar photo using YOLO-based face comparison"""
    try:
        # Decode base64 images
        try:
            aadhaar_image_bytes = base64.b64decode(request.aadhaar_photo_base64)
            live_image_bytes = base64.b64decode(request.live_photo_base64)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail="Invalid base64 image data"
            )
        
        # Validate both images have faces using YOLO
        aadhaar_validation = yolo_face_service.validate_face_quality(aadhaar_image_bytes)
        if not aadhaar_validation['is_valid']:
            raise HTTPException(
                status_code=400,
                detail=f"Aadhaar photo validation failed: {aadhaar_validation['reason']}"
            )
        
        live_validation = yolo_face_service.validate_face_quality(live_image_bytes)
        if not live_validation['is_valid']:
            raise HTTPException(
                status_code=400,
                detail=f"Live photo validation failed: {live_validation['reason']}"
            )
        
        # Perform YOLO-based face comparison
        logger.info("Comparing Aadhaar photo with live photo using YOLO")
        comparison_result = yolo_face_service.compare_faces_yolo(aadhaar_image_bytes, live_image_bytes)
        
        if not comparison_result['success']:
            raise HTTPException(
                status_code=500,
                detail=comparison_result.get('error', 'YOLO face comparison failed')
            )
        
        match_result = comparison_result['match']
        confidence = comparison_result['confidence']
        
        logger.info(f"YOLO face verification result: {match_result}, confidence: {confidence:.2f}%")
        
        # If face verification is successful, automatically send OTP
        otp_sent = False
        otp_message = ""
        
        if match_result:
            try:
                # Generate and send OTP to the phone number
                otp = otp_service.generate_otp(request.phone_number)
                otp_sent = otp_service.send_otp_sms(request.phone_number, otp)
                
                if otp_sent:
                    otp_message = f"OTP sent successfully to +91{request.phone_number}"
                    logger.info(f"OTP sent to {request.phone_number} after successful face verification")
                else:
                    otp_message = "Face verified but failed to send OTP. Please try again."
                    logger.error(f"Failed to send OTP to {request.phone_number}")
                    
            except Exception as otp_error:
                logger.error(f"Error sending OTP: {str(otp_error)}")
                otp_message = f"Face verified but OTP error: {str(otp_error)}"
        else:
            otp_message = "Face verification failed. OTP not sent."
        
        return APIResponse(
            success=True,
            message=f"Face verification completed with {confidence:.1f}% confidence. {otp_message}",
            data={
                'match': match_result,
                'confidence': confidence,
                'message': comparison_result['message'],
                'distance': comparison_result.get('distance', 0),
                'verification_method': 'YOLO',
                'otp_sent': otp_sent,
                'otp_message': otp_message,
                'phone_number': request.phone_number if match_result else None
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in YOLO face verification: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Face verification failed: {str(e)}"
        )
