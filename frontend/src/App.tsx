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
  // Filter to show only the 3 required fields: DOB, Aadhaar number, and phone number
  const filteredData = data && typeof data === 'object' ? (() => {
    const filtered: any = {};
    if (data.aadhaar_number) filtered.aadhaar_number = data.aadhaar_number;
    if (data.phone_number) filtered.phone_number = data.phone_number;
    if (data.dob) filtered.dob = data.dob;
    return filtered;
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
                   key.replace(/_/g, ' ')}
                </span>
                <p className="text-gray-900 font-medium text-lg">{String(value)}</p>
              </div>
            ) : null
          )}
        </div>
      )}
      
      {type === 'error' && (
        <p className="text-red-700 bg-red-50 p-3 rounded-lg">{
          typeof data === 'string' ? data : data?.message || 'An error occurred'
        }</p>
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

  // Step 2: Upload Live Photo and Compare with Aadhaar
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
      
      // Use the verify-face endpoint with both images
      const response = await fetch(`${API_BASE}/api/face/verify-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aadhaar_photo_base64: aadhaarData.aadhaar_photo_base64,
          live_photo_base64: livePhotoBase64
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        setFaceResult(result.data);
        
        if (result.data.match && aadhaarData?.phone_number) {
          setPhoneNumber(aadhaarData.phone_number);
          setCurrentStep(3);
        } else if (!result.data.match) {
          setError('Face verification failed. The uploaded photos do not match.');
        } else {
          setError('Face verification successful, but phone number not found in Aadhaar data.');
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
      title: "Live Photo Verification",
      description: "Take or upload a current photo for face verification",
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

              {/* Step 2: Live Photo Upload */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Live Photo</h2>
                  <TealFileUpload
                    onFileSelect={handleLivePhotoUpload}
                    accept="image/*"
                    title="Upload Current Photo"
                    description="Take or upload a current photo of yourself for face verification"
                    isLoading={isLoading}
                  />
                </div>
              )}

              {/* Display Face Match Results */}
              {faceResult && currentStep > 2 && (
                <TealResultDisplay 
                  data={{
                    match_status: faceResult.match ? 'Verified' : 'Failed',
                    confidence: `${Math.round((faceResult.confidence || 0) * 100)}%`,
                    message: faceResult.message
                  }} 
                  type={faceResult.match ? 'success' : 'error'} 
                  title={faceResult.match ? 'Face Verification Successful' : 'Face Verification Failed'} 
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
