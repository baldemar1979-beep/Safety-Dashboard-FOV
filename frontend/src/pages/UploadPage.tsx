import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import api from '../api';
import { Upload } from '../types';

interface UploadResult {
  message: string;
  upload_id: number;
  event_count: number;
  week_number: number;
  year_number: number;
}

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Upload[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const loadHistory = useCallback(async () => {
    if (historyLoaded) return;
    try {
      const r = await api.get<Upload[]>('/events/uploads/history');
      setHistory(r.data);
      setHistoryLoaded(true);
    } catch (err) {
      console.error(err);
    }
  }, [historyLoaded]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const r = await api.post<UploadResult>('/events/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(r.data);
      setHistoryLoaded(false); // reload history
      loadHistory();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [loadHistory]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    disabled: uploading,
  });

  // Load history on mount
  useEffect(() => { loadHistory(); }, [loadHistory]);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload FOV Data</h1>
        <p className="text-gray-500 mt-1">Upload your weekly Excel file containing FOV alert data</p>
      </div>

      {/* Upload Zone */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            {uploading ? (
              <p className="text-blue-600 font-medium">Uploading and processing...</p>
            ) : isDragActive ? (
              <p className="text-blue-600 font-medium">Drop the file here</p>
            ) : (
              <>
                <p className="text-gray-700 font-medium">Drag & drop your Excel file here</p>
                <p className="text-gray-400 text-sm">or click to browse</p>
                <p className="text-gray-400 text-xs mt-2">Supports .xlsx, .xls, .csv files</p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Upload successful!</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-green-600 font-medium text-2xl">{result.event_count.toLocaleString()}</p>
                <p className="text-green-600">Events imported</p>
              </div>
              <div>
                <p className="text-green-600 font-medium text-2xl">W{result.week_number}</p>
                <p className="text-green-600">Week number</p>
              </div>
              <div>
                <p className="text-green-600 font-medium text-2xl">{result.year_number}</p>
                <p className="text-green-600">Year</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expected Format */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Expected Column Format</h2>
        <p className="text-sm text-gray-500 mb-3">Your Excel file should contain the following columns (column names are case-sensitive):</p>
        <div className="overflow-x-auto">
          <div className="flex flex-wrap gap-2">
            {[
              'event_id', 'vehicle_id', 'vehicle', 'driver', 'detection_time',
              'utc_offset', 'event_type', 'detected_event_type', 'duration_seconds',
              'speed_kph', 'travel_metres', 'latitude', 'longitude', 'audio_alert',
              'vibration_alert', 'visual_alert', 'trip_distance_metres', 'trip_time_seconds',
              'confirmation', 'confirmation_time', 'classification', 'fleet', 'timezone',
              'account', 'service_provider', 'shift', 'crew', 'guardian_unit',
              'software_version', 'tags'
            ].map((col) => (
              <span key={col} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono bg-gray-100 text-gray-700 border border-gray-200">
                {col}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Upload History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Filename</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Uploaded By</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Week</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Events</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((upload) => (
                  <tr key={upload.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">{upload.filename}</td>
                    <td className="py-2 px-3">{upload.uploaded_by_name || '—'}</td>
                    <td className="py-2 px-3">W{upload.week_number}/{upload.year_number}</td>
                    <td className="py-2 px-3 text-right font-semibold">{upload.event_count?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-gray-500">{new Date(upload.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
