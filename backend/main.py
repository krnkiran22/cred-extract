# Aadhaar OCR + Face Match + OTP Verification System - Backend
# Python FastAPI Backend with OCR, Face Recognition, and OTP Verification

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

from app.routers import aadhaar, face, otp
from app.services.ocr_service import OCRService
from app.services.yolo_face_service import YOLOFaceService
from app.services.otp_service import OTPService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
ocr_service = None
yolo_face_service = None
otp_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global ocr_service, yolo_face_service, otp_service
    
    logger.info("Starting Aadhaar Verification System...")
    
    # Initialize services
    ocr_service = OCRService()
    yolo_face_service = YOLOFaceService()
    otp_service = OTPService()
    
    logger.info("All services initialized successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down Aadhaar Verification System...")

# Create FastAPI app
app = FastAPI(
    title="Aadhaar OCR + Face Match + OTP Verification System",
    description="Secure offline Aadhaar verification with OCR, face recognition, and OTP",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(aadhaar.router, prefix="/api/aadhaar", tags=["Aadhaar OCR"])
app.include_router(face.router, prefix="/api/face", tags=["Face Recognition"])
app.include_router(otp.router, prefix="/api/otp", tags=["OTP Verification"])

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Aadhaar Verification System API",
        "version": "1.0.0",
        "status": "active",
        "services": {
            "ocr": "ready",
            "face_recognition": "ready", 
            "otp": "ready"
        }
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    global ocr_service, face_service, otp_service
    
    health_status = {
        "status": "healthy",
        "services": {}
    }
    
    # Check OCR service
    try:
        if ocr_service and await ocr_service.health_check():
            health_status["services"]["ocr"] = "healthy"
        else:
            health_status["services"]["ocr"] = "unhealthy"
    except Exception as e:
        health_status["services"]["ocr"] = f"error: {str(e)}"
    
    # Check Face service
    try:
        if yolo_face_service and await yolo_face_service.health_check():
            health_status["services"]["face"] = "healthy"
        else:
            health_status["services"]["face"] = "unhealthy"
    except Exception as e:
        health_status["services"]["face"] = f"error: {str(e)}"
    
    # Check OTP service
    try:
        if otp_service and await otp_service.health_check():
            health_status["services"]["otp"] = "healthy"
        else:
            health_status["services"]["otp"] = "unhealthy"
    except Exception as e:
        health_status["services"]["otp"] = f"error: {str(e)}"
    
    # Overall status
    if any("unhealthy" in status or "error" in status for status in health_status["services"].values()):
        health_status["status"] = "degraded"
    
    return health_status

# Dependency to get services
def get_ocr_service():
    global ocr_service
    if not ocr_service:
        raise HTTPException(status_code=503, detail="OCR service not available")
    return ocr_service

def get_yolo_face_service():
    global yolo_face_service
    if not yolo_face_service:
        raise HTTPException(status_code=503, detail="YOLO Face service not available")
    return yolo_face_service

def get_otp_service():
    global otp_service
    if not otp_service:
        raise HTTPException(status_code=503, detail="OTP service not available")
    return otp_service

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )