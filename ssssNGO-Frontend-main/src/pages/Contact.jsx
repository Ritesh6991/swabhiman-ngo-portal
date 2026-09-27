import { motion } from "framer-motion";

const Contact = () => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold text-[#0C2C55] mb-10 text-center"
      >
        Contact Us
      </motion.h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* CONTACT INFO */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <div>
            <h3 className="text-xl font-semibold text-[#0C2C55]">
              
            </h3>
            <p className="text-[#296374]">
              Swabhiman Shiksha Sanskriti Samajotthan Nyas <br />
              
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-[#0C2C55]">
              Phone
            </h3>
            <p className="text-[#296374]">
              +91 9717420311
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-[#0C2C55]">
              Email
            </h3>
            <p className="text-[#296374]">
              Swabhimansanskritisamajothan@gmail.com
            </p>
          </div>
        </motion.div>

        {/* CONTACT FORM */}
        <motion.form
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white shadow rounded-lg p-6 space-y-4"
        >
          <input
            type="text"
            placeholder="Your Name"
            className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#629FAD]"
          />

          <input
            type="email"
            placeholder="Your Email"
            className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#629FAD]"
          />

          <textarea
            placeholder="Your Message"
            rows={5}
            className="w-full border p-3 rounded focus:outline-none focus:ring-2 focus:ring-[#629FAD]"
          />

          <button
            type="button"
            className="w-full bg-[#296374] text-[#EDEDCE] py-3 rounded hover:bg-[#629FAD] transition"
          >
            Send Message
          </button>
        </motion.form>
      </div>
    </div>
  );
};

export default Contact;
