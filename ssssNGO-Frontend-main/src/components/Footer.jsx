import { motion } from "framer-motion";
import { Facebook, Heart, Instagram, Mail, MapPin, MessageCircle, Phone, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-[#0C2C55] to-[#296374] text-white mt-10">
      <div className="max-w-7xl mx-auto px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">

        {/* NGO INFO */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-lg font-semibold">
            Swabhiman Shiksha Sanskriti Samajotthan Nyas
          </h2>
          <p className="text-sm mt-2 text-gray-200">
            शिक्षा • संस्कृति • समाज सेवा
          </p>
          <p className="text-xs mt-2 text-gray-300">
            Empowering society through education and cultural values.
          </p>
        </motion.div>

        {/* QUICK LINKS */}
        <div>
          <h3 className="font-semibold mb-3">Quick Links</h3>
          <ul className="space-y-2 text-sm text-gray-200">
            <li>
              <Link to="/" className="hover:text-white">Home</Link>
            </li>
            <li>
              <Link to="/Posts" className="hover:text-white">Posts</Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-white">About</Link>
            </li>
            <li>
              <Link to="/sangathan" className="hover:text-white">Sangathan</Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-white">Contact</Link>
            </li>
            <li>
              <Link to="/donate" className="hover:text-white">Donate</Link>
            </li>

          </ul>
        </div>

        {/* SOCIAL MEDIA */}
        <div className="lg:-ml-4 lg:mr-4">
          <h3 className="font-semibold mb-3">Follow Us</h3>
          <div className="space-y-2 text-sm text-gray-200">
            <a
              href="https://youtube.com/@swabhiman-b3q?si=aAweicb-4OpLm76l"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on YouTube"
              className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-red-500/20 text-red-300 group-hover:bg-red-500 group-hover:text-white">
                <Youtube size={17} aria-hidden="true" />
              </span>
              <span>YouTube</span>
            </a>
            <a
              href="https://www.facebook.com/share/1Ef4oCpSDi/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on Facebook"
              className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-500/20 text-blue-300 group-hover:bg-blue-500 group-hover:text-white">
                <Facebook size={17} aria-hidden="true" />
              </span>
              <span>Facebook</span>
            </a>
            <a
              href="https://www.instagram.com/swabhimansanskritisamajothan?igsi=ZW05cDJqeHdka2Mz"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow us on Instagram"
              className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-pink-500/20 text-pink-300 group-hover:bg-pink-500 group-hover:text-white">
                <Instagram size={17} aria-hidden="true" />
              </span>
              <span>Instagram</span>
            </a>
            <a
              href="https://wa.me/919717420311"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat with us on WhatsApp"
              className="group flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-green-500/20 text-green-300 group-hover:bg-green-500 group-hover:text-white">
                <MessageCircle size={17} aria-hidden="true" />
              </span>
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* CONTACT */}
        <div>
          <h3 className="font-semibold mb-3">Contact</h3>
          <div className="space-y-2 text-sm text-gray-200">
            <p className="flex items-center gap-2">
              <Phone size={16} /> +91 9717420311
            </p>
            <p className="flex items-start gap-2 break-all">
              <Mail size={16} /> Swabhimansanskritisamajothan@gmail.com
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={16} /> Delhi, India
            </p>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-t border-white/20 text-center text-xs py-4 text-gray-200"
      >
        © {new Date().getFullYear()} Swabhiman Shiksha Sanskriti Samajotthan Nyas • Built with{" "}
        <Heart size={12} className="inline text-red-400" /> for society
      </motion.div>
    </footer>
  );
};

export default Footer;
