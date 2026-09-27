import { useState } from "react";
import { motion } from "framer-motion";
import API from "../services/api";
import Loader from "../components/Loader";

const JoinNgo = () => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [aadhaar, setAadhaar] = useState(null);
  const [pan, setPan] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!aadhaar || !pan) {
      alert("Please upload Aadhaar & PAN");
      return;
    }

    const data = new FormData();
    data.append("name", form.name);
    data.append("email", form.email);
    data.append("phone", form.phone);
    data.append("aadhaar", aadhaar);
    data.append("pan", pan);

    try {
      setLoading(true);

      await API.post("/membership/request", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Request submitted successfully ✅");
      setForm({ name: "", email: "", phone: "" });
      setAadhaar(null);
      setPan(null);
    } catch (err) {
      console.error(err);
      alert("Submission failed ❌");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-6">
      {/* Loader Overlay */}
      {loading && <Loader />}

      <motion.h1
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-[#0C2C55] mb-6 text-center"
      >
        Join NGO Membership
      </motion.h1>

      <motion.form
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit}
        className="bg-white shadow-lg p-6 rounded-xl space-y-4"
      >
        {/* Name */}
        <input
          name="name"
          value={form.name}
          placeholder="Full Name"
          onChange={handleChange}
          required
          className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#296374]"
        />

        {/* Email */}
        <input
          name="email"
          type="email"
          value={form.email}
          placeholder="Email"
          onChange={handleChange}
          required
          className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#296374]"
        />

        {/* Phone */}
        <input
          name="phone"
          value={form.phone}
          placeholder="Phone"
          onChange={handleChange}
          required
          className="w-full border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#296374]"
        />

        {/* Aadhaar Upload */}
        <div>
          <label className="text-sm text-gray-600">Upload Aadhaar</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setAadhaar(e.target.files[0])}
            required
            className="w-full mt-1"
          />
        </div>

        {/* PAN Upload */}
        <div>
          <label className="text-sm text-gray-600">Upload PAN</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setPan(e.target.files[0])}
            required
            className="w-full mt-1"
          />
        </div>

        {/* Submit Button */}
        <button
          disabled={loading}
          className="w-full bg-[#296374] hover:bg-[#1f4e5d] transition text-white py-3 rounded-lg font-semibold"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </motion.form>
    </div>
  );
};

export default JoinNgo;
