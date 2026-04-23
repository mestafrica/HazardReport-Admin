import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import MetricCard from "../components/MetricCard";
import StatusBadge from "../components/StatusBadge";
import { FiHome, FiUsers, FiAlertOctagon, FiPercent, FiPaperclip, FiMapPin, FiMap, FiVolume2, FiX, FiImage, FiFileText, FiFile, FiVideo, FiUpload, FiCheck, FiAlertCircle, FiEye, FiAlertTriangle } from "react-icons/fi";
import toast from "react-hot-toast";
import ghMap from "../assets/images/map_GH.png";
import { useDashboard } from "../context/DashboardContext";
import { LocationData } from "../interfaces/attachment";
import { announcementApi } from "../services/announcementApi";
import { apiCreateReport, CreateReportData } from "../services/reports";

interface UploadedFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  url?: string;
  publicId?: string;
}

const Dashboard: React.FC = () => {
  const { reports, users, reportStats, addReport, addAnnouncement } = useDashboard();
  
  const [announcementText, setAnnouncementText] = useState("");
  const [pinToTop, setPinToTop] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationData, setLocationData] = useState<LocationData>({ text: "" });
  const [showAttachmentPanel, setShowAttachmentPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Report Modal states
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [newReportTitle, setNewReportTitle] = useState("");
  const [newReportCategory, setNewReportCategory] = useState("Floods");
  const [newReportDescription, setNewReportDescription] = useState("");
  const [newReportLocation, setNewReportLocation] = useState("");
  const [newReportCity, setNewReportCity] = useState("");
  const [newReportCountry, setNewReportCountry] = useState("Ghana");
  const [newReportFiles, setNewReportFiles] = useState<UploadedFile[]>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const newReportFileRef = useRef<HTMLInputElement>(null);

  // Recent Reports Moderation pagination
  const [recentReportsPage, setRecentReportsPage] = useState(1);
  const recentReportsItemsPerPage = 5;

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return <FiImage className="text-green-500" />;
    if (ext === 'pdf') return <FiFileText className="text-red-500" />;
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) return <FiVideo className="text-purple-500" />;
    return <FiFile className="text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(file => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 
                          'application/pdf', 'application/msword', 
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                          'video/mp4', 'video/quicktime', 'video/avi', 'video/webm'];
        if (!validTypes.includes(file.type)) {
          toast.error(`Invalid file type: ${file.name}`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File too large: ${file.name} (max 10MB)`);
          return false;
        }
        return true;
      });
      
      const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending'
      }));
      
      setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
      setShowAttachmentPanel(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const simulateUploadProgress = (index: number) => {
    return new Promise<void>((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploadedFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, progress: 100, status: 'uploaded' } : f
          ));
          resolve();
        } else {
          setUploadedFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, progress, status: 'uploading' } : f
          ));
        }
      }, 200);
    });
  };

  const uploadFilesToCloudinary = async () => {
    const pendingFiles = uploadedFiles.filter(f => f.status === 'pending');
    
    for (let i = 0; i < pendingFiles.length; i++) {
      const originalIndex = uploadedFiles.findIndex(f => f.file === pendingFiles[i].file && f.status === 'pending');
      if (originalIndex !== -1) {
        await simulateUploadProgress(originalIndex);
      }
    }
  };

  const handlePostAlert = async () => {
    if (!announcementText.trim()) {
      toast.error("Please enter a message to post.");
      return;
    }

    setIsUploading(true);
    
    try {
      const announcementTitle = "Quick Alert: " + announcementText.substring(0, 30) + (announcementText.length > 30 ? "..." : "");

      if (uploadedFiles.length > 0) {
        await uploadFilesToCloudinary();
        
        try {
          await announcementApi.createAnnouncement(
            {
              title: announcementTitle,
              detail: announcementText,
              category: "Alert",
              status: pinToTop ? "Pinned" : "Active",
              pinToFeed: pinToTop,
              location: locationData.text ? locationData : undefined
            },
            uploadedFiles.map(f => f.file)
          );
        } catch (apiError) {
          console.log('API upload failed, using local URLs:', apiError);
        }
      }

      addAnnouncement({
        title: announcementTitle,
        detail: announcementText,
        category: "Alert",
        status: pinToTop ? "Pinned" : "Active",
        pinToFeed: pinToTop,
        location: locationData.text ? locationData : undefined
      });

      addReport({
        title: announcementText.substring(0, 40) + (announcementText.length > 40 ? "..." : ""),
        hazardtype: "Alert",
        description: announcementText,
        location: locationData.text || "Global",
        city: "Accra",
        country: "Ghana"
      });

      toast.success("Alert posted successfully");
      resetForm();
    } catch (error) {
      console.error('Error posting alert:', error);
      toast.error("Failed to post alert. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setAnnouncementText("");
    setUploadedFiles([]);
    setLocationData({ text: "" });
    setShowLocationInput(false);
    setShowAttachmentPanel(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // New Report handlers
  const resetNewReportForm = () => {
    setNewReportTitle("");
    setNewReportCategory("Floods");
    setNewReportDescription("");
    setNewReportLocation("");
    setNewReportCity("");
    setNewReportCountry("Ghana");
    setNewReportFiles([]);
    setShowNewReportModal(false);
    if (newReportFileRef.current) newReportFileRef.current.value = "";
  };

  const handleNewReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(file => {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          toast.error(`Invalid file type: ${file.name}`);
          return false;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File too large: ${file.name} (max 10MB)`);
          return false;
        }
        return true;
      });

      const newUploadedFiles: UploadedFile[] = validFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending'
      }));

      setNewReportFiles(prev => [...prev, ...newUploadedFiles]);
    }
    if (newReportFileRef.current) newReportFileRef.current.value = "";
  };

  const removeNewReportFile = (index: number) => {
    setNewReportFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitNewReport = async () => {
    if (!newReportTitle.trim() || !newReportDescription.trim()) {
      toast.error("Title and description are required!");
      return;
    }

    setIsSubmittingReport(true);

    try {
      const reportData: CreateReportData = {
        title: newReportTitle,
        hazardtype: newReportCategory,
        description: newReportDescription,
        location: newReportLocation || `${newReportCity}, ${newReportCountry}`,
        city: newReportCity || "Unknown",
        country: newReportCountry || "Ghana"
      };

      const files = newReportFiles.map(f => f.file);
      const response = await apiCreateReport(reportData, files);

      if (response.data?.hazardReport) {
        const createdReport = response.data.hazardReport;

        // Add to local state for immediate display
        addReport({
          title: createdReport.title,
          hazardtype: createdReport.hazardtype || newReportCategory,
          description: newReportDescription,
          location: createdReport.location,
          city: createdReport.city || newReportCity || "Unknown",
          country: createdReport.country || newReportCountry || "Ghana"
        });

        toast.success("Report created successfully!");
        resetNewReportForm();
      }
    } catch (error) {
      console.error('Error creating report:', error);
      toast.error("Failed to create report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/admin-dashboard/moderation" className="block hover:scale-[1.02] transition-transform duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-blue rounded-xl">
          <MetricCard
            icon={<FiHome />}
            iconBgColor="#2563EB"
            iconColor="#FFFFFF"
            title="Total Reports"
            value={reportStats?.totalReports?.toLocaleString() ?? reports.filter(r => r.reportType !== 'announcement').length.toLocaleString()}
            percentage="Live"
            isPositive={true}
          />
        </Link>
        <Link to="/admin-dashboard/users" className="block hover:scale-[1.02] transition-transform duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-blue rounded-xl">
          <MetricCard
            icon={<FiUsers />}
            iconBgColor="#22C55E"
            iconColor="#FFFFFF"
            title="Total Users"
            value={users.length.toLocaleString()}
            percentage="Live"
            isPositive={true}
          />
        </Link>
        <Link to="/admin-dashboard/moderation" className="block hover:scale-[1.02] transition-transform duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-blue rounded-xl">
          <MetricCard
            icon={<FiAlertOctagon />}
            iconBgColor="#EF4444"
            iconColor="#FFFFFF"
            title="Active Hazards"
            value={reportStats?.totalReportsByStatus?.open?.toLocaleString() ?? reports.filter(r => r.status?.toLowerCase() === 'active' || r.status?.toLowerCase() === 'pending').length.toLocaleString()}
            percentage="Pending"
            isPositive={true}
          />
        </Link>
        <Link to="/admin-dashboard/moderation" className="block hover:scale-[1.02] transition-transform duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-blue rounded-xl">
          <MetricCard
            icon={<FiPercent />}
            iconBgColor="#F59E0B"
            iconColor="#FFFFFF"
            title="Pending Moderation"
            value={reportStats?.totalReportsByStatus?.['in progress']?.toLocaleString() ?? reports.filter(r => r.status?.toLowerCase() === 'pending').length.toLocaleString()}
            percentage="Requires Action"
            isPositive={false}
          />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center space-x-2">
              <FiVolume2 className="text-brand-blue text-xl sm:text-2xl" />
              <span>Global Announcement System</span>
            </h2>
            
            <textarea
              className="w-full bg-gray-50 border border-transparent rounded-lg p-3 sm:p-4 h-32 sm:h-40 focus:outline-none focus:ring-1 focus:ring-brand-blue resize-none mb-4 text-sm"
              placeholder="Compose a flood alert or environmental warning..."
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
            />

            {showAttachmentPanel && uploadedFiles.length > 0 && (
              <div className="mb-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <FiPaperclip className="text-purple-600" />
                    </div>
                    <span className="text-sm font-bold text-purple-700">Attachments ({uploadedFiles.length})</span>
                    {uploadedFiles.some(f => f.status === 'uploaded') && (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                        <FiCheck className="text-[10px]" /> Uploaded to Cloud
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                    >
                      <FiUpload /> Add More
                    </button>
                    <button onClick={() => setShowAttachmentPanel(false)} className="text-purple-400 hover:text-purple-600">
                      <FiX />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {uploadedFiles.map((uploadedFile, index) => (
                    <div key={`${uploadedFile.file.name}-${index}`} className="flex items-center gap-3 bg-white rounded-lg p-2 shadow-sm">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {uploadedFile.file.type.startsWith('image/') ? (
                          <img 
                            src={URL.createObjectURL(uploadedFile.file)} 
                            alt="" 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          getFileIcon(uploadedFile.file.name)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{uploadedFile.file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.file.size)}</p>
                      </div>
                      <div className="w-20">
                        {uploadedFile.status === 'uploading' && (
                          <div className="flex items-center gap-1">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-purple-500 transition-all duration-300"
                                style={{ width: `${uploadedFile.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-purple-600">{Math.round(uploadedFile.progress)}%</span>
                          </div>
                        )}
                        {uploadedFile.status === 'uploaded' && (
                          <div className="flex items-center gap-1 text-green-600">
                            <FiCheck />
                            <span className="text-xs">Ready</span>
                          </div>
                        )}
                        {uploadedFile.status === 'pending' && (
                          <div className="text-xs text-gray-400">Pending</div>
                        )}
                        {uploadedFile.status === 'error' && (
                          <div className="flex items-center gap-1 text-red-600">
                            <FiAlertCircle />
                            <span className="text-xs">Failed</span>
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-600 transition-colors">
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {uploadedFiles.length > 0 && !showAttachmentPanel && (
              <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <FiPaperclip className="text-purple-600" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-purple-700">{uploadedFiles.length} file(s) attached</span>
                    <p className="text-xs text-purple-500">
                      {uploadedFiles.filter(f => f.status === 'uploaded').length} uploaded • {uploadedFiles.filter(f => f.status !== 'uploaded').length} pending
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowAttachmentPanel(true)}
                    className="hover:bg-purple-100 p-1.5 rounded-lg transition-colors text-purple-600"
                  >
                    <FiEye />
                  </button>
                  <button 
                    onClick={() => { setUploadedFiles([]); }}
                    className="hover:bg-red-50 p-1.5 rounded-lg transition-colors text-red-400 hover:text-red-600"
                  >
                    <FiX />
                  </button>
                </div>
              </div>
            )}

                {showLocationInput && (
                  <div className="mb-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100 rounded-xl p-4 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <FiMapPin className="text-blue-600" />
                        </div>
                        <span className="text-sm font-bold text-blue-700">Location Tagging</span>
                      </div>
                      <button 
                        onClick={() => { setShowLocationInput(false); setLocationData({ text: "" }); }}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        <FiX />
                      </button>
                    </div>
                    
                    <div className="flex items-center">
                      <FiMapPin className="text-blue-500 mr-2" />
                      <input
                        type="text"
                        placeholder="Enter specific location (e.g. Accra Central)"
                        className="bg-transparent text-sm w-full outline-none text-gray-700 font-medium"
                        value={locationData.text}
                        onChange={(e) => setLocationData({ text: e.target.value })}
                        autoFocus
                      />
                    </div>
                    
                    {locationData.text && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-blue-600 bg-blue-100 rounded-lg p-2">
                        <FiMapPin /> Tagged: {locationData.text}
                      </div>
                    )}
                  </div>
                )}

            <div className="flex justify-between items-center flex-wrap gap-3">
              <div className="flex items-center space-x-4 flex-wrap gap-2">
                <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox text-brand-blue rounded h-4 w-4"
                    checked={pinToTop}
                    onChange={(e) => setPinToTop(e.target.checked)}
                  />
                  <span>Pin to top of public feed</span>
                </label>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.mp4,.mov"
                  onChange={handleFileChange} 
                />
                
                <button 
                  onClick={() => {
                    if (uploadedFiles.length > 0) {
                      setShowAttachmentPanel(!showAttachmentPanel);
                    } else {
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`transition-colors focus:outline-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                    uploadedFiles.length > 0 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                  }`}
                  title="Attach Files"
                >
                  <FiPaperclip className="text-lg" />
                  <span className="text-sm">Attachments</span>
                  {uploadedFiles.length > 0 && (
                    <span className="text-xs bg-purple-500 text-white px-1.5 py-0.5 rounded-full">{uploadedFiles.length}</span>
                  )}
                </button>
                
                <button 
                  onClick={() => {
                    if (locationData.text || showLocationInput) {
                      setShowLocationInput(!showLocationInput);
                    } else {
                      setShowLocationInput(true);
                    }
                  }}
                  className={`transition-colors focus:outline-none flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
                    locationData.text 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-400 hover:text-brand-blue hover:bg-blue-50'
                  }`}
                  title="Add Location"
                >
                  <FiMapPin className="text-lg" />
                  <span className="text-sm">Location</span>
                </button>
              </div>
              
              <button
                onClick={handlePostAlert}
                disabled={isUploading}
                className="bg-gradient-to-r from-brand-blue to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-2 px-8 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:shadow-lg"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <FiVolume2 />
                    <span>Post Alert</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900">Recent Reports Moderation</h2>
              <Link to="/admin-dashboard/moderation" className="text-brand-blue text-sm font-medium hover:underline">
                View all reports &rarr;
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-400 uppercase bg-transparent border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Attachments</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.filter(r => r.reportType !== 'announcement')
                    .slice((recentReportsPage - 1) * recentReportsItemsPerPage, recentReportsPage * recentReportsItemsPerPage)
                    .map((row) => (
                    <tr key={row.id} className="border-b border-gray-50 last:border-none hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{row.date}</span>
                          <span className="text-xs text-gray-400">{row.time}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={row.category} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col max-w-[180px]">
                          <span className="flex items-center gap-1.5 text-gray-700">
                            <FiMapPin className="text-brand-blue text-xs shrink-0" />
                            <span className="truncate text-sm font-medium">{row.location}</span>
                          </span>
                          {row.locationData?.city && (
                            <span className="text-xs text-gray-400 ml-4 truncate">{row.locationData.city}, {row.locationData.country}</span>
                          )}
                          {row.locationData?.coordinates?.latitude && (
                            <span className="text-xs text-blue-500 ml-4 flex items-center gap-1">
                              <FiMap className="text-[10px]" /> 
                              {row.locationData.coordinates.latitude.toFixed(4)}, {row.locationData.coordinates.longitude.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {row.attachmentUrl ? (
                          <div className="flex items-center gap-2">
                            <div className="relative group">
                              <img 
                                src={row.attachmentUrl} 
                                alt="" 
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <FiEye className="text-white" />
                              </div>
                            </div>
                            {row.attachmentName && row.attachmentName.includes(',') && (
                              <span className="text-xs text-brand-blue bg-blue-50 px-2 py-1 rounded-full">
                                +{row.attachmentName.split(',').length - 1}
                              </span>
                            )}
                          </div>
                        ) : row.attachmentName ? (
                          <div className="flex items-center gap-1.5 text-sm text-brand-blue bg-blue-50 px-2 py-1 rounded-lg">
                            <FiPaperclip />
                            <span className="truncate max-w-[80px]">{row.attachmentName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No attachments</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-4">
                        <Link to="/admin-dashboard/moderation" className="text-brand-blue font-medium hover:underline cursor-pointer flex items-center gap-1">
                          <FiEye className="text-xs" /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-6">
              <span className="text-sm text-gray-500 font-medium">
                Showing {Math.min(recentReportsItemsPerPage, reports.filter(r => r.reportType !== 'announcement').length - (recentReportsPage - 1) * recentReportsItemsPerPage)} of {reports.filter(r => r.reportType !== 'announcement').length} reports
              </span>
              <div className="flex space-x-1">
                <button
                  onClick={() => setRecentReportsPage(p => Math.max(1, p - 1))}
                  disabled={recentReportsPage === 1}
                  className="px-3 py-1 border border-gray-200 rounded text-gray-500 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Previous
                </button>
                <div className="flex space-x-1 mx-1">
                  {Array.from({ length: Math.ceil(reports.filter(r => r.reportType !== 'announcement').length / recentReportsItemsPerPage) }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setRecentReportsPage(idx + 1)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer ${
                        recentReportsPage === idx + 1
                          ? 'bg-brand-blue text-white'
                          : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setRecentReportsPage(p => Math.min(Math.ceil(reports.filter(r => r.reportType !== 'announcement').length / recentReportsItemsPerPage), p + 1))}
                  disabled={recentReportsPage === Math.ceil(reports.filter(r => r.reportType !== 'announcement').length / recentReportsItemsPerPage)}
                  className="px-3 py-1 border border-gray-200 rounded text-gray-500 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Hazard Distribution</h2>
          <div className="w-full h-64 bg-gray-50 rounded-lg flex items-center justify-center mb-6 overflow-hidden relative">
            <img 
              src={ghMap} 
              alt="Hazard Distribution Map of Ghana" 
              className="w-full h-full object-contain mix-blend-multiply"
            />
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 sm:p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Regional Hotspot</h3>
            <ul className="space-y-3 font-medium text-xs sm:text-sm">
              <li className="flex justify-between items-center">
                <span className="text-gray-700">High</span>
                <span className="text-red-500">Red</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-700">Moderate</span>
                <span className="text-orange-400">Moderate</span>
              </li>
              <li className="flex justify-between items-center">
                <span className="text-gray-700">Low</span>
                <span className="text-yellow-500">Low</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* New Report Modal */}
      {showNewReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center">
                  <FiAlertTriangle className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">New Hazard Report</h3>
              </div>
              <button onClick={() => resetNewReportForm()} className="text-gray-400 hover:text-gray-600 p-1">
                <FiX className="text-2xl" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Title</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  placeholder="Enter report title..."
                  value={newReportTitle}
                  onChange={(e) => setNewReportTitle(e.target.value)}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Hazard Category</label>
                <div className="flex flex-wrap gap-2">
                  {['Floods', 'Fire', 'Accident', 'Environmental', 'Wildfire', 'Others'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewReportCategory(cat)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all border ${
                        newReportCategory === cat
                          ? 'border-brand-blue text-brand-blue bg-blue-50'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                <textarea
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 h-32 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                  placeholder="Describe the hazard details..."
                  value={newReportDescription}
                  onChange={(e) => setNewReportDescription(e.target.value)}
                />
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-900 mb-2">Location</label>
                  <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3">
                    <FiMapPin className="text-gray-400 mr-2" />
                    <input
                      type="text"
                      className="w-full bg-transparent py-3 text-sm outline-none"
                      placeholder="Full address..."
                      value={newReportLocation}
                      onChange={(e) => setNewReportLocation(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">City</label>
                  <input
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
                    placeholder="City"
                    value={newReportCity}
                    onChange={(e) => setNewReportCity(e.target.value)}
                  />
                </div>
              </div>

              {/* Country */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Country</label>
                <input
                  type="text"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm"
                  placeholder="Country"
                  value={newReportCountry}
                  onChange={(e) => setNewReportCountry(e.target.value)}
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Attachments</label>
                <input
                  type="file"
                  ref={newReportFileRef}
                  className="hidden"
                  multiple
                  accept="image/*"
                  onChange={handleNewReportFileChange}
                />
                <button
                  onClick={() => newReportFileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <FiImage />
                  Add Images
                </button>
                {newReportFiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {newReportFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(file.file)}
                          alt=""
                          className="w-20 h-20 rounded-lg object-cover border border-gray-200"
                        />
                        <button
                          onClick={() => removeNewReportFile(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <FiX className="text-xs" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => resetNewReportForm()}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitNewReport}
                disabled={isSubmittingReport}
                className="bg-brand-blue hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingReport ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <FiCheck />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
