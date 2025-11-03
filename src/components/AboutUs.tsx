import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';


interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink: string;
  thumbnailLink: string;
  mimeType: string;
}

const AboutUs: React.FC = () => {
  const { t } = useLanguage();
  const [teamImages, setTeamImages] = useState<GoogleDriveFile[]>([]);
 
  const [loading, setLoading] = useState(true);

  const API_KEY = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY;
  const FOLDER_ID = import.meta.env.VITE_ABOUTUS_FOLDER_ID ;

  useEffect(() => {
    fetchImagesFromGoogleDrive();
  }, []);

  const fetchImagesFromGoogleDrive = async () => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+mimeType+contains+'image'&key=${API_KEY}&fields=files(id,name,webViewLink,thumbnailLink,mimeType)`
      );

      if (response.ok) {
        const data = await response.json();
        const files = data.files || [];
        setTeamImages(files);
      }
    } catch (error) {
      console.error('Error fetching images from Google Drive:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (fileId: string) => {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800-h800`;
  };

  return (
    <section 
      className="min-h-screen bg-black relative overflow-hidden"
      style={{
        backgroundImage: `url('/assets/about_bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">
        <div className="flex justify-center">

          {/* Content */}
          <div className="text-white">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light mb-4 md:mb-6 text-center">
              {t('hero.title')}
            </h2>
            <p className="text-base md:text-lg text-gray-300 mb-8 md:mb-12 leading-relaxed text-center max-w-2xl mx-auto">
              "{t('hero.description')}"
            </p>

            {/* Image Gallery */}
            {loading ? (
              <div className="flex justify-center items-center py-8 md:py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 max-w-2xl mx-auto">
                {teamImages.slice(0, 3).map((image, index) => (
                  <div
                    key={image.id}
                    className={`aspect-square rounded-lg md:rounded-xl overflow-hidden ${index === 2 ? 'sm:col-span-2 md:col-span-1' : ''}`}
                  >
                    <img
                      src={getImageUrl(image.id)}
                      alt={image.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        if (!img.src.includes('uc?export=view')) {
                          img.src = `https://drive.google.com/uc?export=view&id=${image.id}`;
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutUs;