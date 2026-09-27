import { useState } from "react";
import axios from "axios";

export default function MembersDirectory() {
  const [city, setCity] = useState("");
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchMembers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `/api/membership/search?city=${city}`
      );
      setMembers(res.data);
    } catch (err) {
      alert("Failed to fetch members");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">
        Find Members in Your Area
      </h1>

      {/* SEARCH BAR */}
      <div className="flex gap-3 mb-6">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city (e.g. Ghaziabad)"
          className="px-4 py-2 rounded text-black w-64"
        />
        <button
          onClick={searchMembers}
          className="bg-[#296374] px-5 py-2 rounded"
        >
          Search
        </button>
      </div>

      {/* RESULTS */}
      {loading && <p>Loading...</p>}

      <div className="grid md:grid-cols-3 gap-4">
        {members.map((m) => (
          <div
            key={m._id}
            className="bg-[#0C2C55] p-4 rounded-lg shadow"
          >
            {/* PHOTO */}
            {m.photoFile && (
              <img
                src={`/uploads/${m.photoFile}`}
                alt="member"
                className="w-16 h-16 rounded-full mb-3"
              />
            )}

            <h2 className="text-lg font-semibold">{m.name}</h2>
            <p className="text-sm text-gray-300">
              {m.city}, {m.state}
            </p>

            <p className="text-sm mt-2">{m.phone}</p>

            {/* WHATSAPP BUTTON */}
            <a
              href={`https://wa.me/91${m.phone}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-3 text-xs bg-green-500 px-3 py-1 rounded"
            >
              Chat on WhatsApp
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}