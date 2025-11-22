import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Phone, Mail, Instagram, Youtube,} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ContactsPage: React.FC = () => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    vorname: '',
    nachname: '',
    email: '',
    telefon: '',
    datum: '',
    produkte: '',
    informationen: '',
    anzahlBilder: ''
  });

  const [selectedImageCount, setSelectedImageCount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // const handleImageCountSelect = (count: string) => {
  //   setSelectedImageCount(count);
  //   setFormData(prev => ({
  //     ...prev,
  //     anzahlBilder: count
  //   }));
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Prepare email content
      const emailContent = {
        to: 'Onetwotakes@gmail.com',
        subject: 'Neue Kontaktanfrage von der Website',
        body: `
Neue Kontaktanfrage:

Persönliche Daten:
- Vorname: ${formData.vorname}
- Nachname: ${formData.nachname}
- E-Mail: ${formData.email}
- Telefonnummer: ${formData.telefon}

Projektdetails:
- Datum der Dreharbeiten: ${formData.datum}
- Welche Produkte: ${formData.produkte}
- Anzahl der Bilder je Auftrag: ${selectedImageCount}

Weitere Informationen:
${formData.informationen}

---
Diese Nachricht wurde über das Kontaktformular der Website gesendet.
        `
      };

      // For now, we'll use mailto as a fallback
      // In production, you would integrate with an email service like EmailJS, Formspree, or a backend API
      const mailtoLink = `mailto:Onetwotakes@gmail.com?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`;

      // Open default email client
      window.location.href = mailtoLink;

      setSubmitMessage(t('contacts.success'));

      // Reset form after successful submission
      setTimeout(() => {
        setFormData({
          vorname: '',
          nachname: '',
          email: '',
          telefon: '',
          datum: '',
          produkte: '',
          informationen: '',
          anzahlBilder: ''
        });
        setSelectedImageCount('');
        setSubmitMessage('');
      }, 3000);

    } catch (error) {
      console.error('Error sending email:', error);
      setSubmitMessage(t('contacts.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // const imageCountOptions = [
  //   '1-10', '10-20', '20-30',
  //   '30-40', '40-50', '50-60',
  //   '60-70', '70-80', '80-90'
  // ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 lg:py-16 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16">

          {/* Left Column - Contact Information */}
          <div className="space-y-6 md:space-y-8">
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-light mb-4 md:mb-6">{t('contacts.title')}</h1>

            </div>

            {/* Contact Details */}
            <div className="flex items-center gap-4">
              <Mail className="w-5 h-5 md:w-6 md:h-6 text-white flex-shrink-0" />
              <span className="text-lg md:text-xl">Onetwotakes@gmail.com</span>
            </div>
            <div className="flex items-center gap-4">
              <Phone className="w-5 h-5 md:w-6 md:h-6 text-white flex-shrink-0" />
              <span className="text-lg md:text-xl">+49 176 327 472 66</span>
            </div>
            <div className="flex items-center gap-4">
              <Instagram className="w-5 h-5 md:w-6 md:h-6 text-white flex-shrink-0" />
              <a className="text-lg md:text-xl" href="https://www.instagram.com/onetwotakes_prod/" target="_blank" rel="noopener noreferrer">Onetwotakes_prod</a>
            </div>
            <div className="flex items-center gap-4">
              <Youtube className="w-5 h-5 md:w-6 md:h-6 text-white flex-shrink-0" />
              <a className="text-lg md:text-xl" href="https://www.youtube.com/@Onetwotakes_prod" target="_blank" rel="noopener noreferrer">Onetwotakes</a>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <div className="space-y-4 md:space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">

              {/* Name Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-xs md:text-sm mb-2">{t('contacts.firstName')}</label>
                  <input
                    type="text"
                    name="vorname"
                    value={formData.vorname}
                    onChange={handleInputChange}
                    placeholder="Name"
                    className="w-full px-3 md:px-4 py-2 md:py-3 bg-white text-black placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm md:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-xs md:text-sm mb-2">{t('contacts.email')}</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@gmail.com"
                    className="w-full px-3 md:px-4 py-2 md:py-3 bg-white text-black placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm md:text-base"
                    required
                  />
                </div>

              </div>

              {/* Email and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>
                  <label className="block text-gray-400 text-xs md:text-sm mb-2">{t('contacts.phone')}</label>
                  <input
                    type="tel"
                    name="telefon"
                    value={formData.telefon}
                    onChange={handleInputChange}
                    placeholder="+49123456789"
                    className="w-full px-3 md:px-4 py-2 md:py-3 bg-white text-black placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 text-sm md:text-base"
                    required
                  />
                </div>
              </div>

              {/* Date and Products */}


              {/* Additional Information */}
              <div>
                <label className="block text-gray-400 text-xs md:text-sm mb-2">{t('contacts.additionalInfo')}</label>
                <textarea
                  name="informationen"
                  value={formData.informationen}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 md:px-4 py-2 md:py-3 bg-white text-black placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/20 resize-none text-sm md:text-base"
                />
              </div>


              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 md:px-8 py-3 md:py-4 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
              >
                {isSubmitting ? t('contacts.sending') : t('contacts.sendRequest')}
              </button>

              {/* Submit Message */}
              {submitMessage && (
                <div className={`text-center p-3 md:p-4 rounded-lg text-sm md:text-base ${submitMessage.includes('Fehler') ? 'bg-red-900/20 text-red-400' : 'bg-green-900/20 text-green-400'
                  }`}>
                  {submitMessage}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ContactsPage;