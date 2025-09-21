import React, { useState } from 'react';
import { 
  DocumentCheckIcon, 
  FaceSmileIcon, 
  PhoneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CloudArrowUpIcon,
  ArrowRightIcon,
  CameraIcon
} from '@heroicons/react/24/outline';

// Types and Interfaces
interface AadhaarData {
  name?: string;
  date_of_birth?: string;
  gender?: string;
  phone?: string;
  aadhaar_number?: string;
  address?: string;
  father_name?: string;
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

// Sui-themed Step Component
const SuiStep: React.FC<StepProps> = ({ number, title, description, isActive, isCompleted, icon }) => (
  <div className={`sui-step ${isActive ? 'active' : ''}`}>
    <div className={`sui-step-icon ${isCompleted ? 'completed' : isActive ? 'active' : 'inactive'}`}>
      {isCompleted ? <CheckCircleIcon className="w-8 h-8" /> : icon}
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-500">Step {number}</span>
        {isActive && (
          <div className="sui-loading"></div>
        )}
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  </div>
);

// Sui-themed File Upload Component
interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept: string;
  title: string;
  description: string;
  isLoading: boolean;
  disabled?: boolean;
}

const SuiFileUpload: React.FC<FileUploadProps> = ({ 
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
      className={`sui-upload-zone ${isDragOver ? 'dragover' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          isDragOver ? 'text-green-500' : 'text-blue-500'
        }`} />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4 text-center">{description}</p>
        
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="sui-loading"></div>
            <span className="text-gray-600">Processing...</span>
          </div>
        ) : (
          <button className="sui-button" disabled={disabled}>
            <CameraIcon className="w-5 h-5 mr-2" />
            Choose File or Drop Here
          </button>
        )}
      </div>
    </div>
  );
};

// Sui-themed Result Display Component
interface ResultDisplayProps {
  data: any;
  type: 'success' | 'error';
  title: string;
  onRetry?: () => void;
}

const SuiResultDisplay: React.FC<ResultDisplayProps> = ({ data, type, title, onRetry }) => (
  <div className={`sui-result-card ${type} mb-6`}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {type === 'success' ? (
          <CheckCircleIcon className="w-8 h-8 text-green-600" />
        ) : (
          <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
        )}
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
      </div>
      {type === 'error' && onRetry && (
        <button onClick={onRetry} className="sui-button text-sm px-4 py-2">
          Retry
        </button>
      )}
    </div>
    
    {type === 'success' && data && typeof data === 'object' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(data).map(([key, value]) => 
          value ? (
            <div key={key} className="bg-white p-3 rounded-lg border border-gray-200">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {key.replace(/_/g, ' ')}
              </span>
              <p className="text-gray-900 font-medium mt-1">{String(value)}</p>
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
  const [aadhaarSessionId, setAadhaarSessionId] = useState('');
  const [liveSessionId, setLiveSessionId] = useState('');
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
    setAadhaarSessionId('');
    setLiveSessionId('');
    setPhoneNumber('');
  };

  // Step 1: Upload Aadhaar Card for OCR
  const handleAadhaarUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await handleApiCall('/api/aadhaar/upload-aadhaar-photo', formData);
      
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

  // Step 2: Upload Aadhaar Face Photo
  const handleAadhaarFaceUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await handleApiCall('/api/face/upload-aadhaar-face', formData);
      
      if (result.success && result.data?.session_id) {
        setAadhaarSessionId(result.data.session_id);
        setCurrentStep(3);
      } else {
        setError(result.message || 'Failed to process face from Aadhaar. Please ensure the face is clearly visible.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the face image');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Upload Live Photo and Compare
  const handleLivePhotoUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First upload the live photo
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResult = await handleApiCall('/api/face/upload-live-photo', formData);
      
      if (uploadResult.success && uploadResult.data?.session_id) {
        setLiveSessionId(uploadResult.data.session_id);
        
        // Then compare faces
        await compareFaces(aadhaarSessionId, uploadResult.data.session_id);
      } else {
        setError(uploadResult.message || 'Failed to process live photo. Please ensure the face is clearly visible.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the live photo');
    } finally {
      setIsLoading(false);
    }
  };

  // Compare faces using session IDs
  const compareFaces = async (aadhaarSId: string, liveSId: string) => {
    try {
      const formData = new FormData();
      formData.append('aadhaar_session_id', aadhaarSId);
      formData.append('live_session_id', liveSId);
      
      const result = await handleApiCall('/api/face/compare-faces', formData);
      
      if (result.success && result.data) {
        setFaceResult(result.data);
        
        if (result.data.match && aadhaarData?.phone) {
          setPhoneNumber(aadhaarData.phone);
          setCurrentStep(4);
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
    }
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
        setCurrentStep(5);
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
        setCurrentStep(6);
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
      title: "Face from Aadhaar",
      description: "Upload the face photo section from your Aadhaar card",
      icon: <FaceSmileIcon className="w-8 h-8" />,
      isActive: currentStep === 2,
      isCompleted: currentStep > 2
    },
    {
      number: 3,
      title: "Live Photo",
      description: "Take or upload a current photo for face verification",
      icon: <CameraIcon className="w-8 h-8" />,
      isActive: currentStep === 3,
      isCompleted: currentStep > 3
    },
    {
      number: 4,
      title: "Generate OTP",
      description: "Send OTP to your registered mobile number",
      icon: <PhoneIcon className="w-8 h-8" />,
      isActive: currentStep === 4,
      isCompleted: currentStep > 4
    },
    {
      number: 5,
      title: "Verify OTP",
      description: "Enter the OTP received on your mobile",
      icon: <CheckCircleIcon className="w-8 h-8" />,
      isActive: currentStep === 5,
      isCompleted: currentStep > 5
    }
  ];

  const progressPercentage = ((currentStep - 1) / 5) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header Section */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 sui-pulse">
            Sui Foundry
          </h1>
          <h2 className="text-2xl font-semibold text-blue-400 mb-4">
            Aadhaar Verification System
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Secure offline verification with OCR data extraction, face recognition, and OTP verification
          </p>
        </div>

        {/* Progress Bar */}
        <div className="sui-progress-bar">
          <div 
            className="sui-progress-fill"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Steps Sidebar */}
          <div className="lg:col-span-1">
            <div className="sui-card p-6 sticky top-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Verification Steps</h3>
              <div className="space-y-4">
                {steps.map((step) => (
                  <SuiStep key={step.number} {...step} />
                ))}
              </div>
              
              {currentStep > 1 && (
                <button 
                  onClick={resetProcess}
                  className="w-full mt-6 sui-button bg-gray-600 hover:bg-gray-700"
                >
                  Start Over
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="sui-card p-8">
              {/* Error Display */}
              {error && (
                <SuiResultDisplay 
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
                  <SuiFileUpload
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
                <SuiResultDisplay 
                  data={aadhaarData} 
                  type="success" 
                  title="Aadhaar Data Extracted Successfully" 
                />
              )}

              {/* Step 2: Aadhaar Face Upload */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Face from Aadhaar</h2>
                  <SuiFileUpload
                    onFileSelect={handleAadhaarFaceUpload}
                    accept="image/*"
                    title="Upload Face Section"
                    description="Upload a clear crop of the face photo portion from your Aadhaar card"
                    isLoading={isLoading}
                  />
                </div>
              )}

              {/* Step 3: Live Photo Upload */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Live Photo</h2>
                  <SuiFileUpload
                    onFileSelect={handleLivePhotoUpload}
                    accept="image/*"
                    title="Upload Current Photo"
                    description="Take or upload a current photo of yourself for face verification"
                    isLoading={isLoading}
                  />
                </div>
              )}

              {/* Display Face Match Results */}
              {faceResult && currentStep > 3 && (
                <SuiResultDisplay 
                  data={{
                    match_status: faceResult.match ? 'Verified' : 'Failed',
                    confidence: `${Math.round((faceResult.confidence || 0) * 100)}%`,
                    message: faceResult.message
                  }} 
                  type={faceResult.match ? 'success' : 'error'} 
                  title={faceResult.match ? 'Face Verification Successful' : 'Face Verification Failed'} 
                />
              )}

              {/* Step 4: Generate OTP */}
              {currentStep === 4 && (
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
                      className="sui-button text-lg px-8 py-3"
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="sui-loading"></div>
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

              {/* Step 5: Verify OTP */}
              {currentStep === 5 && (
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
                      className="sui-input text-center text-2xl tracking-wider mb-6 font-bold"
                    />
                    <button 
                      onClick={verifyOtp}
                      disabled={isLoading || otpCode.length !== 6}
                      className="sui-button w-full text-lg py-3"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="sui-loading"></div>
                          Verifying...
                        </div>
                      ) : (
                        'Verify OTP'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Success */}
              {currentStep === 6 && otpResult && (
                <div className="text-center">
                  <SuiResultDisplay 
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
                      className="sui-button text-lg px-8 py-3"
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
