import random
import string
from datetime import datetime, timedelta
from typing import Dict, Optional
import re

class OTPService:
    def __init__(self):
        self.otp_storage = {}  # In production, use Redis or database
        self.otp_expiry_minutes = 5  # OTP expires in 5 minutes
    
    def generate_otp(self, phone: str) -> str:
        """Generate 6-digit OTP for phone number"""
        try:
            # Validate phone number
            if not self.validate_phone(phone):
                raise Exception("Invalid phone number format")
            
            # Generate 6-digit OTP
            otp = ''.join(random.choices(string.digits, k=6))
            
            # Store OTP with expiry time
            expiry_time = datetime.now() + timedelta(minutes=self.otp_expiry_minutes)
            self.otp_storage[phone] = {
                'otp': otp,
                'expiry': expiry_time,
                'attempts': 0
            }
            
            return otp
        
        except Exception as e:
            raise Exception(f"Error generating OTP: {str(e)}")
    
    def verify_otp(self, phone: str, provided_otp: str) -> bool:
        """Verify OTP for phone number"""
        try:
            # Validate phone number
            if not self.validate_phone(phone):
                raise Exception("Invalid phone number format")
            
            # Check if OTP exists for this phone
            if phone not in self.otp_storage:
                raise Exception("No OTP found for this phone number")
            
            otp_data = self.otp_storage[phone]
            
            # Check if OTP has expired
            if datetime.now() > otp_data['expiry']:
                # Clean up expired OTP
                del self.otp_storage[phone]
                raise Exception("OTP has expired. Please generate a new OTP.")
            
            # Check attempt limit (max 3 attempts)
            if otp_data['attempts'] >= 3:
                # Clean up after max attempts
                del self.otp_storage[phone]
                raise Exception("Maximum OTP verification attempts exceeded. Please generate a new OTP.")
            
            # Increment attempt counter
            otp_data['attempts'] += 1
            
            # Verify OTP
            if otp_data['otp'] == provided_otp:
                # OTP verified successfully, clean up
                del self.otp_storage[phone]
                return True
            else:
                raise Exception(f"Invalid OTP. {3 - otp_data['attempts']} attempts remaining.")
        
        except Exception as e:
            raise Exception(f"Error verifying OTP: {str(e)}")
    
    def validate_phone(self, phone: str) -> bool:
        """Validate Indian phone number format"""
        # Remove any non-digit characters
        phone_clean = re.sub(r'\D', '', phone)
        
        # Check if it's a valid 10-digit Indian mobile number
        if len(phone_clean) == 10 and phone_clean[0] in '6789':
            return True
        
        return False
    
    def get_otp_status(self, phone: str) -> Dict:
        """Get OTP status for phone number"""
        if phone not in self.otp_storage:
            return {
                'exists': False,
                'message': 'No OTP found for this phone number'
            }
        
        otp_data = self.otp_storage[phone]
        
        # Check if expired
        if datetime.now() > otp_data['expiry']:
            del self.otp_storage[phone]
            return {
                'exists': False,
                'message': 'OTP has expired'
            }
        
        # Calculate remaining time
        remaining_seconds = int((otp_data['expiry'] - datetime.now()).total_seconds())
        
        return {
            'exists': True,
            'attempts_remaining': 3 - otp_data['attempts'],
            'expires_in_seconds': remaining_seconds,
            'message': f'OTP valid for {remaining_seconds} seconds'
        }
    
    def cleanup_expired_otps(self):
        """Clean up expired OTPs (should be called periodically)"""
        current_time = datetime.now()
        expired_phones = [
            phone for phone, data in self.otp_storage.items()
            if current_time > data['expiry']
        ]
        
        for phone in expired_phones:
            del self.otp_storage[phone]
        
        return len(expired_phones)
    
    def send_otp_sms(self, phone: str, otp: str) -> bool:
        """Send OTP via SMS (mock implementation)"""
        # In production, integrate with SMS service like Twilio, AWS SNS, etc.
        try:
            # Mock SMS sending
            print(f"SMS: Your Aadhaar verification OTP is {otp}. Valid for {self.otp_expiry_minutes} minutes. Do not share with anyone.")
            
            # Log for development purposes
            print(f"DEBUG: OTP {otp} generated for phone {phone}")
            
            return True
        
        except Exception as e:
            print(f"Error sending SMS: {str(e)}")
            return False

# Global OTP service instance
otp_service = None

def get_otp_service() -> OTPService:
    """Get OTP service instance"""
    global otp_service
    if otp_service is None:
        otp_service = OTPService()
    return otp_service