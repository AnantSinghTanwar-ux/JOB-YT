'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BrainCircuit, MessageSquare, Code, Users } from 'lucide-react';

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface EvaluationScores {
  communication: Record<string, number>;
  technical: Record<string, number>;
  behavioural: Record<string, number>;
  summary: string;
}

interface VideoPlaybackUIProps {
  videoUrl: string;
  transcriptSegments: TranscriptSegment[];
  evaluationScores: EvaluationScores;
}

export const VideoPlaybackUI: React.FC<VideoPlaybackUIProps> = ({ videoUrl, transcriptSegments, evaluationScores }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-emerald-100 text-emerald-800';
    if (score >= 70) return 'bg-blue-100 text-blue-800';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const renderScoreCard = (title: string, icon: React.ReactNode, scores: Record<string, number>) => (
    <Card className="shadow-sm border-gray-100">
      <CardHeader className="py-3 px-4 bg-gray-50/50 border-b border-gray-50 flex flex-row items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold m-0">{title}</h3>
      </CardHeader>
      <CardBody className="p-4 space-y-3">
        {Object.entries(scores).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</span>
            <Badge className={`font-mono ${getScoreColor(value)}`}>
              {value}/100
            </Badge>
          </div>
        ))}
      </CardBody>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Video Player */}
        <Card className="overflow-hidden shadow-sm border-gray-100 bg-black">
          <video
            ref={videoRef}
            src={videoUrl}
            controls
            className="w-full aspect-video object-contain"
            controlsList="nodownload"
          />
        </Card>

        {/* AI Summary */}
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="py-4">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-bold m-0">AI Evaluation Summary</h3>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-gray-700 leading-relaxed">{evaluationScores.summary}</p>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Transcript Panel */}
        <Card className="shadow-sm border-gray-100 h-[400px] flex flex-col">
          <CardHeader className="py-3 px-4 bg-gray-50/50 border-b border-gray-50 flex-shrink-0">
            <h3 className="text-sm font-semibold flex items-center gap-2 m-0">
              <MessageSquare className="h-4 w-4" /> Transcript
            </h3>
          </CardHeader>
          <CardBody className="p-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto">
              <div className="p-4 space-y-4">
                {transcriptSegments?.map((segment, idx) => {
                  const isActive = currentTime >= segment.start && currentTime <= segment.end;
                  return (
                    <div 
                      key={idx}
                      onClick={() => handleSeek(segment.start)}
                      className={`cursor-pointer transition-colors p-2 rounded-md ${
                        isActive ? 'bg-blue-50 border-l-2 border-blue-600' : 'hover:bg-gray-50 border-l-2 border-transparent'
                      }`}
                    >
                      <span className="text-xs font-mono text-gray-400 block mb-1">
                        {new Date(segment.start * 1000).toISOString().substr(14, 5)}
                      </span>
                      <p className={`text-sm ${isActive ? 'text-blue-900 font-medium' : 'text-gray-600'}`}>
                        {segment.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Score Cards */}
        {renderScoreCard('Communication Skills', <MessageSquare className="h-4 w-4 text-blue-500" />, evaluationScores.communication)}
        {renderScoreCard('Technical Skills', <Code className="h-4 w-4 text-emerald-500" />, evaluationScores.technical)}
        {renderScoreCard('Behavioural Skills', <Users className="h-4 w-4 text-indigo-500" />, evaluationScores.behavioural)}
      </div>
    </div>
  );
};
