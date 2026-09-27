import { motion } from "framer-motion";

const Loader = () => {
  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="bg-white px-8 py-6 rounded-xl shadow-xl flex flex-col items-center">
        <div className="w-10 h-10 border-4 border-[#296374] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-3 text-gray-600 font-medium">
          Processing your request...
        </p>
      </div>
    </motion.div>
  );
};

export default Loader;