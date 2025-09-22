import React, { useState } from 'react';
import { 
  DocumentCheckIcon, 
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  ArrowRightIcon,
  CameraIcon
} from '@heroicons/react/24/outline';
import LiveCamera from './components/LiveCamera';

// Types and Interfaces
interface AadhaarData {
  aadhaar_number?: string;
  phone_number?: string;
  dob?: string;
  aadhaar_photo_base64?: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface FaceMatchResult {
  match: boolean;
  confidence: number;
  message: string;
  otp_sent?: boolean;
  otp_message?: string;
  phone_number?: string;
  verification_method?: string;
  distance?: number;
  threshold?: number;
  error_type?: string;
}

interface StepProps {
  number: number;
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  icon: React.ReactNode;
}

// Teal-themed Step Component
const TealStep: React.FC<StepProps> = ({ number, title, description, isActive, isCompleted, icon }) => (
  <div className={`teal-step ${isActive ? 'active' : ''}`}>
    <div className={`teal-step-icon ${isCompleted ? 'completed' : isActive ? 'active' : 'inactive'}`}>
      {isCompleted ? <CheckCircleIcon className="w-8 h-8" /> : icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-500">Step {number}</span>
        {isActive && (
          <div className="teal-loading"></div>
        )}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
);

// Teal-themed File Upload Component
interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept: string;
  title: string;
  description: string;
  isLoading: boolean;
  disabled?: boolean;
}

const TealFileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  accept, 
  title, 
  description, 
  isLoading,
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isLoading) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files[0] && files[0].type.startsWith('image/')) {
      onFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files[0]) {
      onFileSelect(files[0]);
    }
  };

  const handleClick = () => {
    if (!isLoading && !disabled) {
      document.getElementById('file-input')?.click();
    }
  };

  return (
    <div 
      className={`teal-upload-zone ${isDragOver ? 'dragover' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onClick={handleClick}
    >
      <input
        id="file-input"
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        disabled={isLoading || disabled}
      />
      
      <div className="flex flex-col items-center">
        <CloudArrowUpIcon className={`w-16 h-16 mb-4 transition-colors ${
          isDragOver ? 'text-teal-accent' : 'text-teal-primary'
        }`} />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4 text-center">{description}</p>
        
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="teal-loading"></div>
            <span className="text-gray-600">Processing...</span>
          </div>
        ) : (
          <button className="teal-button" disabled={disabled}>
            <CameraIcon className="w-5 h-5 mr-2" />
            Choose File or Drop Here
          </button>
        )}
      </div>
    </div>
  );
};

// Teal-themed Result Display Component
interface ResultDisplayProps {
  data: any;
  type: 'success' | 'error';
  title: string;
  onRetry?: () => void;
}

const TealResultDisplay: React.FC<ResultDisplayProps> = ({ data, type, title, onRetry }) => {
  // Filter to show only the 3 required fields for Aadhaar data: DOB, Aadhaar number, and phone number
  // For face verification, show all relevant data
  const isAadhaarData = data && typeof data === 'object' && data.aadhaar_number;
  const filteredData = data && typeof data === 'object' ? (() => {
    if (isAadhaarData) {
      // Filter for Aadhaar data
      const filtered: any = {};
      if (data.aadhaar_number) filtered.aadhaar_number = data.aadhaar_number;
      if (data.phone_number) filtered.phone_number = data.phone_number;
      if (data.dob) filtered.dob = data.dob;
      return filtered;
    } else {
      // Show all data for face verification or other results
      return data;
    }
  })() : data;

  return (
    <div className={`teal-result-card ${type} mb-6`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {type === 'success' ? (
            <CheckCircleIcon className="w-8 h-8 text-teal-600" />
          ) : (
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          )}
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>
        {type === 'error' && onRetry && (
          <button onClick={onRetry} className="teal-button text-sm px-4 py-2">
            Retry
          </button>
        )}
      </div>
      
      {type === 'success' && filteredData && typeof filteredData === 'object' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(filteredData).map(([key, value]) => 
            value ? (
              <div key={key} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-sm font-semibold text-teal-600 uppercase tracking-wide block mb-2">
                  {key === 'aadhaar_number' ? 'Aadhaar Number' : 
                   key === 'phone_number' ? 'Phone Number' : 
                   key === 'dob' ? 'Date of Birth' :
                   key === 'match_status' ? 'Verification Status' :
                   key === 'confidence' ? 'Match Confidence' :
                   key === 'verification_method' ? 'Detection Method' :
                   key === 'distance' ? 'Face Distance' :
                   key.replace(/_/g, ' ')}
                </span>
                <p className="text-gray-900 font-medium text-lg">{String(value)}</p>
              </div>
            ) : null
          )}
        </div>
      )}
      
      {type === 'error' && filteredData && typeof filteredData === 'object' && (
        <div className="space-y-3">
          {Object.entries(filteredData).map(([key, value]) => 
            value ? (
              <div key={key} className="bg-red-50 p-3 rounded-lg border border-red-200">
                <span className="text-sm font-semibold text-red-600 uppercase tracking-wide block mb-1">
                  {key === 'match_status' ? 'Verification Status' :
                   key === 'confidence' ? 'Match Confidence' :
                   key === 'verification_method' ? 'Detection Method' :
                   key === 'distance' ? 'Face Distance' :
                   key === 'message' ? 'Details' :
                   key.replace(/_/g, ' ')}
                </span>
                <p className="text-red-800 font-medium">{String(value)}</p>
              </div>
            ) : null
          )}
        </div>
      )}
      
      {type === 'error' && typeof data === 'string' && (
        <p className="text-red-700 bg-red-50 p-3 rounded-lg border border-red-200">{data}</p>
      )}
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  // State Management
  const [currentStep, setCurrentStep] = useState(1);
  const [aadhaarData, setAadhaarData] = useState<AadhaarData | null>(null);
  const [faceResult, setFaceResult] = useState<FaceMatchResult | null>(null);
  const [otpResult, setOtpResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // API Configuration
  const API_BASE = 'http://localhost:8000';

  // Utility function for API calls
  const handleApiCall = async (url: string, formData: FormData): Promise<ApiResponse> => {
    try {
      const response = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      console.error('API call failed:', err);
      throw new Error('Network error: Please ensure the backend server is running on localhost:8000');
    }
  };

  // Reset the entire process
  const resetProcess = () => {
    setCurrentStep(1);
    setAadhaarData(null);
    setFaceResult(null);
    setOtpResult(null);
    setError(null);
    setOtpCode('');
    setPhoneNumber('');
  };

  // Step 1: Upload Aadhaar Card for OCR
  const handleAadhaarUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await handleApiCall('/api/aadhaar/extract-aadhaar-data', formData);
      
      if (result.success && result.data) {
        setAadhaarData(result.data);
        setCurrentStep(2);
      } else {
        setError(result.message || 'Failed to process Aadhaar image. Please ensure the image is clear and readable.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the Aadhaar image');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Live Camera Verification with Liveness Detection
  const handleLiveCameraCapture = async (capturedFrames: string[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!aadhaarData?.aadhaar_photo_base64) {
        setError('Aadhaar photo not found. Please upload Aadhaar card first.');
        return;
      }

      if (!aadhaarData?.phone_number) {
        setError('Phone number not found in Aadhaar data. Cannot proceed with verification.');
        return;
      }

      if (!capturedFrames || capturedFrames.length === 0) {
        setError('No live frames captured. Please try again.');
        return;
      }
      
      // Use the best frame (usually the last one - final straight look)
      const bestFrame = capturedFrames[capturedFrames.length - 1];
      
      // Use the verify-face endpoint with Aadhaar photo and live frame
      const response = await fetch(`${API_BASE}/api/face/verify-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar_photo_base64: aadhaarData.aadhaar_photo_base64,
          live_photo_base64: bestFrame.split(',')[1], // Remove data:image/jpeg;base64, prefix
          phone_number: aadhaarData.phone_number
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Parse specific error types from backend
        let errorMessage = result.detail || result.message || `HTTP error! status: ${response.status}`;
        
        if (errorMessage.includes('No face detected in Aadhaar photo')) {
          errorMessage = '❌ No face detected in your Aadhaar card. Please upload a clear Aadhaar image.';
        } else if (errorMessage.includes('No face detected in live photo')) {
          errorMessage = '❌ No face detected in the live photo. Please ensure your face is clearly visible.';
        } else if (errorMessage.includes('Multiple faces detected in Aadhaar photo')) {
          errorMessage = '❌ Multiple faces found in Aadhaar photo. Please use an Aadhaar with only one person.';
        } else if (errorMessage.includes('Multiple faces detected in live photo')) {
          errorMessage = '❌ Multiple faces detected. Please ensure only you are visible in the photo.';
        } else if (errorMessage.includes('Face too small')) {
          errorMessage = '❌ Face is too small or unclear. Please move closer to the camera.';
        }
        
        setError(errorMessage);
        return;
      }
      
      if (result.success && result.data) {
        setFaceResult(result.data);
        
        if (result.data.match) {
          // Face verification successful - now user can manually generate OTP
          setPhoneNumber(aadhaarData.phone_number);
          setCurrentStep(3); // Move to Generate OTP step
          setError(null);
        } else {
          // Face verification failed - show specific error based on error type
          let failureMessage = result.data.message;
          
          if (result.data.error_type === 'no_face_aadhaar') {
            failureMessage = '❌ No face detected in Aadhaar photo';
          } else if (result.data.error_type === 'no_face_live') {
            failureMessage = '❌ No face detected in live photo';
          } else if (result.data.error_type === 'multiple_faces_aadhaar') {
            failureMessage = '❌ Multiple faces detected in Aadhaar photo';
          } else if (result.data.error_type === 'multiple_faces_live') {
            failureMessage = '❌ Multiple faces detected in live photo';
          } else {
            failureMessage = `❌ Face verification failed - faces do not match (${result.data.confidence?.toFixed(1)}% confidence)`;
          }
          
          setError(failureMessage);
        }
      } else {
        setError(result.message || 'Live face verification failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Live face verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Legacy photo upload handler (kept for fallback)
  const handleLivePhotoUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert file to base64
      const livePhotoBase64 = await fileToBase64(file);
      
      if (!aadhaarData?.aadhaar_photo_base64) {
        setError('Aadhaar photo not found. Please upload Aadhaar card first.');
        return;
      }

      if (!aadhaarData?.phone_number) {
        setError('Phone number not found in Aadhaar data. Cannot proceed with verification.');
        return;
      }
      
      // Use the verify-face endpoint with both images and phone number
      const response = await fetch(`${API_BASE}/api/face/verify-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar_photo_base64: aadhaarData.aadhaar_photo_base64,
          live_photo_base64: livePhotoBase64,
          phone_number: aadhaarData.phone_number
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        // Handle specific backend errors (400, 500, etc.)
        const errorMessage = result.detail || result.message || `HTTP error! status: ${response.status}`;
        setError(errorMessage);
        return;
      }
      
      if (result.success && result.data) {
        setFaceResult(result.data);
        
        if (result.data.match) {
          // Face verification successful - now user can manually generate OTP
          setPhoneNumber(aadhaarData.phone_number);
          setCurrentStep(3); // Move to Generate OTP step
          setError(null);
        } else {
          // Face verification failed - show detailed reason
          const failureMessage = result.data.message || 'Face verification failed. The faces do not match with sufficient confidence.';
          setError(`Face verification failed: ${failureMessage}`);
        }
      } else {
        setError(result.message || 'Face comparison failed. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Face comparison failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Utility function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Step 4: Generate OTP
  const generateOtp = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('phone', phoneNumber);
      
      const result = await handleApiCall('/api/otp/generate-otp', formData);
      
      if (result.success) {
        setCurrentStep(4);
      } else {
        setError(result.message || 'Failed to generate OTP. Please check the phone number.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 5: Verify OTP
  const verifyOtp = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('phone', phoneNumber);
      formData.append('otp', otpCode);
      
      const result = await handleApiCall('/api/otp/verify-otp', formData);
      
      if (result.success) {
        setOtpResult(result.data);
        setCurrentStep(5);
      } else {
        setError(result.message || 'OTP verification failed. Please check the code and try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Define verification steps
  const steps = [
    {
      number: 1,
      title: "Upload Aadhaar Card",
      description: "Upload a clear photo of your Aadhaar card for data extraction",
      icon: <DocumentCheckIcon className="w-8 h-8" />,
      isActive: currentStep === 1,
      isCompleted: currentStep > 1
    },
    {
      number: 2,
      title: "Live Face Verification",
      description: "Complete liveness detection with camera: look straight, turn left/right, open mouth",
      icon: <CameraIcon className="w-8 h-8" />,
      isActive: currentStep === 2,
      isCompleted: currentStep > 2
    },
    {
      number: 3,
      title: "Generate OTP",
      description: "Send OTP to your registered mobile number",
      icon: <PhoneIcon className="w-8 h-8" />,
      isActive: currentStep === 3,
      isCompleted: currentStep > 3
    },
    {
      number: 4,
      title: "Verify OTP",
      description: "Enter the OTP received on your mobile",
      icon: <CheckCircleIcon className="w-8 h-8" />,
      isActive: currentStep === 4,
      isCompleted: currentStep > 4
    }
  ];

  const progressPercentage = ((currentStep - 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 teal-pulse">
            Sui Foundry
          </h1>
          <h2 className="text-2xl font-semibold text-teal-400 mb-4">
            Aadhaar Verification System
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Secure offline verification with OCR data extraction, face recognition, and OTP verification
          </p>
        </div>

        {/* Progress Bar */}
        <div className="teal-progress-bar">
          <div 
            className="teal-progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Steps Sidebar */}
          <div className="lg:col-span-1">
            <div className="teal-card p-6 sticky top-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Verification Steps</h3>
              <div className="space-y-4">
                {steps.map((step) => (
                  <TealStep key={step.number} {...step} />
                ))}
              </div>
              
              {currentStep > 1 && (
                <button 
                  onClick={resetProcess}
                  className="w-full mt-6 teal-button bg-gray-600 hover:bg-gray-700"
                >
                  Start Over
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="teal-card p-8">
              {/* Error Display */}
              {error && (
                <TealResultDisplay 
                  data={error} 
                  type="error" 
                  title="Error Occurred"
                  onRetry={() => setError(null)}
                />
              )}

              {/* Step 1: Aadhaar Upload */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Aadhaar Card</h2>
                  <TealFileUpload
                    onFileSelect={handleAadhaarUpload}
                    accept="image/*"
                    title="Upload Aadhaar Card Image"
                    description="Choose a clear, high-quality image of your Aadhaar card. Both front and back sides are supported."
                    isLoading={isLoading}
                  />
                </div>
              )}

              {/* Display Extracted Aadhaar Data */}
              {aadhaarData && currentStep > 1 && (
                <TealResultDisplay 
                  data={aadhaarData} 
                  type="success" 
                  title="Aadhaar Data Extracted Successfully" 
                />
              )}

              {/* Step 2: Live Camera Verification with Liveness Detection */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Live Face Verification</h2>
                  <p className="text-gray-600 mb-6">
                    Complete the liveness verification by following the on-screen instructions. 
                    This ensures you are physically present and prevents photo spoofing.
                  </p>
                  <LiveCamera
                    onCaptureComplete={handleLiveCameraCapture}
                    onError={setError}
                    isActive={currentStep === 2}
                  />
                  
                  {/* Fallback: Photo Upload Option */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Camera not working? Upload a photo instead
                    </h3>
                    <TealFileUpload
                      onFileSelect={handleLivePhotoUpload}
                      accept="image/*"
                      title="Upload Current Photo"
                      description="Take or upload a current photo for face verification"
                      isLoading={isLoading}
                    />
                  </div>
                </div>
              )}

              {/* Display Face Match Results */}
              {faceResult && currentStep > 2 && (
                <TealResultDisplay 
                  data={{
                    verification_status: faceResult.match ? 'Face Verified ✓' : 'Face Verification Failed ✗',
                    confidence: `${faceResult.confidence?.toFixed(1) || 0}%`,
                    method: faceResult.verification_method || 'face_recognition',
                    ...(faceResult.distance !== undefined && { 
                      face_distance: faceResult.distance.toFixed(3),
                      threshold: faceResult.threshold?.toFixed(3) || '0.600'
                    }),
                    message: faceResult.message
                  }} 
                  type={faceResult.match ? 'success' : 'error'} 
                  title={faceResult.match ? '✅ Face Verification Successful' : '❌ Face Verification Failed'} 
                />
              )}

              {/* Step 3: Generate OTP */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Generate OTP</h2>
                  <div className="text-center">
                    <p className="text-gray-600 mb-6">
                      We'll send an OTP to your registered mobile number: 
                      <span className="font-semibold text-gray-900 ml-2">{phoneNumber}</span>
                    </p>
                    <button 
                      onClick={generateOtp}
                      disabled={isLoading}
                      className="teal-button text-lg px-8 py-3"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="teal-loading"></div>
                          Sending OTP...
                        </div>
                      ) : (
                        <>
                          Generate OTP
                          <ArrowRightIcon className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Verify OTP */}
              {currentStep === 4 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Verify OTP</h2>
                  <div className="max-w-md mx-auto">
                    <p className="text-gray-600 mb-4 text-center">
                      Enter the 6-digit OTP sent to {phoneNumber}
                    </p>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter OTP"
                      maxLength={6}
                      className="teal-input text-center text-2xl tracking-wider mb-6 font-bold"
                    />
                    <button 
                      onClick={verifyOtp}
                      disabled={isLoading || otpCode.length !== 6}
                      className="teal-button w-full text-lg py-3"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="teal-loading"></div>
                          Verifying...
                        </div>
                      ) : (
                        'Verify OTP'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Success */}
              {currentStep === 5 && otpResult && (
                <div className="text-center">
                  <TealResultDisplay 
                    data={{
                      verification_status: 'Complete',
                      aadhaar_verified: 'Yes',
                      face_verified: 'Yes',
                      phone_verified: 'Yes',
                      timestamp: new Date().toLocaleString()
                    }} 
                    type="success" 
                    title="🎉 Verification Complete!" 
                  />
                  <div className="mt-8 space-y-4">
                    <p className="text-gray-600 text-lg">
                      All verification steps have been completed successfully!
                    </p>
                    <button 
                      onClick={resetProcess}
                      className="teal-button text-lg px-8 py-3"
                    >
                      Start New Verification
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
