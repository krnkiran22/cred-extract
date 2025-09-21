import cv2
import numpy as np
import easyocr
import re
import base64
from typing import Optional, Dict, Tuple
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
        """Extract date of birth from Aadhaar text with improved regex"""
        print(f"DEBUG - Searching for DOB in text: {text[:200]}...")
        
        # Multiple patterns for different DOB formats
        dob_patterns = [
            # DOB: 22/10/2004 or DOB: 22-10-2004
            r'DOB\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
            # Date of Birth: 22/10/2004
            r'Date\s+of\s+Birth\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
            # Born: 22/10/2004
            r'Born\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
            # Standalone date patterns (DD/MM/YYYY or DD-MM-YYYY)
            r'\b(\d{1,2}[/-]\d{1,2}[/-](?:19|20)\d{2})\b',
            # Common Aadhaar formats
            r'(\d{2}/\d{2}/\d{4})',
            r'(\d{2}-\d{2}-\d{4})'
        ]
        
        for i, pattern in enumerate(dob_patterns):
            matches = re.findall(pattern, text, re.IGNORECASE)
            print(f"DEBUG - Pattern {i+1} '{pattern}' found: {matches}")
            
            for match in matches:
                if isinstance(match, tuple):
                    dob = match[0] if match[0] else match
                else:
                    dob = match
                
                # Validate date format and range
                if self._is_valid_date(dob):
                    # Standardize format to DD/MM/YYYY
                    dob = re.sub(r'[-]', '/', dob)
                    print(f"DEBUG - Valid DOB found: {dob}")
                    return dob
        
        print("DEBUG - No valid DOB found")
        return None
    
    def _is_valid_date(self, date_str: str) -> bool:
        """Validate if the date string is a reasonable birth date"""
        try:
            # Remove any extra spaces and standardize separators
            date_str = re.sub(r'[-]', '/', date_str.strip())
            
            # Parse date
            day, month, year = map(int, date_str.split('/'))
            
            # Basic validation
            if not (1 <= day <= 31 and 1 <= month <= 12 and 1900 <= year <= 2010):
                return False
            
            # Additional validation with datetime
            from datetime import datetime
            datetime(year, month, day)
            return True
        except (ValueError, IndexError):
            return False
        
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
        """Extract phone number from Aadhaar text with improved regex"""
        print(f"DEBUG - Searching for phone in text: {text[:200]}...")
        
        # Multiple patterns for different phone formats
        phone_patterns = [
            # Mobile: 9876543210 or Phone: 9876543210
            r'(?:Mobile|Phone|Mob|Contact)\s*:?\s*([6-9]\d{9})',
            # Standalone 10-digit numbers starting with 6-9
            r'\b([6-9]\d{9})\b',
            # Numbers with spaces or dashes (e.g., 98765 43210 or 9876-5-43210)
            r'\b([6-9]\d{4})\s*[-\s]*(\d{5})\b',
            # With country code patterns
            r'\+91\s*([6-9]\d{9})',
            r'91\s*([6-9]\d{9})'
        ]
        
        for i, pattern in enumerate(phone_patterns):
            matches = re.findall(pattern, text, re.IGNORECASE)
            print(f"DEBUG - Phone pattern {i+1} '{pattern}' found: {matches}")
            
            for match in matches:
                if isinstance(match, tuple):
                    # Handle patterns with multiple groups (like space-separated numbers)
                    if len(match) == 2 and match[0] and match[1]:
                        phone = match[0] + match[1]  # Combine parts
                    else:
                        phone = match[0] if match[0] else match[1]
                else:
                    phone = match
                
                # Validate phone number
                phone = re.sub(r'[\s-]', '', phone)  # Remove spaces and dashes
                if len(phone) == 10 and phone.isdigit() and phone[0] in '6789':
                    print(f"DEBUG - Valid phone found: {phone}")
                    return phone
        
        print("DEBUG - No valid phone found")
        return None
    
    def extract_aadhaar_number(self, text: str) -> Optional[str]:
        """Extract Aadhaar number from text with improved regex"""
        # Improved pattern for Aadhaar number (12-digit starting with 2-9, spaces allowed)
        aadhaar_regex = r"\b[2-9]{1}[0-9]{3}\s?[0-9]{4}\s?[0-9]{4}\b"
        
        match = re.search(aadhaar_regex, text)
        if match:
            aadhaar = match.group(0)
            # Remove any existing spaces and reformat
            aadhaar_clean = re.sub(r'\s', '', aadhaar)
            if len(aadhaar_clean) == 12 and aadhaar_clean.isdigit():
                # Format as XXXX XXXX XXXX for display
                return f"{aadhaar_clean[:4]} {aadhaar_clean[4:8]} {aadhaar_clean[8:]}"
        
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
    
    def extract_photo_from_aadhaar(self, image_bytes: bytes) -> Optional[str]:
        """Extract user photo from Aadhaar card and return as base64"""
        try:
            # Convert bytes to PIL Image
            pil_image = Image.open(io.BytesIO(image_bytes))
            
            # Convert PIL to OpenCV format
            opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            
            # Get image dimensions
            height, width = opencv_image.shape[:2]
            
            # Aadhaar card photo is typically located in the left side
            # Standard Aadhaar dimensions ratio and photo position
            # Photo is usually in the left 1/4 of the card, top 1/2
            photo_x_start = int(width * 0.05)  # Start 5% from left
            photo_x_end = int(width * 0.35)    # End at 35% from left
            photo_y_start = int(height * 0.15)  # Start 15% from top
            photo_y_end = int(height * 0.75)    # End at 75% from top
            
            # Extract the photo region
            photo_region = opencv_image[photo_y_start:photo_y_end, photo_x_start:photo_x_end]
            
            # Convert back to PIL Image
            photo_rgb = cv2.cvtColor(photo_region, cv2.COLOR_BGR2RGB)
            photo_pil = Image.fromarray(photo_rgb)
            
            # Resize to standard size (passport photo size)
            photo_pil = photo_pil.resize((150, 200), Image.LANCZOS)
            
            # Convert to base64
            buffer = io.BytesIO()
            photo_pil.save(buffer, format='JPEG', quality=85)
            photo_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return photo_base64
            
        except Exception as e:
            print(f"Error extracting photo: {str(e)}")
            return None
    
    def extract_aadhaar_data(self, image_bytes: bytes) -> Dict:
        """Extract focused Aadhaar data: Aadhaar number, phone, DOB, and photo"""
        try:
            # Extract text from image
            extracted_text = self.extract_text(image_bytes)
            print(f"DEBUG - Extracted text: {extracted_text}")
            
            # Extract only the three required fields
            aadhaar_number = self.extract_aadhaar_number(extracted_text)
            print(f"DEBUG - Aadhaar number: {aadhaar_number}")
            
            phone = self.extract_phone(extracted_text)
            print(f"DEBUG - Phone: {phone}")
            
            dob = self.extract_dob(extracted_text)
            print(f"DEBUG - DOB: {dob}")
            
            # Extract user photo from Aadhaar
            aadhaar_photo_base64 = self.extract_photo_from_aadhaar(image_bytes)
            print(f"DEBUG - Photo extracted: {aadhaar_photo_base64 is not None}")
            
            return {
                'aadhaar_number': aadhaar_number,
                'phone_number': phone,
                'dob': dob,
                'aadhaar_photo_base64': aadhaar_photo_base64,
                'raw_text': extracted_text,
                'success': True
            }
        except Exception as e:
            print(f"DEBUG - Error in extraction: {str(e)}")
            return {
                'error': f"Error processing Aadhaar data: {str(e)}",
                'success': False
            }

# Global OCR service instance
ocr_service = None

def get_ocr_service() -> OCRService:
    """Get OCR service instance"""
    global ocr_service
    if ocr_service is None:
        ocr_service = OCRService()
    return ocr_service