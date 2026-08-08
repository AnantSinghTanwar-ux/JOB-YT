'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { Play, Square, Pause, RotateCcw, UploadCloud } from 'lucide-react';
import axios from 'axios';

interface VideoCaptureProps {
  applicationId: string;
  onUploadSuccess: (videoUrl: string) => void;
  onCancel: () => void;
}

export const VideoCapture: React.FC<VideoCaptureProps> = ({ applicationId, onUploadSuccess, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'finished'>('idle');
  const [uploading, setUploading] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing media devices.', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleStartRecording = () => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    const stream = videoRef.current.srcObject as MediaStream;
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        setRecordedChunks((prev) => [...prev, e.data]);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      setVideoBlob(blob);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
        videoRef.current.controls = true;
      }
    };

    setRecordedChunks([]);
    recorder.start(1000);
    setMediaRecorder(recorder);
    setRecordingState('recording');
  };

  const handlePauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setRecordingState('paused');
    }
  };

  const handleResumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setRecordingState('recording');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecordingState('finished');
      stopCamera();
    }
  };

  const handleRetake = () => {
    setVideoBlob(null);
    setRecordedChunks([]);
    setRecordingState('idle');
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.controls = false;
    }
    startCamera();
  };

  const handleUpload = async () => {
    if (!videoBlob) return;
    setUploading(true);

    try {
      // 1. Get presigned URL
      const { data } = await axios.post('/api/v1/upload/video-session', {
        fileName: `interview-${applicationId}.webm`,
        contentType: 'video/webm',
      });

      const { uploadUrl, fileId } = data.data;

      // 2. Upload directly to MinIO
      await axios.put(uploadUrl, videoBlob, {
        headers: {
          'Content-Type': 'video/webm',
        },
      });

      onUploadSuccess(fileId);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto overflow-hidden bg-gray-900 border-gray-800">
      <CardBody className="p-0">
        <div className="relative aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={recordingState !== 'finished'}
            className="w-full h-full object-cover"
          />
          {recordingState === 'recording' && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/20 text-red-500 px-3 py-1.5 rounded-full animate-pulse backdrop-blur-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-sm font-medium tracking-wide">REC</span>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-gray-900 flex justify-between items-center border-t border-gray-800">
          <div className="flex gap-3">
            {recordingState === 'idle' && (
              <Button onClick={handleStartRecording} className="bg-red-600 hover:bg-red-700 text-white">
                <Play className="w-4 h-4 mr-2" /> Start Recording
              </Button>
            )}
            
            {recordingState === 'recording' && (
              <Button onClick={handlePauseRecording} className="bg-gray-800 text-white hover:bg-gray-700">
                <Pause className="w-4 h-4 mr-2" /> Pause
              </Button>
            )}
            
            {recordingState === 'paused' && (
              <Button onClick={handleResumeRecording} className="bg-gray-800 text-white hover:bg-gray-700">
                <Play className="w-4 h-4 mr-2" /> Resume
              </Button>
            )}
            
            {(recordingState === 'recording' || recordingState === 'paused') && (
              <Button onClick={handleStopRecording} className="bg-red-600 hover:bg-red-700 text-white">
                <Square className="w-4 h-4 mr-2" /> Stop
              </Button>
            )}

            {recordingState === 'finished' && (
              <Button onClick={handleRetake} className="bg-gray-800 text-white hover:bg-gray-700" disabled={uploading}>
                <RotateCcw className="w-4 h-4 mr-2" /> Retake
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={onCancel} disabled={uploading} className="bg-transparent text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700">
              Cancel
            </Button>
            {recordingState === 'finished' && (
              <Button onClick={handleUpload} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {uploading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Uploading...
                  </span>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 mr-2" /> Submit Video
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
