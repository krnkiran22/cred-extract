from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.models.schemas import APIResponse, AadhaarData
from app.services.ocr_service import get_ocr_service, OCRService
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/extract-aadhaar-data", response_model=APIResponse)
async def extract_aadhaar_data(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service)
):
    """Extract Aadhaar number, phone number, DOB, and photo from Aadhaar front image"""
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload an image file."
            )
        
        # Validate file size (max 10MB)
        file_content = await file.read()
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
        
        # Process Aadhaar image and extract focused data
        logger.info(f"Processing Aadhaar image: {file.filename}")
        result = ocr_service.extract_aadhaar_data(file_content)
        
        if not result.get('success', False):
            logger.error(f"Error processing Aadhaar photo: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=result.get('error', 'Failed to process Aadhaar image')
            )
        
        # Count successfully extracted fields
        extracted_count = sum(1 for key in ['aadhaar_number', 'phone_number', 'dob'] 
                            if result.get(key) is not None)
        
        if extracted_count == 0:
            logger.warning("No data could be extracted from the Aadhaar image")
            return APIResponse(
                success=True,
                message="Image processed but no readable data found. Please upload a clearer image.",
                data=result
            )
        
        logger.info(f"Successfully extracted {extracted_count} fields from Aadhaar")
        return APIResponse(
            success=True,
            message=f"Aadhaar data extracted successfully. Found {extracted_count} fields.",
            data=result
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing Aadhaar photo: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing Aadhaar photo: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error processing Aadhaar photo: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )

@router.get("/aadhaar-fields")
async def get_aadhaar_fields():
    """Get information about extractable Aadhaar fields"""
    return APIResponse(
        success=True,
        message="Available Aadhaar fields",
        data={
            "extractable_fields": [
                "name",
                "date_of_birth",
                "gender",
                "phone",
                "aadhaar_number",
                "address"
            ],
            "field_descriptions": {
                "name": "Full name as printed on Aadhaar",
                "date_of_birth": "Date of birth in DD/MM/YYYY format",
                "gender": "Gender (Male/Female)",
                "phone": "10-digit mobile number",
                "aadhaar_number": "12-digit Aadhaar number",
                "address": "Address as printed on Aadhaar"
            },
            "tips": [
                "Ensure the image is clear and well-lit",
                "Avoid shadows and glare",
                "Make sure all text is visible and not cut off",
                "Use high resolution images for better accuracy"
            ]
        }
    )