import { useNavigate } from "react-router-dom";

const JoinCTA = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-[#296374] py-20 px-6 text-center">
      <h2 className="text-3xl sm:text-4xl font-bold text-[#EDEDCE] mb-6">
        Want to be a part of the change?
      </h2>

      <p className="text-[#EDEDCE] max-w-2xl mx-auto mb-8 text-lg">
        Join <b>Swabhiman Shiksha Sanskriti Samajotthan Nyas</b> by contributing
        ₹1100 and become an official member working for education, culture,
        and social upliftment.
      </p>

      <button
        onClick={() => navigate("/join")}
        className="bg-[#EDEDCE] text-[#0C2C55] px-8 py-3 rounded-full font-semibold text-lg transition-transform hover:scale-105 active:scale-95"
      >
        Join Now ₹1100
      </button>
    </div>
  );
};

export default JoinCTA;
