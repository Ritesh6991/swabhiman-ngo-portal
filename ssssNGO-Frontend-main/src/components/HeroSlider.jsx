import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/logo.png"; // Adjust the path if needed
const slides = [
  {
    title: "Education is the most powerful weapon",
    subtitle: "We use it to change lives",
  },
  {
    title: "Culture builds identity",
    subtitle: "We protect our roots & values",
  },
  {
    title: "Together we uplift society",
    subtitle: "Be the change with us",
  },
];

const HeroSlider = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-screen bg-[#0C2C55] flex items-center justify-center relative overflow-hidden">
      <AnimatePresence mode="wait">
       <motion.div
  key={index}
  initial={{ opacity: 0, y: 40 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -40 }}
  transition={{ duration: 0.8 }}
  className="text-center px-6 flex flex-col items-center"
>
  {/* Logo */}
  <img
    src={logo}
    alt="Logo"
    className="w-28 sm:w-36 md:w-44 lg:w-52 xl:w-56 h-auto object-contain mb-6"
  />

  <h1 className="text-3xl sm:text-5xl font-bold text-[#EDEDCE] mb-4">
    {slides[index].title}
  </h1>

  <p className="text-lg sm:text-2xl text-[#629FAD]">
    {slides[index].subtitle}
  </p>
</motion.div>
      </AnimatePresence>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="absolute bottom-8 text-[#EDEDCE] text-sm"
      >
        Scroll ↓
      </motion.div>
    </div>
  );
};

export default HeroSlider;
