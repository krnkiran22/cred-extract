from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from app.models.schemas import APIResponse, AadhaarData
from app.services.ocr_service import get_ocr_service, OCRService
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/upload-aadhaar-photo", response_model=APIResponse)
async def upload_aadhaar_photo(
    file: UploadFile = File(...),
    ocr_service: OCRService = Depends(get_ocr_service)
):
    """Upload and process Aadhaar photo to extract text data"""
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
        
        # Process Aadhaar image and extract data
        logger.info(f"Processing Aadhaar image: {file.filename}")
        aadhaar_data = ocr_service.extract_aadhaar_data(file_content)
        
        # Validate that we extracted some meaningful data
        extracted_fields = sum(1 for value in aadhaar_data.values() if value is not None and value != '')
        
        if extracted_fields < 2:  # At least 2 fields should be extracted
            logger.warning(f"Low extraction quality: only {extracted_fields} fields extracted")
            return APIResponse(
                success=True,
                message="Image processed but limited data extracted. Please ensure the image is clear and contains Aadhaar information.",
                data=aadhaar_data
            )
        
        logger.info(f"Successfully extracted {extracted_fields} fields from Aadhaar")
        return APIResponse(
            success=True,
            message="Aadhaar data extracted successfully",
            data=aadhaar_data
        )
    
    except HTTPException:
        raise
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