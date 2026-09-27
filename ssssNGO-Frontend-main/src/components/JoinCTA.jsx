import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const JoinCTA = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#296374] py-20 px-6 text-center">
      <motion.h2
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-3xl sm:text-4xl font-bold text-[#EDEDCE] mb-6"
      >
        Want to be a part of the change?
      </motion.h2>

      <p className="text-[#EDEDCE] max-w-2xl mx-auto mb-8 text-lg">
        Join <b>Swabhiman Shiksha Sanskriti Samajotthan Nyas</b> by contributing
        ₹1100 and become an official member working for education, culture,
        and social upliftment.
      </p>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/join")}
        className="bg-[#EDEDCE] text-[#0C2C55] px-8 py-3 rounded-full font-semibold text-lg"
      >
        Join Now ₹1100
      </motion.button>
    </div>
  );
};

export default JoinCTA;
