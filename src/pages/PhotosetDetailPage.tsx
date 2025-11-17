import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ChevronLeft, ChevronRight, Instagram, Youtube, Facebook, Twitter, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webContentLink?: string;
}

interface MediaCategories {
  photos: DriveFile[];
  videos: DriveFile[];
  backstage: DriveFile[];
}

interface SocialLink {
  platform: string;
  url: string;
}

interface PhotosetDetailPageProps {
  apiKey: string;
  photosetsFolder?: string;
}

const PhotosetDetailPage: React.FC<PhotosetDetailPageProps> = ({ apiKey }) => {
  const { t } = useLanguage();
  const { photosetId } = useParams<{ photosetId: string }>();
  const navigate = useNavigate();
  const [mediaCategories, setMediaCategories] = useState<MediaCategories>({
    photos: [],
    videos: [],
    backstage: []
  });
  const [activeCategory, setActiveCategory] = useState<'photos' | 'videos' | 'backstage'>('photos');
  const [photosetName, setPhotosetName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [mainVideo, setMainVideo] = useState<DriveFile | null>(null);

  // Helper: return current category array
  const getCurrentMedia = (): DriveFile[] => {
    return mediaCategories[activeCategory] || [];
  };

  useEffect(() => {
    const fetchPhotosetDetails = async () => {
      if (!photosetId) return;

      try {
        setLoading(true);
        setError(null);

        // 1) Get folder (photoset) info (name)
        const folderResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${photosetId}?key=${apiKey}&fields=name`
        );

        if (!folderResponse.ok) {
          throw new Error(`Failed to fetch photoset details (${folderResponse.status})`);
        }

        const folderData = await folderResponse.json();
        setPhotosetName(folderData.name || '');

        // 2) List media files (images + videos) in folder
        // This query gets files with mimeType containing 'image' or 'video'
        const mediaResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${photosetId}'+in+parents+and+(mimeType+contains+'image'+or+mimeType+contains+'video')&key=${apiKey}&fields=files(id,name,mimeType)&pageSize=500`
        );

        if (!mediaResponse.ok) {
          throw new Error(`Failed to fetch media files (${mediaResponse.status})`);
        }

        const mediaData = await mediaResponse.json();
        const mediaFiles: DriveFile[] = mediaData.files || [];

        // Categorize files
        const categories: MediaCategories = {
          photos: [],
          videos: [],
          backstage: []
        };

        mediaFiles.forEach(file => {
          const fileName = (file.name || '').toLowerCase();

          if (fileName.includes('backstage')) {
            categories.backstage.push(file);
          } else if ((file.mimeType || '').includes('video')) {
            categories.videos.push(file);
          } else if ((file.mimeType || '').includes('image')) {
            categories.photos.push(file);
          }
        });

        setMediaCategories(categories);

        // Determine mainVideo: prefer backstage video, otherwise first video
        const backstageVideo = mediaFiles.find(file =>
          (file.mimeType || '').includes('video') && (file.name || '').toLowerCase().includes('backstage')
        );
        const mainVideoToShow = backstageVideo || categories.videos[0] || null;
        setMainVideo(mainVideoToShow);

        // 3) Try to find a plain text "descriptions" file (.txt preferred)
        // First search for plain text file named 'descriptions'
        const descriptionsResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${photosetId}'+in+parents+and+(name='descriptions' or name='descriptions.txt')&key=${apiKey}&fields=files(id,name,mimeType)&pageSize=1`
        );

        if (descriptionsResponse.ok) {
          const descData = await descriptionsResponse.json();
          const descFile = descData.files?.[0];

          if (descFile) {
            try {
              // If it's plain text, fetch alt=media
              if (descFile.mimeType === 'text/plain') {
                const textResponse = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${descFile.id}?alt=media&key=${apiKey}`
                );
                if (textResponse.ok) {
                  const descText = await textResponse.text();
                  setDescription(descText.trim());
                } else {
                  // fallback empty
                  setDescription('');
                }
              } else if (descFile.mimeType === 'application/vnd.google-apps.document') {
                // If it's a Google Doc, attempt export -> note: may fail with API key depending on Google policy
                try {
                  const textResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${descFile.id}/export?mimeType=text/plain&key=${apiKey}`
                  );
                  if (textResponse.ok) {
                    const descText = await textResponse.text();
                    setDescription(descText.trim());
                  } else {
                    // If export fails (likely with API key), fallback to empty string
                    setDescription('');
                  }
                } catch {
                  setDescription('');
                }
              } else {
                setDescription('');
              }
            } catch {
              setDescription('');
            }
          } else {
            setDescription('');
          }
        } else {
          setDescription('');
        }

        // 4) Social links: prefer plain text file named 'other' or 'social' etc.
        const otherResp = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${photosetId}'+in+parents+and+(name='other' or name='other.txt' or name='social' or name='social.txt')&key=${apiKey}&fields=files(id,name,mimeType)&pageSize=1`
        );

        if (otherResp.ok) {
          const otherData = await otherResp.json();
          const otherFile = otherData.files?.[0];

          if (otherFile) {
            try {
              let linksText = '';

              if (otherFile.mimeType === 'text/plain') {
                const textResponse = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${otherFile.id}?alt=media&key=${apiKey}`
                );
                if (textResponse.ok) {
                  linksText = await textResponse.text();
                }
              } else if (otherFile.mimeType === 'application/vnd.google-apps.document') {
                // Attempt export (may fail with API key); prefer using .txt files in public mode
                try {
                  const textResponse = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${otherFile.id}/export?mimeType=text/plain&key=${apiKey}`
                  );
                  if (textResponse.ok) {
                    linksText = await textResponse.text();
                  }
                } catch (err) {
                  // ignore
                }
              }

              if (linksText.trim()) {
                const links: SocialLink[] = [];
                const lines = linksText.split(/\r?\n/);

                lines.forEach(line => {
                  const trimmedLine = line.trim();
                  // expecting "instagram: https://..."
                  if (trimmedLine && trimmedLine.includes(':') && (trimmedLine.includes('http://') || trimmedLine.includes('https://'))) {
                    const colonIndex = trimmedLine.indexOf(':');
                    const platform = trimmedLine.substring(0, colonIndex).trim();
                    const url = trimmedLine.substring(colonIndex + 1).trim();
                    if (platform && url) {
                      links.push({
                        platform: platform.toLowerCase(),
                        url
                      });
                    }
                  }
                });

                setSocialLinks(links);
              }
            } catch {
              // ignore errors
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPhotosetDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photosetId, apiKey]);

  // Build reliable URLs for thumbnails/previews/full view
  const getMediaUrl = (file: DriveFile, size: 'thumbnail' | 'full' = 'thumbnail') => {
    const id = file.id;
    const mime = file.mimeType || '';

    // Thumbnail attempt (works for many images; may not for all videos)
    if (size === 'thumbnail') {
      // Try Drive thumbnail endpoint first (good for images)
      // Fallback to uc?export=view which often returns image preview
      return `https://drive.google.com/thumbnail?id=${id}&sz=w600-h600`;
    }

    // For full size
    if (mime.includes('video')) {
      // Use preview for embedding videos in iframe (preview supports embed)
      return `https://drive.google.com/file/d/${id}/preview`;
    }

    // For images: return uc export view (good for full-resolution image)
    return `https://drive.google.com/uc?export=view&id=${id}`;
  };

  // Open modal for a specific index within a category
  const openModal = (index: number) => {
    const current = getCurrentMedia();
    if (!current || current.length === 0) {
      setSelectedMediaIndex(null);
      return;
    }
    const safeIndex = Math.max(0, Math.min(index, current.length - 1));
    setSelectedMediaIndex(safeIndex);
  };

  const closeModal = () => {
    setSelectedMediaIndex(null);
  };

  const nextMedia = () => {
    if (selectedMediaIndex !== null) {
      const currentMedia = getCurrentMedia();
      if (currentMedia.length === 0) return;
      setSelectedMediaIndex((selectedMediaIndex + 1) % currentMedia.length);
    }
  };

  const prevMedia = () => {
    if (selectedMediaIndex !== null) {
      const currentMedia = getCurrentMedia();
      if (currentMedia.length === 0) return;
      setSelectedMediaIndex(selectedMediaIndex === 0 ? currentMedia.length - 1 : selectedMediaIndex - 1);
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-6 h-6" />;
      case 'youtube':
        return <Youtube className="w-6 h-6" />;
      case 'facebook':
        return <Facebook className="w-6 h-6" />;
      case 'twitter':
        return <Twitter className="w-6 h-6" />;
      default:
        return <ExternalLink className="w-6 h-6" />;
    }
  };

  // If loading or error — render early
  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-white text-xl">{t('loading.photoset')}</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-red-400 text-xl">{t('error.prefix')}{error}</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <div className="container mx-auto px-8 py-16 max-w-7xl">
        {/* Back button and title */}
        <div className="flex items-center mb-12">
          <button
            onClick={() => navigate('/photosets')}
            className="flex items-center gap-3 text-white hover:text-gray-300 transition-colors duration-200 mr-8"
          >
            <ArrowLeft className="w-6 h-6" />
            <span className="text-lg">{t('photosets.backToPhotosets')}</span>
          </button>
        </div>

        {/* Photoset title */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-light tracking-wider mb-6">{photosetName}</h1>
          <p className="text-gray-400 text-lg whitespace-pre-line">
            {description}
          </p>

          {/* Social Links */}
          {socialLinks.length > 0 && (
            <div className="flex justify-center gap-4 mt-8">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-300 text-white hover:text-gray-300"
                  title={`${link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}`}
                >
                  {getSocialIcon(link.platform)}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Main Video Section - Full width under description */}
        {mainVideo && (
          <div className="w-full mb-16">
            <div className="relative w-full h-0 pb-[56.25%] bg-gray-900 rounded-lg overflow-hidden"> {/* 16:9 aspect ratio */}
              <iframe
                src={`https://drive.google.com/file/d/${mainVideo.id}/preview?rm=minimal`}
                className="absolute top-0 left-0 w-full h-full border-none"
                allow="autoplay; fullscreen"
                allowFullScreen
                title={mainVideo.name}
                sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
              />
            </div>
          </div>
        )}

        {/* Videos Section */}
        {mediaCategories.videos.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl md:text-3xl font-light mb-8 text-center">
              {t('photosets.videos')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {mediaCategories.videos.map((file, index) => (
                <div
                  key={file.id}
                  className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group relative aspect-square"
                  onClick={() => {
                    setActiveCategory('videos');
                    openModal(index);
                  }}
                >
                  <img
                    src={getMediaUrl(file, 'thumbnail')}
                    alt={file.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      const fileId = file.id;
                      // fallback chain for thumbnails: uc?export=view -> thumbnail with id param
                      if (!img.src.includes('uc?export=view')) {
                        img.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
                      } else if (!img.src.includes('thumbnail')) {
                        img.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w600-h600`;
                      } else {
                        img.src = `https://drive.google.com/uc?id=${fileId}`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos Section */}
        {mediaCategories.photos.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl md:text-3xl font-light mb-8 text-center">
              {t('photosets.photos')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {mediaCategories.photos.map((file, index) => (
                <div
                  key={file.id}
                  className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group relative aspect-square"
                  onClick={() => {
                    setActiveCategory('photos');
                    openModal(index);
                  }}
                >
                  <img
                    src={getMediaUrl(file, 'thumbnail')}
                    alt={file.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      const fileId = file.id;
                      if (!img.src.includes('uc?export=view')) {
                        img.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
                      } else if (!img.src.includes('uc?id=')) {
                        img.src = `https://drive.google.com/uc?id=${fileId}`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backstage Section */}
        {mediaCategories.backstage.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl md:text-3xl font-light mb-8 text-center">
              {t('photosets.backstage')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mediaCategories.backstage.map((file, index) => (
                <div
                  key={file.id}
                  className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer group relative aspect-[16/9]"
                  onClick={() => {
                    setActiveCategory('backstage');
                    openModal(index);
                  }}
                >
                  {file.mimeType.includes('video') ? (
                    <>
                      <img
                        src={getMediaUrl(file, 'thumbnail')}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const fileId = file.id;
                          if (!img.src.includes('uc?export=view')) {
                            img.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
                          } else if (!img.src.includes('uc?id=')) {
                            img.src = `https://drive.google.com/uc?id=${fileId}`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <img
                        src={getMediaUrl(file, 'thumbnail')}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const fileId = file.id;
                          if (!img.src.includes('uc?export=view')) {
                            img.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
                          } else if (!img.src.includes('uc?id=')) {
                            img.src = `https://drive.google.com/uc?id=${fileId}`;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />

      {/* Modal for full-size media */}
      {selectedMediaIndex !== null && (() => {
        const current = getCurrentMedia();
        // guard against empty current category
        if (!current || current.length === 0 || selectedMediaIndex < 0 || selectedMediaIndex >= current.length) {
          return null;
        }
        const file = current[selectedMediaIndex];

        return (
          <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
            <div className="max-w-7xl max-h-[90vh] mx-auto px-6 w-full h-full">
              <div className="relative w-full h-full flex items-center justify-center">
                {file.mimeType.includes('video') ? (
                  <div className="w-full h-full max-w-6xl max-h-[80vh]">
                    <iframe
                      // IMPORTANT: use /preview for embedable url
                      src={`https://drive.google.com/file/d/${file.id}/preview?rm=minimal`}
                      className="w-full h-full border-none rounded-lg"
                      allow="autoplay; fullscreen"
                      allowFullScreen
                      title={file.name}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={getMediaUrl(file, 'full')}
                      alt={file.name}
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        const fileId = file.id;
                        if (!img.src.includes('uc?export=view')) {
                          img.src = `https://drive.google.com/uc?export=view&id=${fileId}`;
                        } else if (!img.src.includes('thumbnail')) {
                          img.src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920-h1080`;
                        } else {
                          img.src = `https://drive.google.com/uc?id=${fileId}`;
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={closeModal}
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-200"
            >
              <X className="w-6 h-6" />
            </button>

            <button
              onClick={prevMedia}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-200"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={nextMedia}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-200"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-6 py-3 rounded-full text-center">
              <div className="text-sm text-gray-300">
                {selectedMediaIndex + 1} / {current.length}
                {file.mimeType.includes('video') && (
                  <span className="ml-2 text-blue-300">(Video)</span>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default PhotosetDetailPage;
