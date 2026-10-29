import { useState, useEffect } from "react";
import OrganisationLogo from "./OrganisationLogo";
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
       <div
  key={index}
  className="text-center px-6 flex flex-col items-center"
>
  {/* Logo */}
  <OrganisationLogo className="mb-6 h-auto w-28 sm:w-36 md:w-44 lg:w-52 xl:w-56" />

  <h1 className="text-3xl sm:text-5xl font-bold text-[#EDEDCE] mb-4">
    {slides[index].title}
  </h1>

  <p className="text-lg sm:text-2xl text-[#629FAD]">
    {slides[index].subtitle}
  </p>
</div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 animate-bounce text-[#EDEDCE] text-sm">
        Scroll ↓
      </div>
    </div>
  );
};

export default HeroSlider;
