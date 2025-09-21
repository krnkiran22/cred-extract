from fastapi import APIRouter, HTTPException, Depends, Form
from app.models.schemas import APIResponse, OTPRequest, OTPVerification
from app.services.otp_service import get_otp_service, OTPService
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/generate-otp", response_model=APIResponse)
async def generate_otp(
    phone: str = Form(...),
    otp_service: OTPService = Depends(get_otp_service)
):
    """Generate OTP for phone number"""
    try:
        # Clean phone number
        phone = phone.strip()
        
        # Validate phone number
        if not otp_service.validate_phone(phone):
            raise HTTPException(
                status_code=400,
                detail="Invalid phone number. Please enter a valid 10-digit Indian mobile number."
            )
        
        # Clean phone format
        phone_clean = phone.replace('+91', '').replace('-', '').replace(' ', '')
        
        # Check if OTP already exists and is still valid
        otp_status = otp_service.get_otp_status(phone_clean)
        if otp_status['exists']:
            return APIResponse(
                success=True,
                message=f"OTP already sent. {otp_status['message']}",
                data={
                    'phone': phone_clean,
                    'otp_status': otp_status,
                    'resend_available': False
                }
            )
        
        # Generate new OTP
        logger.info(f"Generating OTP for phone: {phone_clean}")
        otp = otp_service.generate_otp(phone_clean)
        
        # Send OTP via SMS (mock implementation)
        sms_sent = otp_service.send_otp_sms(phone_clean, otp)
        
        if not sms_sent:
            logger.warning(f"Failed to send SMS for phone: {phone_clean}")
        
        logger.info(f"OTP generated successfully for phone: {phone_clean}")
        return APIResponse(
            success=True,
            message="OTP generated and sent successfully",
            data={
                'phone': phone_clean,
                'otp_sent': sms_sent,
                'expires_in_minutes': otp_service.otp_expiry_minutes,
                'attempts_allowed': 3
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating OTP: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating OTP: {str(e)}"
        )

@router.post("/verify-otp", response_model=APIResponse)
async def verify_otp(
    phone: str = Form(...),
    otp: str = Form(...),
    otp_service: OTPService = Depends(get_otp_service)
):
    """Verify OTP for phone number"""
    try:
        # Clean inputs
        phone = phone.strip()
        otp = otp.strip()
        
        # Validate phone number
        if not otp_service.validate_phone(phone):
            raise HTTPException(
                status_code=400,
                detail="Invalid phone number format"
            )
        
        # Validate OTP format
        if not otp.isdigit() or len(otp) != 6:
            raise HTTPException(
                status_code=400,
                detail="Invalid OTP format. OTP must be 6 digits."
            )
        
        # Clean phone format
        phone_clean = phone.replace('+91', '').replace('-', '').replace(' ', '')
        
        # Verify OTP
        logger.info(f"Verifying OTP for phone: {phone_clean}")
        is_verified = otp_service.verify_otp(phone_clean, otp)
        
        if is_verified:
            logger.info(f"OTP verified successfully for phone: {phone_clean}")
            return APIResponse(
                success=True,
                message="OTP verified successfully",
                data={
                    'phone': phone_clean,
                    'verified': True,
                    'verification_status': 'PASSED'
                }
            )
        else:
            # This shouldn't happen as verify_otp raises exception on failure
            raise HTTPException(
                status_code=400,
                detail="OTP verification failed"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {str(e)}")
        
        # Check if it's an OTP-specific error
        if "Invalid OTP" in str(e) or "expired" in str(e) or "exceeded" in str(e):
            raise HTTPException(
                status_code=400,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error verifying OTP: {str(e)}"
            )

@router.get("/otp-status/{phone}")
async def get_otp_status(
    phone: str,
    otp_service: OTPService = Depends(get_otp_service)
):
    """Get OTP status for phone number"""
    try:
        # Clean phone number
        phone_clean = phone.replace('+91', '').replace('-', '').replace(' ', '')
        
        # Validate phone number
        if not otp_service.validate_phone(phone_clean):
            raise HTTPException(
                status_code=400,
                detail="Invalid phone number format"
            )
        
        # Get OTP status
        status = otp_service.get_otp_status(phone_clean)
        
        return APIResponse(
            success=True,
            message="OTP status retrieved",
            data={
                'phone': phone_clean,
                'status': status
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting OTP status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error getting OTP status: {str(e)}"
        )

@router.post("/resend-otp", response_model=APIResponse)
async def resend_otp(
    phone: str = Form(...),
    otp_service: OTPService = Depends(get_otp_service)
):
    """Resend OTP for phone number"""
    try:
        # Clean phone number
        phone = phone.strip()
        phone_clean = phone.replace('+91', '').replace('-', '').replace(' ', '')
        
        # Validate phone number
        if not otp_service.validate_phone(phone_clean):
            raise HTTPException(
                status_code=400,
                detail="Invalid phone number format"
            )
        
        # Clear any existing OTP for this phone
        if phone_clean in otp_service.otp_storage:
            del otp_service.otp_storage[phone_clean]
        
        # Generate new OTP
        logger.info(f"Resending OTP for phone: {phone_clean}")
        otp = otp_service.generate_otp(phone_clean)
        
        # Send OTP via SMS
        sms_sent = otp_service.send_otp_sms(phone_clean, otp)
        
        logger.info(f"OTP resent successfully for phone: {phone_clean}")
        return APIResponse(
            success=True,
            message="OTP resent successfully",
            data={
                'phone': phone_clean,
                'otp_sent': sms_sent,
                'expires_in_minutes': otp_service.otp_expiry_minutes,
                'attempts_allowed': 3
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resending OTP: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error resending OTP: {str(e)}"
        )

@router.delete("/cleanup-expired")
async def cleanup_expired_otps(
    otp_service: OTPService = Depends(get_otp_service)
):
    """Clean up expired OTPs (admin endpoint)"""
    try:
        cleaned_count = otp_service.cleanup_expired_otps()
        
        return APIResponse(
            success=True,
            message=f"Cleaned up {cleaned_count} expired OTPs",
            data={
                'cleaned_count': cleaned_count
            }
        )
    
    except Exception as e:
        logger.error(f"Error cleaning up expired OTPs: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error cleaning up expired OTPs: {str(e)}"
        )

@router.get("/otp-info")
async def get_otp_info():
    """Get OTP system information"""
    return APIResponse(
        success=True,
        message="OTP system information",
        data={
            "otp_length": 6,
            "expiry_minutes": 5,
            "max_attempts": 3,
            "supported_formats": [
                "10-digit number (e.g., 9876543210)",
                "With country code (e.g., +919876543210)",
                "With spaces/dashes (e.g., 98765-43210)"
            ],
            "validation_rules": [
                "Must be a valid Indian mobile number",
                "Should start with 6, 7, 8, or 9",
                "Must be exactly 10 digits after cleaning"
            ],
            "usage_flow": [
                "1. Generate OTP with phone number",
                "2. Receive 6-digit OTP via SMS",
                "3. Verify OTP within 5 minutes",
                "4. Maximum 3 verification attempts allowed"
            ]
        }
    )