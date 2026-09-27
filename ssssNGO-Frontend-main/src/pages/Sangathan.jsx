import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import API from "../services/api";

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

const fallbackMembers = [
  { _id: "ashok", section: "leadership", sortOrder: 10, name: "श्री अशोक कुमार पाल", role: "संस्थापक अध्यक्ष", phone: "9717420311", imageUrl: ashokImg },
  { _id: "vipin", section: "leadership", sortOrder: 20, name: "श्री विपिन कुमार", role: "उपाध्यक्ष", phone: "8532942212", imageUrl: vipinImg },
  { _id: "bhagmal", section: "leadership", sortOrder: 30, name: "मा० भागमल पाली", role: "संरक्षक", phone: "9212220176", imageUrl: bhagmalImg },
  { _id: "manoj", section: "leadership", sortOrder: 40, name: "श्री मनोज बघेल", role: "महा सचिव", phone: "9999913422", imageUrl: manojImg },
  { _id: "yogesh-agra", section: "leadership", sortOrder: 50, name: "श्री योगेश कुमार", role: "सचिव", phone: "9927164646", imageUrl: yogeshAgraImg },
  { _id: "janak", section: "workers", sortOrder: 10, name: "श्री जनक पाल", role: "संरक्षक सलाहकार", phone: "9717028628", imageUrl: janakImg },
  { _id: "satendra", section: "workers", sortOrder: 20, name: "श्री सतेंद्र डागर", role: "संयोजक जिला मेरठ", phone: "9760774719", imageUrl: satendraImg },
  { _id: "yogesh-mzn", section: "workers", sortOrder: 30, name: "श्री योगेश कुमार पाल", role: "संयोजक जिला मुजफ्फरनगर", phone: "9760239838", imageUrl: yogeshMznImg },
  { _id: "shiv", section: "workers", sortOrder: 40, name: "श्री शिव प्रसाद", role: "संयोजक जिला मिर्जापुर, यू.पी", phone: "8655639685", imageUrl: shivImg },
  { _id: "vivek", section: "workers", sortOrder: 50, name: "श्री विवेक कुमार", role: "संयोजक लखनऊ", phone: "9307440269", imageUrl: vivekImg },
  { _id: "rajesh", section: "workers", sortOrder: 60, name: "श्री राजेश पाल", role: "सदस्य", phone: "8707813459", imageUrl: rajeshImg },
  { _id: "kishan", section: "workers", sortOrder: 70, name: "श्री किशन कुमार", role: "सदस्य", phone: "9616795555", imageUrl: kishanImg },
  { _id: "manjeet", section: "workers", sortOrder: 80, name: "श्री मंजीत सिंह वर्मा", role: "संयोजक उत्तराखंड", phone: "8279548484", imageUrl: manjeetImg },
  { _id: "sandeep", section: "workers", sortOrder: 90, name: "श्री संदीप कुमार", role: "संयोजक जिला देहरादून", phone: "7895544350", imageUrl: sandeepImg },
  { _id: "ashok-raj", section: "workers", sortOrder: 100, name: "श्री अशोक बगवास", role: "संयोजक जिला प्रतापगढ़, राजस्थान", phone: "8696831631", imageUrl: ashokRajImg },
  { _id: "suresh-raj", section: "workers", sortOrder: 110, name: "श्री सुरेश चंद रियार", role: "संयोजक भरतपुर, राजस्थान", phone: "9694529215", imageUrl: sureshRajImg },
  { _id: "abhay", section: "workers", sortOrder: 120, name: "श्री अभय सिंह", role: "संयोजक बिहार प्रदेश", phone: "7739602108 / 7717782045", imageUrl: abhayImg },
  { _id: "dharmendra", section: "workers", sortOrder: 130, name: "धर्मेंद्र कुमार (डी.के)", role: "संयोजक चित्रकूट, बांदा (उ.प्र.)", phone: "7607303817", imageUrl: "" },
];

const apiOrigin = API.defaults.baseURL.replace(/\/api\/?$/, "");
const imageSource = (value) => value?.startsWith("/") ? `${apiOrigin}${value}` : value || "/members/default.jpg";
const phoneHref = (phone = "") => phone.split("/")[0].replace(/[^\d+]/g, "");

const MemberCard = ({ member, index, featured = false }) => (
  <motion.article
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: Math.min(index * 0.04, 0.35) }}
    whileHover={{ y: -4 }}
    className={featured
      ? "flex items-center gap-4 rounded-xl bg-gradient-to-r from-[#0C2C55] to-[#296374] p-5 text-white shadow-lg"
      : "flex items-center gap-4 rounded-xl border-l-4 border-[#296374] bg-white p-5 shadow-md transition hover:shadow-lg"}
  >
    <img src={imageSource(member.imageUrl)} alt={member.name} className={`${featured ? "h-16 w-16 border-white" : "h-14 w-14 border-[#296374]"} shrink-0 rounded-full border-2 bg-slate-100 object-cover`} />
    <div className="min-w-0">
      <h3 className={`${featured ? "text-lg text-white" : "text-[#0C2C55]"} font-semibold`}>{member.name}</h3>
      <p className={`${featured ? "text-white/85" : "text-[#296374]"} text-sm`}>{member.role}</p>
      {member.phone && <a href={`tel:${phoneHref(member.phone)}`} className={`${featured ? "text-white" : "text-emerald-700"} mt-1 inline-block text-sm font-medium hover:underline`}>📞 {member.phone}</a>}
    </div>
  </motion.article>
);

const Sangathan = () => {
  const [members, setMembers] = useState(fallbackMembers);

  useEffect(() => {
    let active = true;
    API.get("/sangathan")
      .then((response) => { if (active && Array.isArray(response.data)) setMembers(response.data); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const groups = useMemo(() => ({
    leadership: members.filter((member) => member.section === "leadership"),
    workers: members.filter((member) => member.section === "workers"),
  }), [members]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 text-center text-3xl font-bold text-[#0C2C55]">Sangathan Structure</motion.h1>

      {groups.leadership.length > 0 && <section aria-labelledby="leadership-heading" className="mb-10">
        <h2 id="leadership-heading" className="sr-only">Leadership</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{groups.leadership.map((member, index) => <MemberCard key={member._id} member={member} index={index} featured />)}</div>
      </section>}

      {groups.workers.length > 0 && <section aria-labelledby="workers-heading">
        <h2 id="workers-heading" className="mb-4 text-xl font-semibold text-[#0C2C55]">Key Sangathan Members</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{groups.workers.map((member, index) => <MemberCard key={member._id} member={member} index={index} />)}</div>
      </section>}

      {!members.length && <p className="py-16 text-center text-slate-500">Sangathan member information will be published soon.</p>}
      <p className="mt-6 text-center text-sm text-gray-500">This list is updated by the organisation as required.</p>
    </div>
  );
};

export default Sangathan;
