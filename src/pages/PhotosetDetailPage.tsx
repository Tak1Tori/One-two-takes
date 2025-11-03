import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, X, ChevronLeft, ChevronRight, Instagram, Youtube, Facebook, Twitter, ExternalLink } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CookieBanner from '../components/CookieBanner';

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
  photosetsFolder: string;
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

  useEffect(() => {
    const fetchPhotosetDetails = async () => {
      if (!photosetId) return;

      try {
        // Get photoset folder name
        const folderResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${photosetId}?key=${apiKey}&fields=name`
        );

        if (!folderResponse.ok) {
          throw new Error('Failed to fetch photoset details');
        }

        const folderData = await folderResponse.json();
        setPhotosetName(folderData.name);

        // Get photos AND videos from the photoset folder
        const mediaResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${photosetId}'+in+parents+and+(mimeType+contains+'image'+or+mimeType+contains+'video')&key=${apiKey}&fields=files(id,name,mimeType)&pageSize=100`
        );

        if (!mediaResponse.ok) {
          throw new Error('Failed to fetch media files');
        }

        const mediaData = await mediaResponse.json();
        const mediaFiles: DriveFile[] = mediaData.files || [];

        // Categorize media files
        const categories: MediaCategories = {
          photos: [],
          videos: [],
          backstage: []
        };

        mediaFiles.forEach(file => {
          const fileName = file.name.toLowerCase();

          if (fileName.includes('backstage')) {
            categories.backstage.push(file);
          } else if (file.mimeType.includes('video')) {
            categories.videos.push(file);
          } else if (file.mimeType.includes('image')) {
            categories.photos.push(file);
          }
        });

        setMediaCategories(categories);

        // Find main video (prioritize video with "backstage" in name, then first video)
        // First look for backstage video in all videos (not just categorized ones)
        const backstageVideo = mediaFiles.find(file =>
          file.mimeType.includes('video') && file.name.toLowerCase().includes('backstage')
        );
        const mainVideoToShow = backstageVideo || categories.videos[0] || null;
        setMainVideo(mainVideoToShow);

        // Get description from Google Docs file named "descriptions"
        const docsResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${photosetId}'+in+parents+and+name='descriptions'+and+mimeType='application/vnd.google-apps.document'&key=${apiKey}&fields=files(id,name,webContentLink)&pageSize=1`
        );

        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          const descriptionDoc = docsData.files?.[0];

          if (descriptionDoc) {
            try {
              // Export the Google Doc as plain text
              const textResponse = await fetch(
                `https://www.googleapis.com/drive/v3/files/${descriptionDoc.id}/export?mimeType=text/plain&key=${apiKey}`
              );

              if (textResponse.ok) {
                const descriptionText = await textResponse.text();
                setDescription(descriptionText.trim());
              }
            } catch (docError) {
              console.warn('Failed to load description from Google Docs:', docError);
              // Fallback to default description
              setDescription('');
            }
          } else {
            // No description document found, use default
            setDescription('');
          }
        } else {
          // Fallback to default description
          setDescription('');
        }

        // Get social links from "other" file
        const otherResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files?q='${photosetId}'+in+parents+and+name='other'&key=${apiKey}&fields=files(id,name,mimeType)&pageSize=1`
        );

        if (otherResponse.ok) {
          const otherData = await otherResponse.json();
          const otherFile = otherData.files?.[0];

          if (otherFile) {
            try {
              let linksText = '';

              if (otherFile.mimeType === 'application/vnd.google-apps.document') {
                // Google Docs file
                const textResponse = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${otherFile.id}/export?mimeType=text/plain&key=${apiKey}`
                );
                if (textResponse.ok) {
                  linksText = await textResponse.text();
                }
              } else if (otherFile.mimeType === 'text/plain') {
                // Plain text file
                const textResponse = await fetch(
                  `https://www.googleapis.com/drive/v3/files/${otherFile.id}?alt=media&key=${apiKey}`
                );
                if (textResponse.ok) {
                  linksText = await textResponse.text();
                }
              }

              if (linksText.trim()) {
                // Parse links from text (expecting format like "instagram: https://instagram.com/...")
                const links: SocialLink[] = [];
                const lines = linksText.split('\n');

                lines.forEach(line => {
                  const trimmedLine = line.trim();
                  if (trimmedLine && trimmedLine.includes(':') && trimmedLine.includes('http')) {
                    const colonIndex = trimmedLine.indexOf(':');
                    const platform = trimmedLine.substring(0, colonIndex).trim();
                    const url = trimmedLine.substring(colonIndex + 1).trim();

                    if (platform && url && (url.startsWith('http://') || url.startsWith('https://'))) {
                      links.push({
                        platform: platform.trim().toLowerCase(),
                        url: url
                      });
                    }
                  }
                });

                console.log('Parsed social links:', links); // Debug log
                setSocialLinks(links);
              }
            } catch (linksError) {
              console.warn('Failed to load social links:', linksError);
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
  }, [photosetId, apiKey]);

  const getMediaUrl = (file: DriveFile, size: 'thumbnail' | 'full' = 'thumbnail') => {
    // Для thumbnail всегда используем один формат
    if (size === 'thumbnail') {
      return `https://drive.google.com/thumbnail?id=${file.id}&sz=w600-h600`;
    }

    // Для полного размера
    if (file.mimeType.includes('video')) {
      // Для видео используем preview URL для iframe
      return `https://drive.google.com/file/d/${file.id}/preview`;
    }

    // Для изображений
    return `https://drive.google.com/uc?export=view&id=${file.id}`;
  };

  const openModal = (index: number) => {
    setSelectedMediaIndex(index);
  };

  const closeModal = () => {
    setSelectedMediaIndex(null);
  };

  const getCurrentMedia = () => {
    return mediaCategories[activeCategory];
  };

  const nextMedia = () => {
    if (selectedMediaIndex !== null) {
      const currentMedia = getCurrentMedia();
      setSelectedMediaIndex((selectedMediaIndex + 1) % currentMedia.length);
    }
  };

  const prevMedia = () => {
    if (selectedMediaIndex !== null) {
      const currentMedia = getCurrentMedia();
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
                src={`https://drive.google.com/file/d/${mainVideo.id}/preview`}
                className="absolute top-0 left-0 w-full h-full border-none"
                allow="autoplay; fullscreen"
                allowFullScreen
                title={mainVideo.name}
                sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
              />
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
      {selectedMediaIndex !== null && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center">
          <button
            onClick={closeModal}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-200 z-60"
          >
            <X className="w-6 h-6" />
          </button>

          <button
            onClick={prevMedia}
            className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-200 z-60"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={nextMedia}
            className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors duration-200 z-60"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div className="max-w-7xl max-h-[90vh] mx-auto px-6 w-full h-full">
            <div className="relative w-full h-full flex items-center justify-center">
              {getCurrentMedia()[selectedMediaIndex].mimeType.includes('video') ? (
                // Вариант с iframe для видео
                <div className="w-full h-full max-w-6xl max-h-[80vh]">
                  <iframe
                    src={`https://drive.google.com/file/d/${getCurrentMedia()[selectedMediaIndex].id}/preview`}
                    className="w-full h-full border-none rounded-lg"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    title={getCurrentMedia()[selectedMediaIndex].name}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
                  />
                </div>
              ) : (
                // Изображение
                <div className="max-w-full max-h-full">
                  <img
                    src={getMediaUrl(getCurrentMedia()[selectedMediaIndex], 'full')}
                    alt={getCurrentMedia()[selectedMediaIndex].name}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      const fileId = getCurrentMedia()[selectedMediaIndex].id;
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

          {/* Media counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-6 py-3 rounded-full text-center z-60">
            <div className="text-sm text-gray-300">
              {selectedMediaIndex + 1} / {getCurrentMedia().length}
              {getCurrentMedia()[selectedMediaIndex].mimeType.includes('video') && (
                <span className="ml-2 text-blue-300">(Video)</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotosetDetailPage;