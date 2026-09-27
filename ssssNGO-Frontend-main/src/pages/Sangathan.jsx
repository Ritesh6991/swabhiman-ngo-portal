import { motion } from "framer-motion";

// Founder images
import ashokImg from "../founders/ashok.jpg";
import vipinImg from "../founders/vipin.jpg";

import bhagmalImg from "../members/bhagmal.jpg";
import janakImg from "../members/janak.jpg";
import manojImg from "../members/manoj.jpg";

import yogeshAgraImg from "../members/yogesh-agra.jpg";
import satendraImg from "../members/satendra.jpg";
import yogeshMznImg from "../members/yogesh-muzaffarnagar.jpg";
import shivImg from "../members/shivprasad.jpg";
import vivekImg from "../members/vivek.jpg";
import rajeshImg from "../members/rajesh.jpg";
import kishanImg from "../members/kishan.jpg";
import manjeetImg from "../members/manjeet.jpg";
import sandeepImg from "../members/sandeep.jpg";
import ashokRajImg from "../members/ashok-rajasthan.jpg";
import sureshRajImg from "../members/suresh-rajasthan.jpg";

import abhayImg from "../members/abhaysingh.jpg";

// Founders
const founders = [
  {
    name: "श्री अशोक कुमार पाल",
    role: "संस्थापक अध्यक्ष",
    phone: "9717420311",
    image: ashokImg,
  },
  {
    name: "श्री विपिन कुमार",
    role: "उपाध्यक्ष",
    phone: "8532942212",
    image: vipinImg,
  },
  {
    name: "मा० भागमल पाली",
    role: "संरक्षक",
    phone: "9212220176",
    image: bhagmalImg,
  },
  {
    name: "श्री मनोज बघेल",
    role: "महा सचिव",
    phone: "9999913422",
    image: manojImg,
  },
  {
    name: "श्री योगेश कुमार",
    role: "सचिव",
    phone: "9927164646",
    image: yogeshAgraImg,
  },
];

// Members
const members = [
  {
    name: "श्री जनक पाल",
    role: "संरक्षक सलाहकार",
    phone: "9717028628",
    image: janakImg,
  },
  {
    name: "श्री सतेंद्र डागर",
    role: "संयोजक जिला मेरठ",
    phone: "9760774719",
    image: satendraImg,
  },
  {
    name: "श्री योगेश कुमार पाल",
    role: "संयोजक जिला मुजफ्फरनगर",
    phone: "9760239838",
    image: yogeshMznImg,
  },
  {
    name: "श्री शिव प्रसाद",
    role: "संयोजक जिला मिर्जापुर, यू.पी",
    phone: "8655639685",
    image: shivImg,
  },
  {
    name: "श्री विवेक कुमार",
    role: "संयोजक लखनऊ",
    phone: "9307440269",
    image: vivekImg,
  },
  {
    name: "श्री राजेश पाल",
    role: "सदस्य",
    phone: "8707813459",
    image: rajeshImg,
  },
  {
    name: "श्री किशन कुमार",
    role: "सदस्य",
    phone: "9616795555",
    image: kishanImg,
  },
  {
    name: "श्री मंजीत सिंह वर्मा",
    role: "संयोजक उत्तराखंड",
    phone: "8279548484",
    image: manjeetImg,
  },
  {
    name: "श्री संदीप कुमार",
    role: "संयोजक जिला देहरादून",
    phone: "7895544350",
    image: sandeepImg,
  },
  {
    name: "श्री अशोक बगवास",
    role: "संयोजक जिला प्रतापगढ़, राजस्थान",
    phone: "8696831631",
    image: ashokRajImg,
  },
  {
    name: "श्री सुरेश चंद रियार",
    role: "संयोजक भरतपुर, राजस्थान",
    phone: "9694529215",
    image: sureshRajImg,
  },
  {
    name: "श्री अभय सिंह",
    role: "संयोजक बिहार प्रदेश",
    phone: "7739602108 / 7717782045",
    image: abhayImg,
  },
 {
  name: "धर्मेंद्र कुमार (डी.के)",
  role: "संयोजक चित्रकूट, बांदा (उ.प्र.)",
  phone: "7607303817",
},
];

// Member Card
const Card = ({ name, role, phone, image, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04 }}
    whileHover={{ y: -4 }}
    className="bg-white rounded-xl shadow-md p-5 border-l-4 border-[#296374] hover:shadow-lg transition flex items-center gap-4"
  >
    <img
      src={image || "/members/default.jpg"}
      alt={name}
      className="w-14 h-14 rounded-full object-cover border-2 border-[#296374]"
    />

    <div>
      <h3 className="font-semibold text-[#0C2C55]">{name}</h3>
      <p className="text-sm text-[#296374] mb-1">{role}</p>

      <a
        href={`tel:${phone.split("/")[0].trim()}`}
        className="text-sm text-green-600 font-medium hover:underline"
      >
        📞 {phone}
      </a>
    </div>
  </motion.div>
);

// Founder Card
const FounderCard = ({ name, role, phone, image }) => (
  <div className="bg-gradient-to-r from-[#0C2C55] to-[#296374] text-white p-5 rounded-xl shadow-lg flex items-center gap-4">
    <img
      src={image}
      alt={name}
      className="w-16 h-16 rounded-full object-cover border-2 border-white"
    />

    <div>
      <h3 className="font-semibold text-lg">{name}</h3>
      <p className="text-sm opacity-90">{role}</p>

      <a
        href={`tel:${phone}`}
        className="text-sm mt-1 inline-block underline"
      >
        📞 {phone}
      </a>
    </div>
  </div>
);

// Main Component
const Sangathan = () => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-3xl font-bold text-center text-[#0C2C55] mb-8"
      >
        Sangathan Structure
      </motion.h1>

      {/* Founders */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {founders.map((f, i) => (
          <FounderCard key={i} {...f} />
        ))}
      </div>

      <h2 className="text-xl font-semibold text-[#0C2C55] mb-4">
        न्यास के प्रमुख कार्यकर्ता
      </h2>

      {/* Members */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((m, i) => (
          <Card key={i} {...m} index={i} />
        ))}
      </div>

      <p className="text-center text-sm text-gray-500 mt-6">
        * यह सूची समय-समय पर अपडेट की जाती रहेगी
      </p>
    </div>
  );
};

export default Sangathan;
