// components/analytics/videos-table.tsx
'use client';

import { useState } from 'react';
import { Play, ThumbsUp, MessageCircle, Eye, Clock } from 'lucide-react';

interface VideoData {
  id: string;
  video_title: string;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
  watch_time_minutes: number;
  avg_view_duration: number;
  thumbnail_url: string;
  video_id?: string; // Ajouté pour les vraies données
}

interface VideosTableProps {
  videos: VideoData[];
}

export function VideosTable({ videos }: VideosTableProps) {
  const [sortBy, setSortBy] = useState<'published_at' | 'views' | 'likes'>('published_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedVideos = [...videos].sort((a, b) => {
    if (sortBy === 'published_at') {
      return sortOrder === 'desc' 
        ? new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
        : new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
    }
    
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-700">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              Vidéo
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('published_at')}
            >
              Date
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('views')}
            >
              <Eye className="inline w-4 h-4 mr-1" />
              Vues
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-700"
              onClick={() => handleSort('likes')}
            >
              <ThumbsUp className="inline w-4 h-4 mr-1" />
              Likes
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              <MessageCircle className="inline w-4 h-4 mr-1" />
              Commentaires
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
              <Clock className="inline w-4 h-4 mr-1" />
              Durée moyenne
            </th>
          </tr>
        </thead>
        <tbody className="bg-gray-900 divide-y divide-gray-800">
          {videos.map((video) => (
  <tr key={video.video_id || video.id} className="hover:bg-gray-800">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="flex-shrink-0 h-12 w-20 relative">
          <img
            className="h-12 w-20 rounded-md object-cover"
            src={video.thumbnail_url}
            alt={video.video_title}
            onError={(e) => {
              // Fallback si l'image ne charge pas
              e.currentTarget.src = `https://picsum.photos/seed/${video.video_id || video.id}/320/180`;
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md">
            <Play className="w-4 h-4 text-white" />
          </div>
        </div>
        <div className="ml-4">
          <div className="text-sm font-medium text-white max-w-xs truncate">
            {video.video_title}
          </div>
        </div>
      </div>
    </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {new Date(video.published_at).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-white">
                  {formatNumber(video.views)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {formatNumber(video.likes)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {formatNumber(video.comments)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                {formatDuration(video.avg_view_duration)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}