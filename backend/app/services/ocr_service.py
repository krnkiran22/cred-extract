import cv2
import numpy as np
import easyocr
import re
from typing import Optional, Dict
from PIL import Image
import io

class OCRService:
    def __init__(self):
        self.reader = easyocr.Reader(['en'])
    
    def preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        """Preprocess image for better OCR accuracy"""
        # Convert bytes to PIL Image
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL to OpenCV format
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        
        # Convert to grayscale
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply adaptive threshold
        thresh = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        # Morphological operations to clean up the image
        kernel = np.ones((1, 1), np.uint8)
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
        
        return cleaned
    
    def extract_text(self, image_bytes: bytes) -> str:
        """Extract text from image using EasyOCR"""
        try:
            # Preprocess the image
            processed_image = self.preprocess_image(image_bytes)
            
            # Use EasyOCR to extract text
            results = self.reader.readtext(processed_image)
            
            # Combine all detected text
            extracted_text = ' '.join([result[1] for result in results])
            
            return extracted_text
        except Exception as e:
            raise Exception(f"Error extracting text: {str(e)}")
    
    def extract_name(self, text: str) -> Optional[str]:
        """Extract name from Aadhaar text"""
        # Common patterns for names on Aadhaar
        name_patterns = [
            r'(?:Name|NAME)[\s:]*([A-Z][A-Z\s]+?)(?:\n|DOB|Date|Gender|Male|Female|$)',
            r'^([A-Z][A-Z\s]+?)(?:\n|DOB|Date|Gender|Male|Female)',
            r'([A-Z][A-Z\s]{2,30})(?:\s+(?:Male|Female|MALE|FEMALE))'
        ]
        
        for pattern in name_patterns:
            match = re.search(pattern, text, re.MULTILINE | re.IGNORECASE)
            if match:
                name = match.group(1).strip()
                # Clean up the name
                name = re.sub(r'\s+', ' ', name)
                if len(name) > 3 and len(name) < 50:
                    return name
        
        return None
    
    def extract_dob(self, text: str) -> Optional[str]:
        """Extract date of birth from Aadhaar text"""
        # Patterns for date of birth
        dob_patterns = [
            r'(?:DOB|Date of Birth|Born)[\s:]*(\d{2}[/-]\d{2}[/-]\d{4})',
            r'(?:DOB|Date of Birth|Born)[\s:]*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
            r'(\d{2}[/-]\d{2}[/-]\d{4})',
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})'
        ]
        
        for pattern in dob_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                dob = match.group(1)
                # Standardize format to DD/MM/YYYY
                dob = re.sub(r'[-]', '/', dob)
                return dob
        
        return None
    
    def extract_gender(self, text: str) -> Optional[str]:
        """Extract gender from Aadhaar text"""
        gender_patterns = [
            r'(Male|Female|MALE|FEMALE|M|F)\b'
        ]
        
        for pattern in gender_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                gender = match.group(1).upper()
                if gender in ['M', 'MALE']:
                    return 'Male'
                elif gender in ['F', 'FEMALE']:
                    return 'Female'
        
        return None
    
    def extract_phone(self, text: str) -> Optional[str]:
        """Extract phone number from Aadhaar text"""
        # Pattern for Indian mobile numbers
        phone_patterns = [
            r'(?:Mobile|Phone|Mob)[\s:]*([6-9]\d{9})',
            r'\b([6-9]\d{9})\b'
        ]
        
        for pattern in phone_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                phone = match.group(1)
                if len(phone) == 10 and phone[0] in '6789':
                    return phone
        
        return None
    
    def extract_aadhaar_number(self, text: str) -> Optional[str]:
        """Extract Aadhaar number from text"""
        # Pattern for Aadhaar number (12 digits with optional spaces)
        aadhaar_patterns = [
            r'\b(\d{4}\s?\d{4}\s?\d{4})\b',
            r'\b(\d{12})\b'
        ]
        
        for pattern in aadhaar_patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                # Remove spaces and check if it's a valid Aadhaar format
                aadhaar = re.sub(r'\s', '', match)
                if len(aadhaar) == 12 and aadhaar.isdigit():
                    # Format as XXXX XXXX XXXX
                    return f"{aadhaar[:4]} {aadhaar[4:8]} {aadhaar[8:]}"
        
        return None
    
    def extract_address(self, text: str) -> Optional[str]:
        """Extract address from Aadhaar text"""
        # This is more complex as address can vary greatly
        # We'll look for common address patterns
        lines = text.split('\n')
        
        # Look for lines that might contain address
        address_lines = []
        skip_keywords = ['name', 'dob', 'male', 'female', 'aadhaar', 'uid', 'government']
        
        for line in lines:
            line_clean = line.strip().lower()
            if (len(line_clean) > 10 and 
                not any(keyword in line_clean for keyword in skip_keywords) and
                not re.match(r'^\d{2}[/-]\d{2}[/-]\d{4}', line_clean) and
                not re.match(r'^[6-9]\d{9}', line_clean)):
                address_lines.append(line.strip())
        
        if address_lines:
            # Take the longest line as potential address or combine multiple lines
            return ' '.join(address_lines[:2])  # Take first 2 address lines
        
        return None
    
    def extract_aadhaar_data(self, image_bytes: bytes) -> Dict:
        """Extract all Aadhaar data from image"""
        try:
            # Extract text from image
            extracted_text = self.extract_text(image_bytes)
            
            # Extract individual fields
            name = self.extract_name(extracted_text)
            dob = self.extract_dob(extracted_text)
            gender = self.extract_gender(extracted_text)
            phone = self.extract_phone(extracted_text)
            aadhaar_number = self.extract_aadhaar_number(extracted_text)
            address = self.extract_address(extracted_text)
            
            return {
                'name': name,
                'date_of_birth': dob,
                'gender': gender,
                'phone': phone,
                'aadhaar_number': aadhaar_number,
                'address': address,
                'raw_text': extracted_text
            }
        
        except Exception as e:
            raise Exception(f"Error processing Aadhaar data: {str(e)}")

# Global OCR service instance
ocr_service = None

def get_ocr_service() -> OCRService:
    """Get OCR service instance"""
    global ocr_service
    if ocr_service is None:
        ocr_service = OCRService()
    return ocr_service